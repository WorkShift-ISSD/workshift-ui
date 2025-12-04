'use client';

import { useState, useMemo } from 'react';
import { useEmpleados } from '@/hooks/useEmpleados';
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Award,
} from 'lucide-react';

type Rol = 'SUPERVISOR' | 'INSPECTOR' | 'JEFE' | 'ADMINISTRADOR';
type GrupoTurno = 'A' | 'B';

interface Inspector {
  id: string;
  legajo: number;
  nombre: string;
  apellido: string;
  rol: Rol;
  grupoTurno: GrupoTurno;
  horario: string | null;
  activo: boolean;
}

interface Falta {
  id: string;
  empleadoId: string;
  fecha: string;
  motivo: string;
  justificada: boolean;
}

export default function CalificacionesPage() {
  const { empleados, isLoading: loadingEmpleados } = useEmpleados();
  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'mes' | 'trimestre' | 'año'>('mes');

const statsPersonal = useMemo(() => {
  if (!empleados) return null;

  // Filtrar solo SUPERVISOR e INSPECTOR
  const empleadosFiltrados = empleados.filter(
    e => e.rol === 'SUPERVISOR' || e.rol === 'INSPECTOR'
  );

  const activos = empleadosFiltrados.filter(e => e.activo);
  const inactivos = empleadosFiltrados.filter(e => !e.activo);

  // Por rol
  const porRol = empleadosFiltrados.reduce((acc, emp) => {
    acc[emp.rol] = (acc[emp.rol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Por turno
  const porTurno = empleadosFiltrados.reduce((acc, emp) => {
    acc[emp.grupoTurno] = (acc[emp.grupoTurno] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

// Por horario
const porHorario = empleadosFiltrados.reduce((acc, emp) => {
  const horario = emp.horario || 'Sin asignar';
  acc[horario] = (acc[horario] || 0) + 1;
  return acc;
}, {} as Record<string, number>);


return {
  total: empleadosFiltrados.length,
  activos: activos.length,
  inactivos: inactivos.length,
  porRol: Object.entries(porRol).map(([name, value]) => ({ name, value })),
  porTurno: Object.entries(porTurno).map(([name, value]) => ({ name, value })),
  porHorario: Object.entries(porHorario)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6),
};
}, [empleados]);

// ============ ESTADÍSTICAS DE FALTAS ============
const statsFaltas = useMemo(() => {
  if (!faltas || !empleados) return null;

  // Filtrar solo SUPERVISOR e INSPECTOR
  const empleadosFiltrados = empleados.filter(
    e => e.rol === 'SUPERVISOR' || e.rol === 'INSPECTOR'
  );

  const now = new Date();
  const mesActual = now.getMonth();
  const añoActual = now.getFullYear();

  // Filtrar según período y solo empleados filtrados
  const faltasFiltradas = faltas.filter(f => {
    const fecha = new Date(f.fecha);
    const esEmpleadoValido = empleadosFiltrados.some(e => e.id === f.empleadoId);
    
    if (!esEmpleadoValido) return false;

    if (selectedPeriod === 'mes') {
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    } else if (selectedPeriod === 'trimestre') {
      const trimestreActual = Math.floor(mesActual / 3);
      const trimestreFalta = Math.floor(fecha.getMonth() / 3);
      return trimestreFalta === trimestreActual && fecha.getFullYear() === añoActual;
    } else {
      return fecha.getFullYear() === añoActual;
    }
  });

  // Total de faltas
  const totalFaltas = faltasFiltradas.length;
  const justificadas = faltasFiltradas.filter(f => f.justificada).length;
  const injustificadas = totalFaltas - justificadas;

  // Faltas por empleado
  const faltasPorEmpleado = faltasFiltradas.reduce((acc, f) => {
    acc[f.empleadoId] = (acc[f.empleadoId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topFaltas = Object.entries(faltasPorEmpleado)
    .map(([empleadoId, cantidad]) => {
      const emp = empleadosFiltrados.find(e => e.id === empleadoId);
      return {
        name: emp ? `${emp.apellido}, ${emp.nombre}` : 'Desconocido',
        value: cantidad,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Faltas por mes (últimos 6 meses) - solo empleados filtrados
  const faltasPorMes = [];
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(añoActual, mesActual - i, 1);
    const mes = fecha.toLocaleDateString('es-AR', { month: 'short' });
    const cantidad = faltas.filter(f => {
      const fechaFalta = new Date(f.fecha);
      const esEmpleadoValido = empleadosFiltrados.some(e => e.id === f.empleadoId);
      return esEmpleadoValido && 
             fechaFalta.getMonth() === fecha.getMonth() && 
             fechaFalta.getFullYear() === fecha.getFullYear();
    }).length;
    faltasPorMes.push({ mes, cantidad });
  }

  // Faltas por rol
  const faltasPorRol = faltasFiltradas.reduce((acc, f) => {
    const emp = empleadosFiltrados.find(e => e.id === f.empleadoId);
    if (emp) {
      acc[emp.rol] = (acc[emp.rol] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Tasa de ausentismo por turno
  const faltasPorTurno = faltasFiltradas.reduce((acc, f) => {
    const emp = empleadosFiltrados.find(e => e.id === f.empleadoId);
    if (emp) {
      acc[emp.grupoTurno] = (acc[emp.grupoTurno] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    total: totalFaltas,
    justificadas,
    injustificadas,
    topFaltas,
    faltasPorMes,
    faltasPorRol: Object.entries(faltasPorRol).map(([name, value]) => ({ name, value })),
    faltasPorTurno: Object.entries(faltasPorTurno).map(([name, value]) => ({ name, value })),
    tasaAusentismo: ((totalFaltas / (empleadosFiltrados.length * 30)) * 100).toFixed(2),
  };
}, [faltas, empleados, selectedPeriod]);

  // ============ COLORES ============
  const COLORS = {
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    orange: '#F97316',
    cyan: '#06B6D4',
    pink: '#EC4899',
  };

  const PIE_COLORS = [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.red, COLORS.purple, COLORS.orange];

  if (loadingEmpleados || loadingFaltas) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <p className="text-gray-600 dark:text-gray-400 mt-4">Cargando estadísticas...</p>
      </div>
    );
  }

  if (!statsPersonal || !statsFaltas) {
    return (
      <div className="text-center text-red-500 py-8">
        Error cargando estadísticas
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Estadísticas y Análisis
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visualización de datos del personal y control de ausentismo
        </p>
      </div>

      {/* Selector de Período */}
      <div className="mb-6 flex justify-end">
        <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {(['mes', 'trimestre', 'año'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Personal</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsPersonal.total}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Personal Activo</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsPersonal.activos}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            {statsFaltas.total > 50 && <TrendingDown className="h-5 w-5 text-red-500" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Faltas ({selectedPeriod})</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsFaltas.total}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasa de Ausentismo</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsFaltas.tasaAusentismo}%</p>
        </div>
      </div>

      {/* SECCIÓN: PERSONAL */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Distribución de Personal
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico: Personal por Rol */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Personal por Rol
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statsPersonal.porRol}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statsPersonal.porRol.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico: Personal por Turno */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Personal por Turno
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsPersonal.porTurno}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill={COLORS.green} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

{/* Gráfico: Personal por Horario */}
<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
    Distribución por Horario Laboral
  </h3>
  {!statsPersonal?.porHorario || statsPersonal.porHorario.length === 0 ? (
    <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No hay datos de horarios disponibles</p>
      </div>
    </div>
  ) : (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart 
        data={statsPersonal.porHorario}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          type="number" 
          stroke="#9CA3AF"
          label={{ 
            value: 'Cantidad', 
            position: 'insideBottom',
            offset: -10,
            fill: '#9CA3AF',
            style: { fontSize: '14px' }
          }}
        />
        <YAxis 
          type="category"
          dataKey="name" 
          width={150} 
          stroke="#9CA3AF"
          tick={{ fontSize: 14 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff'
          }}
          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
        />
        <Bar 
          dataKey="value" 
          fill={COLORS.blue} 
          radius={[0, 8, 8, 0]}
          label={{ position: 'right', fill: '#9CA3AF', fontSize: 12 }}
        />
      </BarChart>
    </ResponsiveContainer>
  )}
</div>
        </div>
      </div>

      {/* SECCIÓN: FALTAS */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Análisis de Ausentismo
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico: Faltas Justificadas vs Injustificadas */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Faltas Justificadas vs Injustificadas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Justificadas', value: statsFaltas.justificadas },
                    { name: 'Injustificadas', value: statsFaltas.injustificadas },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.green} />
                  <Cell fill={COLORS.red} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico: Faltas por Rol */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Faltas por Rol
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsFaltas.faltasPorRol}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill={COLORS.orange} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico: Tendencia de Faltas (últimos 6 meses) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tendencia de Faltas (Últimos 6 Meses)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={statsFaltas.faltasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cantidad" 
                  stroke={COLORS.red} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.red, r: 6 }}
                  activeDot={{ r: 8 }}
                  name="Faltas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 Empleados con más Faltas */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top 10 - Empleados con Mayor Ausentismo
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                      Posición
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                      Empleado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                      Faltas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                      Nivel
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {statsFaltas.topFaltas.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900 dark:text-white">
                        {item.value}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.value >= 5 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : item.value >= 3 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {item.value >= 5 ? 'Crítico' : item.value >= 3 ? 'Moderado' : 'Bajo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}