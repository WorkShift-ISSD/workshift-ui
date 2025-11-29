'use client';

import { useState, useMemo } from 'react';
import { useEmpleados } from '@/hooks/useEmpleados';
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  BarChart3,
  FileBarChart,
  Search,
  X,
  ChevronDown,
  UserX,
  CheckCircle,
  XCircle,
} from 'lucide-react';
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

type Rol = 'SUPERVISOR' | 'INSPECTOR' | 'JEFE' | 'ADMINISTRADOR';
type GrupoTurno = 'A' | 'B';
type TipoInforme = 'asistencia' | 'ausentismo' | 'comparativo' | 'individual';

export default function InformesPage() {
  const { empleados, isLoading: loadingEmpleados } = useEmpleados();
  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();

  // Estados para filtros
  const [tipoInforme, setTipoInforme] = useState<TipoInforme>('asistencia');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>('TODOS');
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | 'TODOS'>('TODOS');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<GrupoTurno | 'TODOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  // Colores para gráficos
  const COLORS = {
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    orange: '#F97316',
  };

  // Empleados filtrados
  const empleadosFiltrados = useMemo(() => {
    if (!empleados) return [];
    let filtrados = [...empleados];

    if (empleadoSeleccionado !== 'TODOS') {
      filtrados = filtrados.filter(e => e.id === empleadoSeleccionado);
    }

    if (rolSeleccionado !== 'TODOS') {
      filtrados = filtrados.filter(e => e.rol === rolSeleccionado);
    }

    if (turnoSeleccionado !== 'TODOS') {
      filtrados = filtrados.filter(e => e.grupoTurno === turnoSeleccionado);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(e =>
        e.nombre.toLowerCase().includes(term) ||
        e.apellido.toLowerCase().includes(term) ||
        e.legajo.toString().includes(term)
      );
    }

    return filtrados;
  }, [empleados, empleadoSeleccionado, rolSeleccionado, turnoSeleccionado, searchTerm]);

  // Faltas filtradas por fecha
  const faltasFiltradas = useMemo(() => {
    if (!faltas) return [];
    return faltas.filter(f => {
      const fecha = new Date(f.fecha);
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      return fecha >= inicio && fecha <= fin;
    });
  }, [faltas, fechaInicio, fechaFin]);

  // Datos para informe de asistencia
  const datosAsistencia = useMemo(() => {
    const empleadosIds = empleadosFiltrados.map(e => e.id);
    const faltasDelPeriodo = faltasFiltradas.filter(f => empleadosIds.includes(f.empleadoId));

    const diasEnPeriodo = Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24));

    const porEmpleado = empleadosFiltrados.map(emp => {
      const faltasEmp = faltasDelPeriodo.filter(f => f.empleadoId === emp.id);
      const diasTrabajados = diasEnPeriodo - faltasEmp.length;
      const porcentajeAsistencia = ((diasTrabajados / diasEnPeriodo) * 100).toFixed(1);

      return {
        id: emp.id,
        nombre: `${emp.apellido}, ${emp.nombre}`,
        legajo: emp.legajo,
        rol: emp.rol,
        turno: emp.grupoTurno,
        faltas: faltasEmp.length,
        faltasJustificadas: faltasEmp.filter(f => f.justificada).length,
        faltasInjustificadas: faltasEmp.filter(f => !f.justificada).length,
        diasTrabajados,
        porcentajeAsistencia: parseFloat(porcentajeAsistencia),
      };
    }).sort((a, b) => b.porcentajeAsistencia - a.porcentajeAsistencia);

    return porEmpleado;
  }, [empleadosFiltrados, faltasFiltradas, fechaInicio, fechaFin]);

  // Datos para informe de ausentismo
  const datosAusentismo = useMemo(() => {
    const porRol = empleadosFiltrados.reduce((acc, emp) => {
      const faltasEmp = faltasFiltradas.filter(f => f.empleadoId === emp.id).length;
      if (!acc[emp.rol]) {
        acc[emp.rol] = { faltas: 0, empleados: 0 };
      }
      acc[emp.rol].faltas += faltasEmp;
      acc[emp.rol].empleados += 1;
      return acc;
    }, {} as Record<string, { faltas: number; empleados: number }>);

    const porTurno = empleadosFiltrados.reduce((acc, emp) => {
      const faltasEmp = faltasFiltradas.filter(f => f.empleadoId === emp.id).length;
      if (!acc[emp.grupoTurno]) {
        acc[emp.grupoTurno] = { faltas: 0, empleados: 0 };
      }
      acc[emp.grupoTurno].faltas += faltasEmp;
      acc[emp.grupoTurno].empleados += 1;
      return acc;
    }, {} as Record<string, { faltas: number; empleados: number }>);

    return {
      porRol: Object.entries(porRol).map(([rol, data]) => ({
        rol,
        promedio: (data.faltas / data.empleados).toFixed(2),
        total: data.faltas,
      })),
      porTurno: Object.entries(porTurno).map(([turno, data]) => ({
        turno,
        promedio: (data.faltas / data.empleados).toFixed(2),
        total: data.faltas,
      })),
    };
  }, [empleadosFiltrados, faltasFiltradas]);

  // Datos comparativos
  const datosComparativos = useMemo(() => {
    const grupoA = empleadosFiltrados.filter(e => e.grupoTurno === 'A');
    const grupoB = empleadosFiltrados.filter(e => e.grupoTurno === 'B');

    const faltasA = faltasFiltradas.filter(f => grupoA.some(e => e.id === f.empleadoId)).length;
    const faltasB = faltasFiltradas.filter(f => grupoB.some(e => e.id === f.empleadoId)).length;

    const justificadasA = faltasFiltradas.filter(f => 
      grupoA.some(e => e.id === f.empleadoId) && f.justificada
    ).length;
    const justificadasB = faltasFiltradas.filter(f => 
      grupoB.some(e => e.id === f.empleadoId) && f.justificada
    ).length;

    return {
      comparacion: [
        { grupo: 'Grupo A', empleados: grupoA.length, faltas: faltasA, justificadas: justificadasA },
        { grupo: 'Grupo B', empleados: grupoB.length, faltas: faltasB, justificadas: justificadasB },
      ],
      porRol: {
        A: grupoA.reduce((acc, e) => {
          acc[e.rol] = (acc[e.rol] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        B: grupoB.reduce((acc, e) => {
          acc[e.rol] = (acc[e.rol] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }
    };
  }, [empleadosFiltrados, faltasFiltradas]);

  // Estadísticas generales
  const estadisticas = useMemo(() => {
    const totalEmpleados = empleadosFiltrados.length;
    const totalFaltas = faltasFiltradas.filter(f => 
      empleadosFiltrados.some(e => e.id === f.empleadoId)
    ).length;
    const justificadas = faltasFiltradas.filter(f => 
      empleadosFiltrados.some(e => e.id === f.empleadoId) && f.justificada
    ).length;
    const injustificadas = totalFaltas - justificadas;

    const diasEnPeriodo = Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24));
    const tasaAusentismo = totalEmpleados > 0 
      ? ((totalFaltas / (totalEmpleados * diasEnPeriodo)) * 100).toFixed(2)
      : '0.00';

    return {
      totalEmpleados,
      totalFaltas,
      justificadas,
      injustificadas,
      tasaAusentismo,
      promedioFaltasPorEmpleado: totalEmpleados > 0 
        ? (totalFaltas / totalEmpleados).toFixed(2)
        : '0.00',
    };
  }, [empleadosFiltrados, faltasFiltradas, fechaInicio, fechaFin]);

  // Función para exportar (placeholder)
  const handleExport = () => {
    alert('Funcionalidad de exportación en desarrollo');
  };

  if (loadingEmpleados || loadingFaltas) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <p className="text-gray-600 dark:text-gray-400 mt-4">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Informes y Reportes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Análisis detallado de asistencia, ausentismo y rendimiento del personal
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="h-5 w-5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Selector de Tipo de Informe */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { tipo: 'asistencia' as TipoInforme, label: 'Asistencia', icon: CheckCircle, color: 'blue' },
          { tipo: 'ausentismo' as TipoInforme, label: 'Ausentismo', icon: UserX, color: 'red' },
          { tipo: 'comparativo' as TipoInforme, label: 'Comparativo', icon: BarChart3, color: 'purple' },
          { tipo: 'individual' as TipoInforme, label: 'Individual', icon: FileBarChart, color: 'green' },
        ].map(({ tipo, label, icon: Icon, color }) => (
          <button
            key={tipo}
            onClick={() => setTipoInforme(tipo)}
            className={`p-4 rounded-lg border-2 transition-all ${
              tipoInforme === tipo
                ? `border-${color}-600 bg-${color}-50 dark:bg-${color}-900/20`
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${
                tipoInforme === tipo ? `text-${color}-600` : 'text-gray-400'
              }`} />
              <span className={`font-semibold ${
                tipoInforme === tipo ? `text-${color}-900 dark:text-${color}-100` : 'text-gray-700 dark:text-gray-300'
              }`}>
                {label}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Panel de Filtros */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900 dark:text-white">Filtros</span>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
        </button>

        {mostrarFiltros && (
          <div className="px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
            {/* Búsqueda */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o legajo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Fecha Inicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Fecha Fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rol
                </label>
                <select
                  value={rolSeleccionado}
                  onChange={(e) => setRolSeleccionado(e.target.value as Rol | 'TODOS')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="TODOS">Todos los roles</option>
                  <option value="JEFE">Jefe</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="INSPECTOR">Inspector</option>
                </select>
              </div>

              {/* Turno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Grupo Turno
                </label>
                <select
                  value={turnoSeleccionado}
                  onChange={(e) => setTurnoSeleccionado(e.target.value as GrupoTurno | 'TODOS')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="TODOS">Todos los turnos</option>
                  <option value="A">Grupo A</option>
                  <option value="B">Grupo B</option>
                </select>
              </div>

              {/* Empleado Individual */}
              {tipoInforme === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Empleado
                  </label>
                  <select
                    value={empleadoSeleccionado}
                    onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="TODOS">Seleccionar empleado</option>
                    {empleados?.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre} - Leg. {emp.legajo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cards de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Empleados</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.totalEmpleados}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Faltas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.totalFaltas}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Justificadas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.justificadas}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tasa Ausentismo</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.tasaAusentismo}%</p>
        </div>
      </div>

      {/* Contenido según tipo de informe */}
      {tipoInforme === 'asistencia' && (
        <div className="space-y-6">
          {/* Tabla de Asistencia */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Registro de Asistencia por Empleado
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Legajo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Empleado</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Rol</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Turno</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Faltas</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Justif.</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Injustif.</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">% Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {datosAsistencia.map((dato) => (
                    <tr key={dato.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{dato.legajo}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{dato.nombre}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                          {dato.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                          {dato.turno}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{dato.faltas}</td>
                      <td className="px-6 py-4 text-center text-sm text-green-600 dark:text-green-400">{dato.faltasJustificadas}</td>
                      <td className="px-6 py-4 text-center text-sm text-red-600 dark:text-red-400">{dato.faltasInjustificadas}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-semibold ${
                          dato.porcentajeAsistencia >= 95 ? 'text-green-600' :
                          dato.porcentajeAsistencia >= 90 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {dato.porcentajeAsistencia}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico Top 10 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top 10 - Mayor Asistencia
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={datosAsistencia.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Bar dataKey="porcentajeAsistencia" fill={COLORS.green} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tipoInforme === 'ausentismo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ausentismo por Rol */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ausentismo por Rol
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosAusentismo.porRol}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="rol" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
                <Bar dataKey="promedio" fill={COLORS.orange} name="Promedio Faltas" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ausentismo por Turno */}
<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
    Ausentismo por Grupo Turno
  </h3>
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={datosAusentismo.porTurno.map(item => ({
          name: item.turno,
          value: parseInt(item.total.toString()),
          promedio: item.promedio
        }))}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, promedio }: any) => `${name}: ${promedio}`}
        outerRadius={100}
        fill="#8884d8"
        dataKey="value"
      >
        <Cell fill={COLORS.green} />
        <Cell fill={COLORS.blue} />
      </Pie>
      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
    </PieChart>
  </ResponsiveContainer>
</div>

          {/* Tabla Resumen por Rol */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resumen de Ausentismo
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Rol</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Total Faltas</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Promedio por Empleado</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Nivel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {datosAusentismo.porRol.map((dato) => (
                    <tr key={dato.rol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{dato.rol}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{dato.total}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{dato.promedio}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          parseFloat(dato.promedio) >= 5 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : parseFloat(dato.promedio) >= 3 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {parseFloat(dato.promedio) >= 5 ? 'Crítico' : parseFloat(dato.promedio) >= 3 ? 'Moderado' : 'Bajo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tipoInforme === 'comparativo' && (
        <div className="space-y-6">
          {/* Comparación Grupos A y B */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Comparación entre Grupos
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={datosComparativos.comparacion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="grupo" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
                <Bar dataKey="empleados" fill={COLORS.blue} name="Empleados" radius={[8, 8, 0, 0]} />
                <Bar dataKey="faltas" fill={COLORS.red} name="Faltas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="justificadas" fill={COLORS.green} name="Justificadas" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución de Roles por Grupo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Distribución de Roles - Grupo A
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(datosComparativos.porRol.A).map(([rol, count]) => ({ name: rol, value: count }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(datosComparativos.porRol.A).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={[COLORS.blue, COLORS.green, COLORS.yellow, COLORS.purple][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Distribución de Roles - Grupo B
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(datosComparativos.porRol.B).map(([rol, count]) => ({ name: rol, value: count }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(datosComparativos.porRol.B).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={[COLORS.blue, COLORS.green, COLORS.yellow, COLORS.purple][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tipoInforme === 'individual' && (
        <div className="space-y-6">
          {empleadoSeleccionado === 'TODOS' ? (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
              <AlertCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecciona un Empleado
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Elige un empleado de los filtros para ver su informe detallado
              </p>
            </div>
          ) : (
            <>
              {/* Información del Empleado Seleccionado */}
              {(() => {
                const empleado = empleados?.find(e => e.id === empleadoSeleccionado);
                const datosEmp = datosAsistencia.find(d => d.id === empleadoSeleccionado);
                
                if (!empleado || !datosEmp) return null;

                return (
                  <>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {empleado.apellido}, {empleado.nombre}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Legajo: {empleado.legajo} | {empleado.rol} | Grupo {empleado.grupoTurno}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Asistencia</p>
                          <p className={`text-3xl font-bold ${
                            datosEmp.porcentajeAsistencia >= 95 ? 'text-green-600' :
                            datosEmp.porcentajeAsistencia >= 90 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {datosEmp.porcentajeAsistencia}%
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Faltas</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{datosEmp.faltas}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Justificadas</p>
                          <p className="text-2xl font-bold text-green-600">{datosEmp.faltasJustificadas}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Injustificadas</p>
                          <p className="text-2xl font-bold text-red-600">{datosEmp.faltasInjustificadas}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Días Trabajados</p>
                          <p className="text-2xl font-bold text-blue-600">{datosEmp.diasTrabajados}</p>
                        </div>
                      </div>
                    </div>

                    {/* Detalle de Faltas */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Detalle de Faltas en el Período
                      </h3>
                      {faltasFiltradas.filter(f => f.empleadoId === empleadoSeleccionado).length === 0 ? (
                        <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                          No hay faltas registradas en este período
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Motivo</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Observaciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {faltasFiltradas
                                .filter(f => f.empleadoId === empleadoSeleccionado)
                                .map((falta) => (
                                  <tr key={falta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                      {new Date(falta.fecha).toLocaleDateString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{falta.causa}</td>
                                    <td className="px-6 py-4 text-center">
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        falta.justificada
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      }`}>
                                        {falta.justificada ? 'Justificada' : 'Injustificada'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                      {falta.observaciones || '-'}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
