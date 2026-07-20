"use client";

import { useState, useEffect } from "react";
import { FileSearch, Eye, Pencil, Trash2, Download, Search } from "lucide-react";
import { Licencia } from "@/app/api/types";
import { useFormatters } from "@/hooks/useFormatters";
import { toast } from "react-toastify";
import { CustomDatePicker } from "@/app/components/CustomDatePicker";
import { generarExcel, generarPDF } from "@/app/lib/exportUtils";
import { Paginacion } from "@/app/components/cambios/Paginacion";

function formatTipoLicencia(tipo: string) {
  switch (tipo) {
    case 'ORDINARIA':     return 'Ordinaria';
    case 'COMPENSATORIO': return 'Compensatorio';
    case 'GREMIAL':       return 'Gremial';
    case 'MEDICA':        return 'Médica';
    case 'ESTUDIO':       return 'Estudio';
    case 'PATERNIDAD':    return 'Paternidad';
    case 'COMISION':      return 'Comisión';
    case 'CURSO':         return 'Curso';
    case 'SIN_GOCE':      return 'Sin goce';
    case 'ENFERMEDAD':    return 'Enfermedad';
    default:              return tipo;
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
  // Estado controlado desde la página (chips), igual que en Autorizaciones.
  // undefined = todos los estados.
  filtroEstado?: string;
}

export function LicenciasTable({ licencias, onRefetch, filtroEstado }: Props) {
  const { formatDate2 } = useFormatters();
  const hoy = new Date().toISOString().split('T')[0];

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [rangoFecha, setRangoFecha] = useState<'' | 'hoy' | 'semana' | 'mes' | 'personalizado'>('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // El filtro de fecha no aplica a Pendientes: ahí lo que importa es resolver, no buscar en el tiempo.
  const mostrarFiltroFecha = filtroEstado !== 'PENDIENTE';

  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const aplicarRango = (preset: typeof rangoFecha) => {
    setRangoFecha(preset);
    const hoyDate = new Date();
    if (preset === 'hoy') {
      setFiltroDesde(toISODate(hoyDate));
      setFiltroHasta(toISODate(hoyDate));
    } else if (preset === 'semana') {
      const diaSemana = hoyDate.getDay();
      const offsetLunes = diaSemana === 0 ? 6 : diaSemana - 1;
      const lunes = new Date(hoyDate);
      lunes.setDate(hoyDate.getDate() - offsetLunes);
      setFiltroDesde(toISODate(lunes));
      setFiltroHasta(toISODate(hoyDate));
    } else if (preset === 'mes') {
      const primerDia = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1);
      setFiltroDesde(toISODate(primerDia));
      setFiltroHasta(toISODate(hoyDate));
    } else if (preset === '') {
      setFiltroDesde('');
      setFiltroHasta('');
    }
    // 'personalizado' deja las fechas como estén para que el usuario las edite
  };

  // Modales
  const [viendo, setViendo] = useState<Licencia | null>(null);
  const [editando, setEditando] = useState<Licencia | null>(null);
  const [editFechaDesde, setEditFechaDesde] = useState('');
  const [editFechaHasta, setEditFechaHasta] = useState('');
  const [editObs, setEditObs] = useState('');
  const [eliminando, setEliminando] = useState<Licencia | null>(null);
  const [saving, setSaving] = useState(false);

  const TIPOS_CON_AUTORIZACION = ['ORDINARIA', 'COMPENSATORIO'];

  const puedeModificar = (l: Licencia) =>
    l.estado === 'PENDIENTE' || (!TIPOS_CON_AUTORIZACION.includes(l.tipo) && l.fecha_desde > hoy);

  const puedeEliminar = (l: Licencia) =>
    l.estado === 'PENDIENTE' || (!TIPOS_CON_AUTORIZACION.includes(l.tipo) && l.fecha_desde > hoy);

  const filtradas = licencias.filter(l => {
    if (filtroTipo !== 'TODOS' && l.tipo !== filtroTipo) return false;
    if (filtroEstado && l.estado !== filtroEstado) return false;
    if (mostrarFiltroFecha && filtroDesde && l.fecha_hasta < filtroDesde) return false;
    if (mostrarFiltroFecha && filtroHasta && l.fecha_desde > filtroHasta) return false;
    if (busqueda && !formatTipoLicencia(l.tipo).toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  // Paginado
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginadas = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Si cambian los filtros (o el estado que llega por prop), volver a la página 1
  useEffect(() => {
    setPagina(1);
  }, [filtroTipo, filtroEstado, filtroDesde, filtroHasta, busqueda]);

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
        l.dias ?? '•',
        formatEstado(l.estado),
        l.observaciones ?? '•',
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
          String(l.dias ?? '•'),
          formatEstado(l.estado),
          l.observaciones ?? '•',
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
          <div className="flex flex-col sm:flex-rowgap-1">
            <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
              <Download size={13} /> PDF
            </button>
            <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3">
          {/* Búsqueda */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100" />
          </div>
          {/* Tipo */}
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full">
            <option value="TODOS">Todos los tipos</option>
            <option value="ORDINARIA">Ordinaria</option>
            <option value="COMPENSATORIO">Compensatorio</option>
            <option value="GREMIAL">Gremial</option>
            <option value="MEDICA">Médica</option>
            <option value="PATERNIDAD">Paternidad</option>
            <option value="ESTUDIO">Estudio</option>
            <option value="COMISION">Comisión</option>
            <option value="CURSO">Curso</option>
            <option value="SIN_GOCE">Sin goce</option>
          </select>
          {/* Periodo: oculto cuando se están viendo Pendientes */}
          {mostrarFiltroFecha && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 min-w-[160px]">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">Periodo</label>
                  <div className="relative group">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="w-4 h-4 flex items-center justify-center rounded border border-gray-400 dark:border-gray-500 text-gray-400 dark:text-gray-500 text-[10px] leading-none hover:border-gray-500 dark:hover:border-gray-400 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                    >
                      ?
                    </button>
                    <div className="pointer-events-none absolute left-0 bottom-full mb-2 w-56 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      Se muestran las licencias que se superponen con el rango elegido, aunque hayan comenzado antes o terminen después.
                    </div>
                  </div>
                </div>
                <select
                  value={rangoFecha}
                  onChange={e => aplicarRango(e.target.value as typeof rangoFecha)}
                  className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full"
                >
                  <option value="">Todo el periodo</option>
                  <option value="hoy">Hoy</option>
                  <option value="semana">Esta semana</option>
                  <option value="mes">Este mes</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              {rangoFecha === 'personalizado' && (
                <>
                  <div className="flex flex-col gap-1 min-w-[140px]">
                    <label className="text-xs text-gray-500">Desde</label>
                    <CustomDatePicker value={filtroDesde} onChange={setFiltroDesde} minDate={new Date('2020-01-01')} showGrupo={false}
                      className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-[140px]">
                    <label className="text-xs text-gray-500">Hasta</label>
                    <CustomDatePicker value={filtroHasta} onChange={setFiltroHasta} minDate={new Date('2020-01-01')} showGrupo={false}
                      className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
                  </div>
                </>
              )}
            </div>
          )}
          {(filtroTipo !== 'TODOS' || rangoFecha !== '' || busqueda) && (
            <button onClick={() => { setFiltroTipo('TODOS'); aplicarRango(''); setBusqueda(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-left">
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contenido */}
        {filtradas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileSearch className="w-16 h-16 mx-auto mb-4 opacity-50" />
            No hay licencias registradas
          </div>
        ) : (
          <>
            {/* TABLA - solo desktop */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Tipo', 'Desde', 'Hasta', 'Días', 'Estado', 'Observaciones', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs uppercase text-gray-600 dark:text-gray-300 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginadas.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 dark:text-gray-300">{formatTipoLicencia(l.tipo)}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{formatDate2(l.fecha_desde)}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{formatDate2(l.fecha_hasta)}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{l.dias ?? '•'}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={l.estado} /></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm max-w-[160px] truncate">{l.observaciones ?? '•'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViendo(l)} title="Ver detalle" className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"><Eye size={16} /></button>
                          {puedeModificar(l) && <button onClick={() => abrirEditar(l)} title="Editar" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><Pencil size={16} /></button>}
                          {puedeEliminar(l) && <button onClick={() => setEliminando(l)} title="Eliminar" className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CARDS - solo móvil */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {paginadas.map(l => (
                <div key={l.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatTipoLicencia(l.tipo)}</p>
                    <EstadoBadge estado={l.estado} />
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span className="block whitespace-nowrap">Desde: <span className="text-gray-900 dark:text-gray-200 font-medium">{formatDate2(l.fecha_desde)}</span></span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="whitespace-nowrap">Hasta: <span className="text-gray-900 dark:text-gray-200 font-medium">{formatDate2(l.fecha_hasta)}</span>{l.dias && <span className="ml-2 text-gray-500 dark:text-gray-400">{l.dias} días</span>}</span>
                    {/* Acciones inline con las fechas */}
                    <div className="flex items-center gap-3 ml-2">
                      <button onClick={() => setViendo(l)} title="Ver detalle" className="text-blue-500 hover:text-blue-700 transition-colors"><Eye size={16} /></button>
                      {puedeModificar(l) && <button onClick={() => abrirEditar(l)} title="Editar" className="text-gray-500 hover:text-gray-700 transition-colors"><Pencil size={16} /></button>}
                      {puedeEliminar(l) && <button onClick={() => setEliminando(l)} title="Eliminar" className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                  </div>
                  {l.observaciones && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{l.observaciones}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {filtradas.length > 0 && (
        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          porPagina={porPagina}
          onCambiarPagina={setPagina}
          onCambiarPorPagina={setPorPagina}
        />
      )}

      {/* Modal Ver */}
      {
        viendo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={e => e.target === e.currentTarget && setViendo(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Detalle de licencia</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tipo</span><span className="font-medium dark:text-gray-200">{formatTipoLicencia(viendo.tipo)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Desde</span><span className="dark:text-gray-200">{formatDate2(viendo.fecha_desde)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hasta</span><span className="dark:text-gray-200">{formatDate2(viendo.fecha_hasta)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Días</span><span className="dark:text-gray-200">{viendo.dias ?? '•'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500">Estado</span><EstadoBadge estado={viendo.estado} /></div>
                {viendo.observaciones && <div><span className="text-gray-500">Observaciones</span><p className="mt-1 text-gray-700 dark:text-gray-300">{viendo.observaciones}</p></div>}
              </div>
              <button onClick={() => setViendo(null)} className="mt-5 w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cerrar
              </button>
            </div>
          </div>
        )
      }

      {/* Modal Editar */}
      {
        editando && (
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
        )
      }

      {/* Modal Eliminar */}
      {
        eliminando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={e => e.target === e.currentTarget && setEliminando(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">¿Eliminar licencia?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Se eliminará la licencia {formatTipoLicencia(eliminando.tipo)} del {formatDate2(eliminando.fecha_desde)} al {formatDate2(eliminando.fecha_hasta)}.
                {TIPOS_CON_AUTORIZACION.includes(eliminando.tipo) && ' La autorización pendiente también será cancelada.'}
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