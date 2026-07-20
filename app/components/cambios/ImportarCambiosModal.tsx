'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';

interface FilaImport {
  fecha: string;
  tipo: string;
  solicitante: string;
  destinatario: string;
  horario?: string;
  _valida: boolean;
  _errores: string[];
}

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORARIO_REGEX = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

function validarFila(fila: any): FilaImport {
  const errores: string[] = [];
  const tipo = fila.tipo?.toString().toUpperCase().trim() || '';
  const horario = fila.horario?.toString().trim() || '';

  if (!fila.fecha) {
    errores.push('fecha requerida');
  } else if (!FECHA_REGEX.test(fila.fecha.toString().trim())) {
    errores.push('fecha debe ser YYYY-MM-DD');
  }

  if (!tipo) {
    errores.push('tipo requerido');
  } else if (tipo !== 'INTERCAMBIO' && tipo !== 'COBERTURA') {
    errores.push('tipo debe ser INTERCAMBIO o COBERTURA');
  }

  if (!fila.solicitante?.toString().trim()) errores.push('solicitante requerido');
  if (!fila.destinatario?.toString().trim()) errores.push('destinatario requerido');

  if (horario && !HORARIO_REGEX.test(horario)) {
    errores.push('horario debe ser HH:MM-HH:MM');
  }

  return {
    fecha: fila.fecha?.toString().trim() || '',
    tipo,
    solicitante: fila.solicitante?.toString().trim() || '',
    destinatario: fila.destinatario?.toString().trim() || '',
    horario: horario || undefined,
    _valida: errores.length === 0,
    _errores: errores,
  };
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportarCambiosModal({ onClose, onSuccess }: Props) {
  const [filas, setFilas] = useState<FilaImport[]>([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ creados: number; errores: { fila: string; error: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { raw: false });
      setFilas(raw.map((r) => validarFila(r)));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const filasValidas = filas.filter((f) => f._valida);
  const filasInvalidas = filas.filter((f) => !f._valida);

  const handleImportar = async () => {
    if (filasValidas.length === 0) return;
    setCargando(true);
    try {
      const res = await fetch('/api/cambios/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cambios: filasValidas }),
      });
      const data = await res.json();
      setResultado(data);
      if (data.creados > 0) onSuccess();
    } finally {
      setCargando(false);
    }
  };

  const descargarTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['fecha', 'tipo', 'solicitante', 'destinatario', 'horario'],
      ['2026-07-12', 'INTERCAMBIO', 'RODRIGUEZ IARA', 'MAINERO MARIA', ''],
      ['2026-07-12', 'COBERTURA', 'CEJAS GUILLERMO', 'GONZALEZ MARIELA', '14:00-00:00'],
    ]);
    // Ancho de columnas
    ws['!cols'] = [{ wch: 12 }, { wch: 13 }, { wch: 25 }, { wch: 25 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cambios');
    XLSX.writeFile(wb, 'template_cambios.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Importar Cambios de Turno desde Excel</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {resultado ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-700 dark:text-green-400 font-medium">
                  {resultado.creados} cambio{resultado.creados !== 1 ? 's' : ''} importado{resultado.creados !== 1 ? 's' : ''} correctamente
                </p>
              </div>
              {resultado.errores.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-1">
                  <p className="text-red-700 dark:text-red-400 font-medium">{resultado.errores.length} con errores:</p>
                  {resultado.errores.map((e, i) => (
                    <p key={i} className="text-sm text-red-600 dark:text-red-300">{e.fila}: {e.error}</p>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <p>Los nombres deben escribirse como <strong>APELLIDO NOMBRE</strong> (igual que en la planilla).</p>
                  <p>La columna <strong>horario</strong> es opcional — si se omite se usa el horario base de cada empleado.</p>
                </div>
              </div>

              <button
                onClick={descargarTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Descargar template de ejemplo
              </button>

              {filas.length === 0 && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">Arrastrá el archivo Excel o hacé click para seleccionarlo</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx, .xls</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              )}

              {filas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-green-600 dark:text-green-400 font-medium">{filasValidas.length} válidas</span>
                      {filasInvalidas.length > 0 && (
                        <span className="text-red-600 dark:text-red-400 font-medium ml-2">{filasInvalidas.length} con errores</span>
                      )}
                    </p>
                    <button onClick={() => setFilas([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                      Cambiar archivo
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {['fecha', 'tipo', 'solicitante', 'destinatario', 'horario', 'validación'].map((col) => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filas.map((f, i) => (
                          <tr key={i} className={f._valida ? '' : 'bg-red-50 dark:bg-red-900/10'}>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">{f.fecha}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                f.tipo === 'INTERCAMBIO'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : f.tipo === 'COBERTURA'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>{f.tipo || '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.solicitante}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.destinatario}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{f.horario || '(base)'}</td>
                            <td className="px-3 py-2">
                              {f._valida ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <span className="text-xs text-red-600 dark:text-red-400">{f._errores.join(', ')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filasInvalidas.length > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Las filas con errores no se importarán. Corregí el Excel y volvé a cargarlo.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImportar}
                      disabled={filasValidas.length === 0 || cargando}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    >
                      {cargando ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
                      ) : (
                        `Importar ${filasValidas.length} cambio${filasValidas.length !== 1 ? 's' : ''}`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
