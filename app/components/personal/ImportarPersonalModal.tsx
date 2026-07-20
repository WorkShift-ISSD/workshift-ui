'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';

interface FilaImport {
  legajo: number;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  rol: string;
  horario: string;
  grupo_turno: string;
  telefono?: string;
  direccion?: string;
  _valida: boolean;
  _errores: string[];
}

const ROLES_VALIDOS = ['INSPECTOR', 'SUPERVISOR', 'JEFE', 'ADMINISTRADOR'];
const GRUPOS_VALIDOS = ['A', 'B'];

function validarFila(fila: any): FilaImport {
  const errores: string[] = [];

  if (!fila.legajo) errores.push('legajo requerido');
  if (!fila.nombre) errores.push('nombre requerido');
  if (!fila.apellido) errores.push('apellido requerido');
  if (!fila.email) errores.push('email requerido');
  if (!fila.username) {
    errores.push('username requerido');
  } else {
    const u = fila.username.toString().trim();
    if (!/^[a-zA-Z]+$/.test(u)) errores.push('username solo letras');
    else if (u.length < 7) errores.push('username mínimo 7 caracteres');
    else if (u.length > 20) errores.push('username máximo 20 caracteres');
  }
  if (!fila.rol) {
    errores.push('rol requerido');
  } else if (!ROLES_VALIDOS.includes(fila.rol.toString().toUpperCase())) {
    errores.push(`rol inválido (${ROLES_VALIDOS.join(', ')})`);
  }
  const grupo = fila.grupo_turno?.toString().toUpperCase();
  if (grupo && !GRUPOS_VALIDOS.includes(grupo)) {
    errores.push('grupo_turno debe ser A o B');
  }

  return {
    legajo: Number(fila.legajo),
    nombre: fila.nombre?.toString().trim() || '',
    apellido: fila.apellido?.toString().trim() || '',
    email: fila.email?.toString().trim() || '',
    username: fila.username?.toString().trim().toLowerCase() || '',
    rol: fila.rol?.toString().toUpperCase() || '',
    horario: fila.horario?.toString() || '04:00-14:00',
    grupo_turno: grupo || 'A',
    telefono: fila.telefono?.toString().trim() || undefined,
    direccion: fila.direccion?.toString().trim() || undefined,
    _valida: errores.length === 0,
    _errores: errores,
  };
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportarPersonalModal({ onClose, onSuccess }: Props) {
  const [filas, setFilas] = useState<FilaImport[]>([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ creados: number; errores: { fila: number; error: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet);
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
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usuarios: filasValidas }),
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
      ['legajo', 'nombre', 'apellido', 'email', 'username', 'rol', 'horario', 'grupo_turno', 'telefono', 'direccion'],
      [12345, 'Juan', 'Pérez', 'jperez@mail.com', 'juaperez', 'INSPECTOR', '04:00-14:00', 'A', '', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personal');
    XLSX.writeFile(wb, 'template_personal.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Importar Personal desde Excel</h2>
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
                  {resultado.creados} empleado{resultado.creados !== 1 ? 's' : ''} importado{resultado.creados !== 1 ? 's' : ''} correctamente
                </p>
              </div>
              {resultado.errores.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-1">
                  <p className="text-red-700 dark:text-red-400 font-medium">{resultado.errores.length} con errores:</p>
                  {resultado.errores.map((e, i) => (
                    <p key={i} className="text-sm text-red-600 dark:text-red-300">Legajo {e.fila}: {e.error}</p>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Cerrar
              </button>
            </div>
          ) : (
            <>
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
                          {['legajo', 'nombre', 'apellido', 'email', 'username', 'rol', 'horario', 'grupo', 'estado'].map((col) => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filas.map((f, i) => (
                          <tr key={i} className={f._valida ? '' : 'bg-red-50 dark:bg-red-900/10'}>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.legajo}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.nombre}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.apellido}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.email}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.username}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.rol}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.horario}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.grupo_turno}</td>
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
                        `Importar ${filasValidas.length} empleado${filasValidas.length !== 1 ? 's' : ''}`
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
