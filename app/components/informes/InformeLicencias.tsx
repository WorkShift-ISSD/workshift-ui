'use client';

import { useMemo, useState } from 'react';
import { Calendar, CheckCircle, Clock, FileText, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLicencias } from '@/hooks/useLicencias';
import { useEmpleados } from '@/hooks/useEmpleados';
import { CustomDatePicker } from '@/app/components/CustomDatePicker';
import { generarExcel, generarPDF } from '@/app/lib/exportUtils';
import { Paginacion } from '@/app/components/cambios/Paginacion';

const TIPO_LABEL: Record<string, string> = {
  ORDINARIA: 'Ordinaria',
  ESPECIAL: 'Especial',
  MEDICA: 'Médica',
  ESTUDIO: 'Estudio',
  SIN_GOCE: 'Sin goce',
};

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    APROBADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    ACTIVA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    FINALIZADA: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    RECHAZADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  );
}

export function InformeLicencias() {
  const { licencias, loading } = useLicencias();
  const { empleados } = useEmpleados();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [empleadoId, setEmpleadoId] = useState('TODOS');
  const [tipo, setTipo] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const filtradas = useMemo(() => {
    return licencias.filter(l => {
      if (desde && l.fecha_desde < desde) return false;
      if (hasta && l.fecha_hasta > hasta) return false;
      if (empleadoId !== 'TODOS' && l.empleado_id !== empleadoId) return false;
      if (tipo !== 'TODOS' && l.tipo !== tipo) return false;
      if (busqueda) {
        const nombre = l.empleado ? `${l.empleado.nombre} ${l.empleado.apellido}`.toLowerCase() : '';
        if (!nombre.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [licencias, desde, hasta, empleadoId, tipo, busqueda]);

  const stats = useMemo(() => {
    const diasTotal = filtradas.reduce((acc, l) => acc + (l.dias ?? 0), 0);
    return {
      total: filtradas.length,
      activas: filtradas.filter(l => l.estado === 'ACTIVA').length,
      pendientes: filtradas.filter(l => l.estado === 'PENDIENTE').length,
      diasTotal,
    };
  }, [filtradas]);

  const porTipo = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach(l => { map[l.tipo] = (map[l.tipo] ?? 0) + 1; });
    return Object.entries(map).map(([t, value]) => ({ name: TIPO_LABEL[t] ?? t, value }));
  }, [filtradas]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginadas = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);
  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const exportarExcel = () => {
    generarExcel(
      {
        subtitle: 'Reporte de Licencias',
        stats: [
          { label: 'TOTAL', value: stats.total, color: '3B82F6' },
          { label: 'ACTIVAS', value: stats.activas, color: '10B981' },
          { label: 'PENDIENTES', value: stats.pendientes, color: 'F59E0B' },
          { label: 'DÍAS TOTALES', value: stats.diasTotal, color: '8B5CF6' },
        ],
        filename: `Licencias_${fechaArchivo}.xlsx`,
        sheetName: 'Licencias',
      },
      [
        { header: 'EMPLEADO', width: 25 },
        { header: 'TIPO', width: 16 },
        { header: 'ARTÍCULO', width: 14 },
        { header: 'DESDE', width: 14 },
        { header: 'HASTA', width: 14 },
        { header: 'DÍAS', width: 8 },
        { header: 'ESTADO', width: 14 },
        { header: 'OBSERVACIONES', width: 30 },
      ],
      filtradas.map(l => [
        l.empleado ? `${l.empleado.apellido}, ${l.empleado.nombre}` : '—',
        TIPO_LABEL[l.tipo] ?? l.tipo,
        l.articulo ?? '—',
        new Date(l.fecha_desde + 'T12:00:00').toLocaleDateString('es-AR'),
        new Date(l.fecha_hasta + 'T12:00:00').toLocaleDateString('es-AR'),
        l.dias,
        l.estado,
        l.observaciones ?? '—',
      ])
    );
  };

  const exportarPDF = async () => {
    await generarPDF(
      { subtitle: 'Reporte de Licencias', orientation: 'landscape', filename: `Licencias_${fechaArchivo}.pdf` },
      [
        { label: 'Empleado', x: 15, w: 50, truncate: 20 },
        { label: 'Tipo', x: 67, w: 28 },
        { label: 'Desde', x: 97, w: 28 },
        { label: 'Hasta', x: 127, w: 28 },
        { label: 'Días', x: 157, w: 16 },
        { label: 'Estado', x: 175, w: 28 },
        { label: 'Obs.', x: 205, w: 67, wrap: true },
      ],
      filtradas.map(l => (_doc: any) => ({
        cells: [
          l.empleado ? `${l.empleado.apellido}, ${l.empleado.nombre}` : '—',
          TIPO_LABEL[l.tipo] ?? l.tipo,
          new Date(l.fecha_desde + 'T12:00:00').toLocaleDateString('es-AR'),
          new Date(l.fecha_hasta + 'T12:00:00').toLocaleDateString('es-AR'),
          String(l.dias),
          l.estado,
          l.observaciones ?? '—',
        ],
      }))
    );
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
            <CustomDatePicker value={desde} onChange={v => { setDesde(v); setPagina(1); }} minDate={new Date('2020-01-01')} showGrupo={false}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
            <CustomDatePicker value={hasta} onChange={v => { setHasta(v); setPagina(1); }} minDate={new Date('2020-01-01')} showGrupo={false}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Empleado</label>
            <select value={empleadoId} onChange={e => { setEmpleadoId(e.target.value); setPagina(1); }}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
              <option value="TODOS">Todos los empleados</option>
              {(empleados || []).filter((e: any) => e.rol !== 'ADMINISTRADOR' && e.rol !== 'JEFE').map((e: any) => (
                <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</label>
            <select value={tipo} onChange={e => { setTipo(e.target.value); setPagina(1); }}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
              <option value="TODOS">Todos los tipos</option>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {(desde || hasta || empleadoId !== 'TODOS' || tipo !== 'TODOS') && (
            <button onClick={() => { setDesde(''); setHasta(''); setEmpleadoId('TODOS'); setTipo('TODOS'); setPagina(1); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pb-2">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total licencias" value={stats.total} color="bg-blue-500" />
        <StatCard icon={CheckCircle} label="Activas" value={stats.activas} color="bg-green-500" />
        <StatCard icon={Clock} label="Pendientes" value={stats.pendientes} color="bg-amber-500" />
        <StatCard icon={Calendar} label="Días totales" value={stats.diasTotal} color="bg-purple-500" />
      </div>

      {/* Gráfico + Tabla */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Por tipo de licencia</h3>
          {porTipo.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porTipo} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#9CA3AF' }} width={70} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                  itemStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="value" name="Licencias" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-16">Sin datos</p>
          )}
        </div>

        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <input type="text" placeholder="Buscar por empleado..." value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 mr-2" />
            <div className="flex gap-2">
              <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
                <Download size={13} /> PDF
              </button>
              <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
                <Download size={13} /> Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {/* TABLA - solo desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Empleado', 'Tipo', 'Artículo', 'Desde', 'Hasta', 'Días', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginadas.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No hay licencias para los filtros seleccionados</td></tr>
                  ) : paginadas.map(l => (
                    <tr key={l.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{l.empleado ? `${l.empleado.apellido}, ${l.empleado.nombre}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{TIPO_LABEL[l.tipo] ?? l.tipo}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{l.articulo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(l.fecha_desde + 'T12:00:00').toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(l.fecha_hasta + 'T12:00:00').toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">{l.dias}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={l.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CARDS - solo móvil */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {paginadas.length === 0 ? (
                <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay licencias para los filtros seleccionados</p>
              ) : paginadas.map(l => (
                <div key={l.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {l.empleado ? `${l.empleado.apellido}, ${l.empleado.nombre}` : '—'}
                    </p>
                    <EstadoBadge estado={l.estado} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                      {TIPO_LABEL[l.tipo] ?? l.tipo}
                    </span>
                    {l.articulo && <span className="text-xs text-gray-500 dark:text-gray-400">{l.articulo}</span>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex gap-3">
                      <span>Desde: <span className="font-medium text-gray-900 dark:text-gray-200">{new Date(l.fecha_desde + 'T12:00:00').toLocaleDateString('es-AR')}</span></span>
                      <span>Hasta: <span className="font-medium text-gray-900 dark:text-gray-200">{new Date(l.fecha_hasta + 'T12:00:00').toLocaleDateString('es-AR')}</span></span>
                    </div>
                    {l.dias && <span className="font-semibold text-gray-900 dark:text-gray-100">{l.dias}d</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Paginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        porPagina={porPagina}
        onCambiarPagina={setPagina}
        onCambiarPorPagina={n => { setPorPagina(n); setPagina(1); }}
      />
    </div>
  );
}
