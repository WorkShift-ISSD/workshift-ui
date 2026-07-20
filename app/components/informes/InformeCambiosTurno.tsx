'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Gift, CheckCircle, XCircle, TrendingUp, Users, Download } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useEmpleados } from '@/hooks/useEmpleados';
import { CustomDatePicker } from '@/app/components/CustomDatePicker';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { generarExcel, generarPDF } from '@/app/lib/exportUtils';

const COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

const PieLegend = ({ payload }: any) => {
  const total = payload?.reduce((sum: number, e: any) => sum + (e.payload?.value ?? 0), 0) ?? 0;
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3">
      {payload?.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.payload?.fill ?? entry.color }} />
          <span className="text-gray-600 dark:text-gray-400">{entry.value}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {entry.payload?.value} ({total > 0 ? ((entry.payload?.value / total) * 100).toFixed(0) : 0}%)
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const color = data.payload.fill || data.fill || COLORS[0];
    return (
      <div className="bg-gray-800 dark:bg-gray-700 border border-gray-600 dark:border-gray-500 rounded-lg shadow-lg px-3 py-2">
        <p className="text-white font-semibold">{data.name}</p>
        <p className="font-bold" style={{ color: color }}>{data.value}</p>
      </div>
    );
  }
  return null;
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

type CambiosTurnoData = { data: any; filtros: { desde: string; hasta: string; empleadoId: string } };

export function InformeCambiosTurno({ onDataChange }: { onDataChange?: (payload: CambiosTurnoData) => void } = {}) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [empleadoId, setEmpleadoId] = useState('TODOS');
  const { empleados } = useEmpleados();

  // Paginado de la tabla de detalle
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const tabla = data?.tabla ?? [];
  const totalPaginas = Math.max(1, Math.ceil(tabla.length / porPagina));
  const tablaPaginada = tabla.slice((pagina - 1) * porPagina, pagina * porPagina);

  const fetchData = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (empleadoId !== 'TODOS') params.set('empleadoId', empleadoId);

    fetch(`/api/reportes/cambios-turno?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); else console.error('Error API:', d.error); })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchData(); }, [desde, hasta, empleadoId]);

  useEffect(() => { setPagina(1); }, [desde, hasta, empleadoId, data]);

    useEffect(() => {
    onDataChange?.({ data, filtros: { desde, hasta, empleadoId } });
  }, [data, desde, hasta, empleadoId, onDataChange]);

  const stats = data?.stats;
  const tasaAprobacion = stats && (stats.aprobados + stats.rechazados) > 0
    ? Math.round((stats.aprobados / (stats.aprobados + stats.rechazados)) * 100)
    : 0;

  const empleadoTopNombre = data?.porEmpleado?.[0]?.nombre ?? '—';

  const pieData = stats ? [
    { name: 'Intercambios', value: stats.intercambios },
    { name: 'Coberturas', value: stats.coberturas },
  ] : [];

  const estadoData = stats ? [
    { name: 'Aprobados', value: stats.aprobados, fill: '#10B981' },
    { name: 'Rechazados', value: stats.rechazados, fill: '#EF4444' },
    { name: 'Cancelados', value: stats.cancelados, fill: '#6B7280' },
    { name: 'Pendientes', value: stats.pendientes, fill: '#F59E0B' },
  ] : [];

  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const exportarExcel = () => {
    const rows = (data?.tabla || []).map((t: any) => [
      t.empleado, t.rol, t.tipo_cambio, t.fecha_turno || '—', t.estado, t.motivo || '—', t.aprobado_por || '—',
    ]);
    generarExcel(
      {
        subtitle: 'Reporte de Cambios de Turno',
        stats: [
          { label: 'TOTAL', value: stats?.total ?? 0, color: '3B82F6' },
          { label: 'APROBADOS', value: stats?.aprobados ?? 0, color: '10B981' },
          { label: 'RECHAZADOS', value: stats?.rechazados ?? 0, color: 'EF4444' },
          { label: 'TASA APROBACIÓN', value: `${tasaAprobacion}%`, color: '8B5CF6' },
        ],
        filename: `CambiosTurno_${fechaArchivo}.xlsx`,
        sheetName: 'Cambios de Turno',
      },
      [
        { header: 'EMPLEADO', width: 25 },
        { header: 'ROL', width: 16 },
        { header: 'TIPO', width: 14 },
        { header: 'FECHA TURNO', width: 14 },
        { header: 'ESTADO', width: 14 },
        { header: 'MOTIVO', width: 30 },
        { header: 'APROBADO POR', width: 22 },
      ],
      rows
    );
  };

  const exportarPDF = async () => {
    const rows = (data?.tabla || []).map((t: any) => (_doc: any) => ({
      cells: [t.empleado, t.tipo_cambio, t.fecha_turno || '—', t.estado, t.motivo || '—'],
    }));
    await generarPDF(
      { subtitle: 'Reporte de Cambios de Turno', orientation: 'landscape', filename: `CambiosTurno_${fechaArchivo}.pdf` },
      [
        { label: 'Empleado', x: 15, w: 55, truncate: 22 },
        { label: 'Tipo', x: 72, w: 28 },
        { label: 'Fecha turno', x: 102, w: 30 },
        { label: 'Estado', x: 134, w: 28 },
        { label: 'Motivo', x: 164, w: 103, wrap: true },
      ],
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
            <CustomDatePicker value={desde} onChange={v => { setDesde(v); if (hasta && v > hasta) setHasta(v); }} minDate={new Date('2020-01-01')} showGrupo={false}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full" />
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
            <CustomDatePicker value={hasta} onChange={setHasta} minDate={desde ? new Date(desde + 'T00:00:00') : new Date('2020-01-01')} showGrupo={false}
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
          {(desde || hasta || empleadoId !== 'TODOS') && (
            <button onClick={() => { setDesde(''); setHasta(''); setEmpleadoId('TODOS'); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pb-2">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner size="large" />
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Total solicitudes" value={stats?.total ?? 0} color="bg-blue-500" />
            <StatCard icon={CheckCircle} label="Tasa de aprobación" value={`${tasaAprobacion}%`} sub={`${stats?.aprobados} aprobados`} color="bg-green-500" />
            <StatCard icon={RefreshCw} label="Intercambios" value={stats?.intercambios ?? 0} sub={`${stats?.coberturas ?? 0} coberturas`} color="bg-purple-500" />
            <StatCard icon={Users} label="Más activo" value={empleadoTopNombre.split(' ')[0]} sub={`${data?.porEmpleado?.[0]?.total ?? 0} solicitudes`} color="bg-amber-500" />
          </div>

          {/* Gráficos fila 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cambios por mes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Solicitudes por mes</h3>
              {data?.porMes?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.porMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
                    <Legend />
                    <Bar dataKey="aprobados" name="Aprobados" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rechazados" name="Rechazados" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 text-sm py-16">Sin datos para el período</p>}
            </div>

            {/* Intercambios vs Coberturas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Intercambios vs Coberturas</h3>
              {pieData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend content={<PieLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 text-sm py-16">Sin datos para el período</p>}
            </div>
          </div>

          {/* Gráficos fila 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ranking empleados */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Solicitudes por empleado</h3>
              {data?.porEmpleado?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.porEmpleado} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis dataKey="nombre" type="category" tick={{ fontSize: 10, fill: '#9CA3AF' }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
                    <Bar dataKey="total" name="Total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 text-sm py-16">Sin datos para el período</p>}
            </div>

            {/* Estados */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribución por estado</h3>
              {estadoData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={estadoData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}>
                      {estadoData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend content={<PieLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 text-sm py-16">Sin datos para el período</p>}
            </div>
          </div>

          {/* Tabla detalle */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Detalle de solicitudes <span className="text-gray-400 font-normal">({data?.tabla?.length ?? 0})</span>
              </h3>
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Empleado', 'Rol', 'Tipo', 'Fecha turno', 'Estado', 'Motivo', 'Aprobado por'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabla.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No hay solicitudes para el período seleccionado</td></tr>
                  ) : tablaPaginada.map((t: any) => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.empleado}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.rol}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${t.tipo_cambio === 'Intercambio' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                          {t.tipo_cambio === 'Intercambio' ? <RefreshCw size={10} /> : <Gift size={10} />} {t.tipo_cambio}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.fecha_turno || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.estado === 'APROBADA' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          t.estado === 'RECHAZADA' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          t.estado === 'CANCELADA' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>{t.estado}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[160px] truncate">{t.motivo || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.aprobado_por || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tabla.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrar
                  </span>
                  <select
                    value={porPagina}
                    onChange={(e) => {
                      setPorPagina(Number(e.target.value));
                      setPagina(1);
                    }}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    por página
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando{" "}
                    {tabla.length === 0 ? 0 : (pagina - 1) * porPagina + 1}{" "}
                    a{" "}
                    {Math.min(pagina * porPagina, tabla.length)}{" "}
                    de {tabla.length} registros
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón Primera Página */}
                  <button
                    onClick={() => setPagina(1)}
                    disabled={pagina === 1}
                    className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    «
                  </button>

                  {/* Botón Anterior */}
                  <button
                    onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                    disabled={pagina === 1}
                    className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    ‹
                  </button>

                  {/* Números de página - solo desktop */}
                  <span className="text-sm text-gray-700 dark:text-gray-300 sm:hidden">
                    {pagina} / {totalPaginas}
                  </span>
                  <span className="hidden sm:contents">
                    {(() => {
                      const pages = [];
                      const maxPagesToShow = 5;
                      let startPage = Math.max(
                        1,
                        pagina - Math.floor(maxPagesToShow / 2),
                      );
                      let endPage = Math.min(
                        totalPaginas,
                        startPage + maxPagesToShow - 1,
                      );

                      if (endPage - startPage < maxPagesToShow - 1) {
                        startPage = Math.max(1, endPage - maxPagesToShow + 1);
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setPagina(i)}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              pagina === i
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                          >
                            {i}
                          </button>,
                        );
                      }

                      return pages;
                    })()}
                  </span>

                  {/* Botón Siguiente */}
                  <button
                    onClick={() =>
                      setPagina((prev) => Math.min(totalPaginas, prev + 1))
                    }
                    disabled={pagina === totalPaginas}
                    className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    ›
                  </button>

                  {/* Botón Última Página */}
                  <button
                    onClick={() => setPagina(totalPaginas)}
                    disabled={pagina === totalPaginas}
                    className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}