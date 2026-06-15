"use client";

import { useState } from "react";
import { FileSearch, Eye, Pencil, Trash2, Download, Search } from "lucide-react";
import { Licencia } from "@/app/api/types";
import { useFormatters } from "@/hooks/useFormatters";
import { toast } from "react-toastify";
import { CustomDatePicker } from "@/app/components/CustomDatePicker";
import { generarExcel, generarPDF } from "@/app/lib/exportUtils";

function formatTipoLicencia(tipo: string) {
  switch (tipo) {
    case 'ORDINARIA':   return 'Ordinaria';
    case 'MEDICA':      return 'Médica';
    case 'ESPECIAL':    return 'Especial';
    case 'ESTUDIO':     return 'Estudio';
    case 'SIN_GOCE':    return 'Sin goce';
    case 'ENFERMEDAD':  return 'Enfermedad';
    default:            return tipo;
  }
}

function formatEstado(estado: string) {
  switch (estado) {
    case 'PENDIENTE':   return 'Pendiente';
    case 'APROBADA':    return 'Aprobada';
    case 'ACTIVA':      return 'Activa';
    case 'FINALIZADA':  return 'Finalizada';
    case 'CANCELADA':   return 'Cancelada';
    case 'RECHAZADA':   return 'Rechazada';
    default:            return estado;
  }
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    APROBADA:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    ACTIVA:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    FINALIZADA: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    CANCELADA:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    RECHAZADA:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {formatEstado(estado)}
    </span>
  );
}

interface Props {
  licencias: Licencia[];
  onRefetch: () => void;
}

export function LicenciasTable({ licencias, onRefetch }: Props) {
  const { formatDate2 } = useFormatters();
  const hoy = new Date().toISOString().split('T')[0];

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [viendo, setViendo] = useState<Licencia | null>(null);
  const [editando, setEditando] = useState<Licencia | null>(null);
  const [editFechaDesde, setEditFechaDesde] = useState('');
  const [editFechaHasta, setEditFechaHasta] = useState('');
  const [editObs, setEditObs] = useState('');
  const [eliminando, setEliminando] = useState<Licencia | null>(null);
  const [saving, setSaving] = useState(false);

  const puedeModificar = (l: Licencia) =>
    l.estado === 'PENDIENTE' || (l.tipo !== 'ORDINARIA' && l.fecha_desde > hoy);

  const puedeEliminar = (l: Licencia) =>
    l.estado === 'PENDIENTE' || (l.tipo !== 'ORDINARIA' && l.fecha_desde > hoy);

  const filtradas = licencias.filter(l => {
    if (filtroTipo !== 'TODOS' && l.tipo !== filtroTipo) return false;
    if (filtroEstado !== 'TODOS' && l.estado !== filtroEstado) return false;
    if (filtroDesde && l.fecha_desde < filtroDesde) return false;
    if (filtroHasta && l.fecha_hasta > filtroHasta) return false;
    if (busqueda && !formatTipoLicencia(l.tipo).toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const abrirEditar = (l: Licencia) => {
    setEditando(l);
    setEditFechaDesde(l.fecha_desde);
    setEditFechaHasta(l.fecha_hasta);
    setEditObs(l.observaciones ?? '');
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/licencias/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fecha_desde: editFechaDesde, fecha_hasta: editFechaHasta, observaciones: editObs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Licencia actualizada correctamente.');
      setEditando(null);
      onRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar la licencia.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/licencias/${eliminando.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Licencia eliminada correctamente.');
      setEliminando(null);
      onRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la licencia.');
    } finally {
      setSaving(false);
    }
  };

  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const exportarExcel = () => {
    generarExcel(
      { subtitle: 'Mis Licencias', filename: `Licencias_${fechaArchivo}.xlsx`, sheetName: 'Licencias' },
      [
        { header: 'TIPO', width: 18 },
        { header: 'DESDE', width: 14 },
        { header: 'HASTA', width: 14 },
        { header: 'DÍAS', width: 8 },
        { header: 'ESTADO', width: 14 },
        { header: 'OBSERVACIONES', width: 35 },
      ],
      filtradas.map(l => [
        formatTipoLicencia(l.tipo),
        formatDate2(l.fecha_desde),
        formatDate2(l.fecha_hasta),
        l.dias ?? '—',
        formatEstado(l.estado),
        l.observaciones ?? '—',
      ])
    );
  };

  const exportarPDF = async () => {
    await generarPDF(
      { subtitle: 'Mis Licencias', filename: `Licencias_${fechaArchivo}.pdf` },
      [
        { label: 'Tipo', x: 15, w: 35 },
        { label: 'Desde', x: 52, w: 28 },
        { label: 'Hasta', x: 82, w: 28 },
        { label: 'Días', x: 112, w: 15 },
        { label: 'Estado', x: 129, w: 28 },
        { label: 'Observaciones', x: 159, w: 36, wrap: true },
      ],
      filtradas.map(l => (_doc: any) => ({
        cells: [
          formatTipoLicencia(l.tipo),
          formatDate2(l.fecha_desde),
          formatDate2(l.fecha_hasta),
          String(l.dias ?? '—'),
          formatEstado(l.estado),
          l.observaciones ?? '—',
        ],
      }))
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Licencias solicitadas</h2>
          <div className="flex gap-2">
            <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
              <Download size={13} /> PDF
            </button>
            <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100" />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
            <option value="TODOS">Todos los tipos</option>
            <option value="ORDINARIA">Ordinaria</option>
            <option value="MEDICA">Médica</option>
            <option value="ESPECIAL">Especial</option>
            <option value="ESTUDIO">Estudio</option>
            <option value="SIN_GOCE">Sin goce</option>
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADA">Aprobada</option>
            <option value="ACTIVA">Activa</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Desde</label>
            <CustomDatePicker value={filtroDesde} onChange={setFiltroDesde} minDate={new Date('2020-01-01')} showGrupo={false}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Hasta</label>
            <CustomDatePicker value={filtroHasta} onChange={setFiltroHasta} minDate={new Date('2020-01-01')} showGrupo={false}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-36" />
          </div>
          {(filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS' || filtroDesde || filtroHasta || busqueda) && (
            <button onClick={() => { setFiltroTipo('TODOS'); setFiltroEstado('TODOS'); setFiltroDesde(''); setFiltroHasta(''); setBusqueda(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors self-end pb-2">
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        {filtradas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileSearch className="w-16 h-16 mx-auto mb-4 opacity-50" />
            No hay licencias registradas
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Tipo', 'Desde', 'Hasta', 'Días', 'Estado', 'Observaciones', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs uppercase text-gray-600 dark:text-gray-300 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtradas.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 dark:text-gray-300">{formatTipoLicencia(l.tipo)}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{formatDate2(l.fecha_desde)}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{formatDate2(l.fecha_hasta)}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{l.dias ?? '—'}</td>
                  <td className="px-4 py-3"><EstadoBadge estado={l.estado} /></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm max-w-[160px] truncate">{l.observaciones ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViendo(l)} title="Ver detalle"
                        className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        <Eye size={16} />
                      </button>
                      {puedeModificar(l) && (
                        <button onClick={() => abrirEditar(l)} title="Editar"
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                          <Pencil size={16} />
                        </button>
                      )}
                      {puedeEliminar(l) && (
                        <button onClick={() => setEliminando(l)} title="Eliminar"
                          className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Ver */}
      {viendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => e.target === e.currentTarget && setViendo(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Detalle de licencia</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tipo</span><span className="font-medium dark:text-gray-200">{formatTipoLicencia(viendo.tipo)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Desde</span><span className="dark:text-gray-200">{formatDate2(viendo.fecha_desde)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Hasta</span><span className="dark:text-gray-200">{formatDate2(viendo.fecha_hasta)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Días</span><span className="dark:text-gray-200">{viendo.dias ?? '—'}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Estado</span><EstadoBadge estado={viendo.estado} /></div>
              {viendo.observaciones && <div><span className="text-gray-500">Observaciones</span><p className="mt-1 text-gray-700 dark:text-gray-300">{viendo.observaciones}</p></div>}
            </div>
            <button onClick={() => setViendo(null)} className="mt-5 w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => e.target === e.currentTarget && setEditando(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Editar licencia</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Desde</label>
                  <CustomDatePicker value={editFechaDesde} onChange={setEditFechaDesde}
                    minDate={new Date(hoy + 'T00:00:00')} showGrupo={false}
                    className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Hasta</label>
                  <CustomDatePicker value={editFechaHasta} onChange={setEditFechaHasta}
                    minDate={new Date(editFechaDesde + 'T00:00:00')} showGrupo={false}
                    className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Observaciones</label>
                <textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditando(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={saving} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {eliminando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => e.target === e.currentTarget && setEliminando(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">¿Eliminar licencia?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Se eliminará la licencia {formatTipoLicencia(eliminando.tipo)} del {formatDate2(eliminando.fecha_desde)} al {formatDate2(eliminando.fecha_hasta)}.
              {eliminando.tipo === 'ORDINARIA' && ' La autorización pendiente también será cancelada.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setEliminando(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancelar
              </button>
              <button onClick={confirmarEliminar} disabled={saving} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition">
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
