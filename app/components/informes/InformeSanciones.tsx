'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Shield, Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useSanciones } from '@/hooks/useSanciones';
import { useEmpleados } from '@/hooks/useEmpleados';
import { CustomDatePicker } from '@/app/components/CustomDatePicker';
import { generarExcel, generarPDF } from '@/app/lib/exportUtils';
import { Paginacion } from '@/app/components/cambios/Paginacion';

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    ACTIVA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    FINALIZADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    ANULADA: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  );
}

export function InformeSanciones() {
  const { sanciones, loading } = useSanciones();
  const { empleados } = useEmpleados();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [empleadoId, setEmpleadoId] = useState('TODOS');
  const [estado, setEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const filtradas = useMemo(() => {
    return sanciones.filter(s => {
      if (desde && s.fecha_desde < desde) return false;
      if (hasta && s.fecha_hasta > hasta) return false;
      if (empleadoId !== 'TODOS' && s.empleado_id !== empleadoId) return false;
      if (estado !== 'TODOS' && s.estado !== estado) return false;
      if (busqueda) {
        const emp = empleados?.find(e => e.id === s.empleado_id);
        const nombre = emp ? `${emp.nombre} ${emp.apellido}`.toLowerCase() : '';
        const motivo = s.motivo?.toLowerCase() ?? '';
        const q = busqueda.toLowerCase();
        if (!nombre.includes(q) && !motivo.includes(q)) return false;
      }
      return true;
    });
  }, [sanciones, desde, hasta, empleadoId, estado, busqueda]);

  const stats = useMemo(() => ({
    total: filtradas.length,
    activas: filtradas.filter(s => s.estado === 'ACTIVA').length,
    finalizadas: filtradas.filter(s => s.estado === 'FINALIZADA').length,
    anuladas: filtradas.filter(s => s.estado === 'ANULADA').length,
  }), [filtradas]);

  const pieData = [
    { name: 'Activas', value: stats.activas, fill: '#EF4444' },
    { name: 'Finalizadas', value: stats.finalizadas, fill: '#10B981' },
    { name: 'Anuladas', value: stats.anuladas, fill: '#6B7280' },
  ].filter(d => d.value > 0);

  const topEmpleados = useMemo(() => {
    const map: Record<string, { nombre: string; count: number }> = {};
    filtradas.forEach(s => {
      const key = s.empleado_id;
      const emp = empleados?.find(e => e.id === s.empleado_id);
      const nombre = emp ? `${emp.apellido}, ${emp.nombre}` : '—';
      if (!map[key]) map[key] = { nombre, count: 0 };
      map[key].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(e => ({ name: e.nombre, value: e.count }));
  }, [filtradas]);

  const porMes = useMemo(() => {
    const map: Record<string, number> = {};
    filtradas.forEach(s => {
      const mes = s.fecha_desde.slice(0, 7);
      map[mes] = (map[mes] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, value]) => ({
        name: new Date(mes + '-01T12:00:00').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        value,
      }));
  }, [filtradas]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginadas = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);
  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const exportarExcel = () => {
    generarExcel(
      {
        subtitle: 'Reporte de Sanciones',
        stats: [
          { label: 'TOTAL', value: stats.total, color: '3B82F6' },
          { label: 'ACTIVAS', value: stats.activas, color: 'EF4444' },
          { label: 'FINALIZADAS', value: stats.finalizadas, color: '10B981' },
          { label: 'ANULADAS', value: stats.anuladas, color: '6B7280' },
        ],
        filename: `Sanciones_${fechaArchivo}.xlsx`,
        sheetName: 'Sanciones',
      },
      [
        { header: 'EMPLEADO', width: 25 },
        { header: 'MOTIVO', width: 35 },
        { header: 'DESDE', width: 14 },
        { header: 'HASTA', width: 14 },
        { header: 'ESTADO', width: 14 },
      ],
      filtradas.map(s => [
        s.empleado ? `${s.empleado.apellido}, ${s.empleado.nombre}` : '—',
        s.motivo,
        new Date(s.fecha_desde + 'T12:00:00').toLocaleDateString('es-AR'),
        new Date(s.fecha_hasta + 'T12:00:00').toLocaleDateString('es-AR'),
        s.estado,
      ])
    );
  };

  const exportarPDF = async () => {
    await generarPDF(
      { subtitle: 'Reporte de Sanciones', orientation: 'landscape', filename: `Sanciones_${fechaArchivo}.pdf` },
      [
        { label: 'Empleado', x: 15, w: 55, truncate: 22 },
        { label: 'Motivo', x: 72, w: 80, wrap: true },
        { label: 'Desde', x: 154, w: 28 },
        { label: 'Hasta', x: 184, w: 28 },
        { label: 'Estado', x: 214, w: 28 },
      ],
      filtradas.map(s => (_doc: any) => ({
        cells: [
          s.empleado ? `${s.empleado.apellido}, ${s.empleado.nombre}` : '—',
          s.motivo,
          new Date(s.fecha_desde + 'T12:00:00').toLocaleDateString('es-AR'),
          new Date(s.fecha_hasta + 'T12:00:00').toLocaleDateString('es-AR'),
          s.estado,
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
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Estado</label>
            <select value={estado} onChange={e => { setEstado(e.target.value); setPagina(1); }}
              className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
              <option value="TODOS">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>
          {(desde || hasta || empleadoId !== 'TODOS' || estado !== 'TODOS') && (
            <button onClick={() => { setDesde(''); setHasta(''); setEmpleadoId('TODOS'); setEstado('TODOS'); setPagina(1); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pb-2">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Total sanciones" value={stats.total} color="bg-blue-500" />
        <StatCard icon={AlertTriangle} label="Activas" value={stats.activas} color="bg-red-500" />
        <StatCard icon={CheckCircle} label="Finalizadas" value={stats.finalizadas} color="bg-green-500" />
        <StatCard icon={XCircle} label="Anuladas" value={stats.anuladas} color="bg-gray-500" />
      </div>

      {/* Gráfico + Tabla */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribución por estado</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                  itemStyle={{ color: '#F9FAFB' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-16">Sin datos</p>
          )}
        </div>

        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <input type="text" placeholder="Buscar por empleado o motivo..." value={busqueda}
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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Empleado', 'Motivo', 'Desde', 'Hasta', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginadas.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No hay sanciones para los filtros seleccionados</td></tr>
                ) : paginadas.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {(() => {
                        const emp = empleados?.find(e => e.id === s.empleado_id);
                        return emp ? `${emp.apellido}, ${emp.nombre}` : '—';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{s.motivo}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(s.fecha_desde + 'T12:00:00').toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(s.fecha_hasta + 'T12:00:00').toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gráficos adicionales */}
      {filtradas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top empleados con más sanciones</h3>
            {topEmpleados.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topEmpleados} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#9CA3AF' }} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                    itemStyle={{ color: '#F9FAFB' }}
                    formatter={(v) => [v, 'Sanciones']}
                  />
                  <Bar dataKey="value" name="Sanciones" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-16">Sin datos</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Evolución mensual</h3>
            {porMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={porMes} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                    itemStyle={{ color: '#F9FAFB' }}
                    formatter={(v) => [v, 'Sanciones']}
                  />
                  <Bar dataKey="value" name="Sanciones" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-16">Sin datos</p>
            )}
          </div>
        </div>
      )}

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
