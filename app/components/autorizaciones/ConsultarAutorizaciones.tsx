'use client';

import { useState, useEffect } from 'react';
import { Download, Search } from 'lucide-react';
import { useEmpleados } from '@/hooks/useEmpleados';
import { CustomDatePicker } from '@/app/components/CustomDatePicker';
import { generarExcel, generarPDF } from '@/app/lib/exportUtils';
import { Paginacion } from '@/app/components/cambios/Paginacion';

function formatTipo(tipo: string | null | undefined) {
  switch (tipo) {
    case 'CAMBIO_TURNO': return 'Cambio de Turno';
    case 'LICENCIA_ORDINARIA': return 'Licencia Ordinaria';
    default: return tipo ?? '•';
  }
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    APROBADA:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    RECHAZADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    CANCELADA: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  );
}

export function ConsultarAutorizaciones() {
  const [autorizaciones, setAutorizaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [empleadoId, setEmpleadoId] = useState('TODOS');
  const [tipo, setTipo] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const { empleados } = useEmpleados();

  useEffect(() => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (empleadoId !== 'TODOS') params.set('empleadoId', empleadoId);
    if (tipo !== 'TODOS') params.set('tipo', tipo);

    setIsLoading(true);
    setPagina(1);
    fetch(`/api/reportes/autorizaciones?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setAutorizaciones(d) : setAutorizaciones([]))
      .finally(() => setIsLoading(false));
  }, [desde, hasta, empleadoId, tipo]);

  const filtradas = autorizaciones.filter(a =>
    busqueda === '' ||
    a.empleado?.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginadas = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const exportarExcel = () => {
    generarExcel(
      {
        subtitle: 'Consulta de Autorizaciones',
        stats: [
          { label: 'TOTAL', value: filtradas.length, color: '3B82F6' },
          { label: 'APROBADAS', value: filtradas.filter(a => a.estado === 'APROBADA').length, color: '10B981' },
          { label: 'RECHAZADAS', value: filtradas.filter(a => a.estado === 'RECHAZADA').length, color: 'EF4444' },
          { label: 'PENDIENTES', value: filtradas.filter(a => a.estado === 'PENDIENTE').length, color: 'F59E0B' },
        ],
        filename: `Autorizaciones_${fechaArchivo}.xlsx`,
        sheetName: 'Autorizaciones',
      },
      [
        { header: '#', width: 6 },
        { header: 'EMPLEADO', width: 25 },
        { header: 'TIPO', width: 20 },
        { header: 'SUBTIPO', width: 18 },
        { header: 'FECHA', width: 14 },
        { header: 'ESTADO', width: 14 },
        { header: 'MOTIVO', width: 30 },
        { header: 'APROBADO POR', width: 22 },
      ],
      filtradas.map((a) => [
        `#${a.id?.slice(-8).toUpperCase()}`,
        a.empleado ?? '•',
        formatTipo(a.tipo),
        a.subtipo ?? '•',
        a.fecha ? new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-AR') : '•',
        a.estado ?? '•',
        a.motivo ?? '•',
        a.aprobadoPor ?? '•',
      ])
    );
  };

  const exportarPDF = async () => {
    await generarPDF(
      { subtitle: 'Consulta de Autorizaciones', orientation: 'landscape', filename: `Autorizaciones_${fechaArchivo}.pdf` },
      [
        { label: '#', x: 15, w: 22 },
        { label: 'Empleado', x: 39, w: 45, truncate: 18 },
        { label: 'Tipo', x: 86, w: 35 },
        { label: 'Fecha', x: 123, w: 25 },
        { label: 'Estado', x: 150, w: 25 },
        { label: 'Motivo', x: 177, w: 90, wrap: true },
      ],
      filtradas.map(a => (_doc: any) => ({
        cells: [
          `#${a.id?.slice(-8).toUpperCase()}`,
          a.empleado ?? '•',
          formatTipo(a.tipo),
          a.fecha ? new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-AR') : '•',
          a.estado ?? '•',
          a.motivo ?? '•',
        ],
      }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
            <CustomDatePicker value={desde} onChange={setDesde} minDate={new Date('2020-01-01')} showGrupo={false}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
            <CustomDatePicker value={hasta} onChange={setHasta} minDate={new Date('2020-01-01')} showGrupo={false}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Empleado</label>
            <select value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
              <option value="TODOS">Todos los empleados</option>
              {(empleados || []).filter((e: any) => e.rol !== 'ADMINISTRADOR' && e.rol !== 'JEFE').map((e: any) => (
                <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
              <option value="TODOS">Todos los tipos</option>
              <option value="CAMBIO_TURNO">Cambio de turno</option>
              <option value="LICENCIA_ORDINARIA">Licencia</option>
            </select>
          </div>
          {(desde || hasta || empleadoId !== 'TODOS' || tipo !== 'TODOS') && (
            <button onClick={() => { setDesde(''); setHasta(''); setEmpleadoId('TODOS'); setTipo('TODOS'); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors self-end pb-2">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Buscador + export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Buscar por empleado o tipo..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100" />
        </div>
        <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
          <Download size={13} /> PDF
        </button>
        <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
          <Download size={13} /> Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtradas.length} autorización{filtradas.length !== 1 ? 'es' : ''}</p>
        </div>
        {/* TABLA - solo desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {['#', 'Empleado', 'Con', 'Tipo', 'Subtipo', 'Fecha', 'Estado', 'Motivo', 'Aprobado por'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Cargando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No hay autorizaciones para los filtros seleccionados</td></tr>
              ) : paginadas.map((a, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs font-mono">#{a.id?.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.empleado ?? '•'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{a.otraPersona ?? '•'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {formatTipo(a.tipo)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{a.subtipo ?? '•'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {a.fecha ? new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-AR') : '•'}
                    {a.fechaDestinatario && (
                      <span className="text-gray-400 dark:text-gray-500"> ↔ {new Date(a.fechaDestinatario + 'T12:00:00').toLocaleDateString('es-AR')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><EstadoBadge estado={a.estado} /></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[180px] truncate">{a.motivo ?? '•'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{a.aprobadoPor ?? '•'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* CARDS - solo móvil */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading ? (
            <p className="px-4 py-10 text-center text-gray-400">Cargando...</p>
          ) : filtradas.length === 0 ? (
            <p className="px-4 py-10 text-center text-gray-400">No hay autorizaciones para los filtros seleccionados</p>
          ) : paginadas.map((a, i) => (
            <div key={i} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
              {/* Fila 1: ID + Estado */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                  #{a.id?.slice(-8).toUpperCase()}
                </span>
                <EstadoBadge estado={a.estado} />
              </div>
              {/* Fila 2: Empleado */}
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                {a.empleado ?? '•'}
              </p>
              {/* Fila 3: Tipo + Fecha */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{formatTipo(a.tipo)}{a.subtipo ? ` · ${a.subtipo}` : ''}</span>
                <span>
                  {a.fecha ? new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-AR') : '•'}
                  {a.fechaDestinatario && ` ↔ ${new Date(a.fechaDestinatario + 'T12:00:00').toLocaleDateString('es-AR')}`}
                </span>
              </div>
              {/* Fila 4: Con + Aprobado por (si existen) */}
              {(a.otraPersona || a.aprobadoPor) && (
                <div className="flex flex-wrap gap-x-4 text-xs text-gray-400 dark:text-gray-500">
                  {a.otraPersona && <span>Con: {a.otraPersona}</span>}
                  {a.aprobadoPor && <span>Aprobado por: {a.aprobadoPor}</span>}
                </div>
              )}
              {/* Motivo */}
              {a.motivo && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {a.motivo}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <Paginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        porPagina={porPagina}
        onCambiarPagina={setPagina}
        onCambiarPorPagina={setPorPagina}
      />
    </div>
  );
}
