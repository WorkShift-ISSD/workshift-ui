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
  RefreshCw,
  Shield,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useSanciones } from '@/hooks/useSanciones';
import { useLicencias } from '@/hooks/useLicencias';
import { useCambios } from '@/hooks/useCambios';

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

interface DatoConProyeccion {
  periodo: string;
  cantidad: number;
  esProyeccion: boolean;
  esIncompleto?: boolean;
}

// Ordenar Horario
function ordenarHorarios(arr: { name: string; value: number }[]) {
  return [...arr].sort((a, b) => {
    const inicioA = a.name.split('-')[0];
    const inicioB = b.name.split('-')[0];

    // Convertir a minutos para comparar
    const minutosA = parseInt(inicioA.split(':')[0]) * 60 + parseInt(inicioA.split(':')[1]);
    const minutosB = parseInt(inicioB.split(':')[0]) * 60 + parseInt(inicioB.split(':')[1]);

    return minutosA - minutosB;
  });
}

function calcularProyeccion(datos: { periodo: string; cantidad: number; esIncompleto?: boolean }[]): {
  proyecciones: DatoConProyeccion[];
  tendencia: 'creciente' | 'decreciente' | 'estable';
} | null {
  // Filtrar solo datos completos para la proyección
  const datosCompletos = datos.filter(d => !d.esIncompleto);
  const n = datosCompletos.length;

  if (n < 2) return null;

  const sumX = datosCompletos.reduce((sum, _, i) => sum + i, 0);
  const sumY = datosCompletos.reduce((sum, d) => sum + d.cantidad, 0);
  const sumXY = datosCompletos.reduce((sum, d, i) => sum + (i * d.cantidad), 0);
  const sumX2 = datosCompletos.reduce((sum, _, i) => sum + (i * i), 0);

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercepto = (sumY - pendiente * sumX) / n;

  // Proyectar los próximos 3 períodos
  const proyecciones: DatoConProyeccion[] = [];
  for (let i = 1; i <= 3; i++) {
    const valorProyectado = Math.max(0, Math.round(pendiente * (n + i - 1) + intercepto));
    proyecciones.push({
      periodo: `+${i}`,
      cantidad: valorProyectado,
      esProyeccion: true
    });
  }

  return {
    proyecciones,
    tendencia: pendiente > 0.5 ? 'creciente' : pendiente < -0.5 ? 'decreciente' : 'estable'
  };
}
// Componente personalizado para tooltips de PieChart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const color = data.payload.fill || data.fill;
    return (
      <div className="bg-gray-800 dark:bg-gray-700 border border-gray-600 dark:border-gray-500 rounded-lg shadow-lg px-3 py-2">
        <p className="text-white font-semibold">{data.name}</p>
        <p className="font-bold" style={{ color: color }}>{data.value}</p>
      </div>
    );
  }
  return null;
};

// Componente personalizado para tooltips de BarChart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 dark:bg-gray-700 border border-gray-600 dark:border-gray-500 rounded-lg shadow-lg px-3 py-2">
        <p className="text-white font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white">
            <span style={{ color: entry.color }}>{entry.name}:</span> <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};


export default function EstadisticasPage() {
  const { empleados, isLoading: loadingEmpleados } = useEmpleados();
  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();
  const { sanciones, loading: loadingSanciones } = useSanciones();
  const { licencias, loading: loadingLicencias } = useLicencias();
  const { cambios, isLoading: loadingCambios } = useCambios();

  const [selectedPeriod, setSelectedPeriod] = useState<'mes' | 'trimestre' | 'año'>('mes');

  const [hoveredEmpleado, setHoveredEmpleado] = useState<{
    empleadoId: string;
    x: number;
    y: number;
  } | null>(null);

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


    // Por horario - INSPECTORES
    const porHorarioInspectores = empleadosFiltrados
      .filter(e => e.rol === 'INSPECTOR')
      .reduce((acc, emp) => {
        const horario = emp.horario || 'Sin asignar';
        acc[horario] = (acc[horario] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Por horario - SUPERVISORES
    const porHorarioSupervisores = empleadosFiltrados
      .filter(e => e.rol === 'SUPERVISOR')
      .reduce((acc, emp) => {
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
      porHorarioInspectores: Object.entries(porHorarioInspectores)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      porHorarioSupervisores: Object.entries(porHorarioSupervisores)
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

    // Faltas por empleado con detalle de causas
    const faltasPorEmpleadoDetalle = faltasFiltradas.reduce((acc, f) => {
      if (!acc[f.empleadoId]) {
        acc[f.empleadoId] = {
          total: 0,
          causas: {} as Record<string, number>
        };
      }
      acc[f.empleadoId].total += 1;
      acc[f.empleadoId].causas[f.motivo] = (acc[f.empleadoId].causas[f.motivo] || 0) + 1;
      return acc;
    }, {} as Record<string, { total: number; causas: Record<string, number> }>);

    const topFaltasConDetalle = Object.entries(faltasPorEmpleado)
      .map(([empleadoId, cantidad]) => {
        const emp = empleadosFiltrados.find(e => e.id === empleadoId);
        const detalle = faltasPorEmpleadoDetalle[empleadoId];
        return {
          empleadoId,
          name: emp ? `${emp.apellido}, ${emp.nombre}` : 'Desconocido',
          value: cantidad,
          causas: detalle ? Object.entries(detalle.causas).map(([motivo, cant]) => ({
            motivo,
            cantidad: cant
          })).sort((a, b) => b.cantidad - a.cantidad) : []
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Faltas por período (dinámico según selección)
    let faltasPorPeriodo = [];

    if (selectedPeriod === 'mes') {
      // Últimos 30 días - estos están completos, no necesitan ajuste
      for (let i = 29; i >= 0; i--) {
        const fecha = new Date(now);
        fecha.setDate(fecha.getDate() - i);
        const dia = fecha.getDate();
        const cantidad = faltasFiltradas.filter(f => {
          const fechaFalta = new Date(f.fecha);
          return fechaFalta.toDateString() === fecha.toDateString();
        }).length;
        faltasPorPeriodo.push({ periodo: `${dia}`, cantidad });
      }
    } else if (selectedPeriod === 'trimestre') {
      // Últimas 12 semanas
      for (let i = 11; i >= 0; i--) {
        const inicioSemana = new Date(now);
        inicioSemana.setDate(inicioSemana.getDate() - (i * 7));

        const finSemana = new Date(inicioSemana);
        finSemana.setDate(finSemana.getDate() + 6);

        const semanaCompleta = finSemana < now;
        const semana = `S${12 - i}`;

        const cantidad = faltas.filter(f => {
          const fechaFalta = new Date(f.fecha);
          const esEmpleadoValido = empleadosFiltrados.some(e => e.id === f.empleadoId);

          // Verificar si la falta está entre inicio y fin de esta semana
          return esEmpleadoValido &&
            fechaFalta >= inicioSemana &&
            fechaFalta <= finSemana;
        }).length;

        // Si la semana no está completa, proyectar proporcionalmente
        let cantidadAjustada = cantidad;
        if (!semanaCompleta && i === 0) {
          const diasTranscurridos = Math.ceil((now.getTime() - inicioSemana.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          if (diasTranscurridos > 0 && diasTranscurridos < 7) {
            cantidadAjustada = Math.round((cantidad / diasTranscurridos) * 7);
          }
        }

        faltasPorPeriodo.push({
          periodo: semana,
          cantidad: cantidadAjustada,
          esIncompleto: !semanaCompleta && i === 0
        });
      }
    } else {
      // Últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const fecha = new Date(añoActual, mesActual - i, 1);
        const mes = fecha.toLocaleDateString('es-AR', { month: 'short' });

        // Verificar si es el mes actual (incompleto)
        const esMesActual = fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;

        const cantidad = faltas.filter(f => {
          const fechaFalta = new Date(f.fecha);
          const esEmpleadoValido = empleadosFiltrados.some(e => e.id === f.empleadoId);
          return esEmpleadoValido &&
            fechaFalta.getMonth() === fecha.getMonth() &&
            fechaFalta.getFullYear() === fecha.getFullYear();
        }).length;

        // Si es el mes actual, ajustar proporcionalmente
        let cantidadAjustada = cantidad;
        if (esMesActual) {
          const diaActual = now.getDate();
          const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
          cantidadAjustada = Math.round((cantidad / diaActual) * diasEnMes);
        }

        faltasPorPeriodo.push({
          periodo: mes,
          cantidad: cantidadAjustada,
          esIncompleto: esMesActual
        });
      }
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

    // Faltas por día de la semana
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const faltasPorDiaSemana = diasSemana.map((dia, index) => ({
      dia,
      cantidad: faltasFiltradas.filter(f => {
        const fechaFalta = new Date(f.fecha);
        return fechaFalta.getDay() === index;
      }).length
    }));

    // Proyección de faltas
    const proyeccion = calcularProyeccion(faltasPorPeriodo);
    const datosConProyeccion = proyeccion
      ? [...faltasPorPeriodo.map(d => ({ ...d, esProyeccion: false })), ...proyeccion.proyecciones]
      : faltasPorPeriodo.map(d => ({ ...d, esProyeccion: false }));

    // Comparativa: Período actual vs período anterior
    let comparativaPeriodos = {
      actual: 0,
      anterior: 0,
      porcentajeCambio: 0,
      mejoro: false
    };

    if (selectedPeriod === 'mes') {
      // Mes actual vs mes anterior
      const mesAnterior = new Date(añoActual, mesActual - 1, 1);

      comparativaPeriodos.actual = faltasFiltradas.length;
      comparativaPeriodos.anterior = faltas.filter(f => {
        const fechaFalta = new Date(f.fecha);
        const esEmpleadoValido = empleadosFiltrados.some(e => e.id === f.empleadoId);
        return esEmpleadoValido &&
          fechaFalta.getMonth() === mesAnterior.getMonth() &&
          fechaFalta.getFullYear() === mesAnterior.getFullYear();
      }).length;
    } else if (selectedPeriod === 'trimestre') {
      // Trimestre actual vs trimestre anterior
      const trimestreActual = Math.floor(mesActual / 3);
      const trimestreAnterior = trimestreActual - 1;
      const añoTrimestreAnterior = trimestreAnterior < 0 ? añoActual - 1 : añoActual;
      const trimestreAnteriorAjustado = trimestreAnterior < 0 ? 3 : trimestreAnterior;

      comparativaPeriodos.actual = faltasFiltradas.length;
      comparativaPeriodos.anterior = faltas.filter(f => {
        const fechaFalta = new Date(f.fecha);
        const esEmpleadoValido = empleadosFiltrados.some(e => e.id === f.empleadoId);
        const trimestreFalta = Math.floor(fechaFalta.getMonth() / 3);
        return esEmpleadoValido &&
          trimestreFalta === trimestreAnteriorAjustado &&
          fechaFalta.getFullYear() === añoTrimestreAnterior;
      }).length;
    } else {
      // Año actual vs año anterior
      comparativaPeriodos.actual = faltasFiltradas.length;
      comparativaPeriodos.anterior = faltas.filter(f => {
        const fechaFalta = new Date(f.fecha);
        const esEmpleadoValido = empleadosFiltrados.some(e => e.id === f.empleadoId);
        return esEmpleadoValido && fechaFalta.getFullYear() === añoActual - 1;
      }).length;
    }

    // Calcular porcentaje de cambio
    if (comparativaPeriodos.anterior > 0) {
      comparativaPeriodos.porcentajeCambio =
        ((comparativaPeriodos.actual - comparativaPeriodos.anterior) / comparativaPeriodos.anterior) * 100;
      comparativaPeriodos.mejoro = comparativaPeriodos.porcentajeCambio < 0;
    } else if (comparativaPeriodos.actual === 0) {
      comparativaPeriodos.porcentajeCambio = 0;
      comparativaPeriodos.mejoro = true;
    } else {
      comparativaPeriodos.porcentajeCambio = 100;
      comparativaPeriodos.mejoro = false;
    }

    return {
      total: totalFaltas,
      justificadas,
      injustificadas,
      faltasPorPeriodo: faltasPorPeriodo,
      faltasPorRol: Object.entries(faltasPorRol).map(([name, value]) => ({ name, value })),
      faltasPorTurno: Object.entries(faltasPorTurno).map(([name, value]) => ({ name, value })),
      faltasPorDiaSemana,
      datosConProyeccion,
      comparativaPeriodos,
      topFaltas: topFaltasConDetalle,
      tendenciaProyeccion: proyeccion?.tendencia || 'estable',
      tasaAusentismo: ((totalFaltas / (empleadosFiltrados.length * 30)) * 100).toFixed(2),
    };
  }, [faltas, empleados, selectedPeriod]);

  // ============ ESTADÍSTICAS DE CAMBIOS ============
  const statsCambios = useMemo(() => {
    if (!cambios) return null;
    const now = new Date();
    const mesActual = now.getMonth();
    const añoActual = now.getFullYear();

    const filtrados = cambios.filter(c => {
      const fecha = new Date(c.createdAt);
      if (selectedPeriod === 'mes') return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
      if (selectedPeriod === 'trimestre') return Math.floor(fecha.getMonth() / 3) === Math.floor(mesActual / 3) && fecha.getFullYear() === añoActual;
      return fecha.getFullYear() === añoActual;
    });

    const porEstado = filtrados.reduce((acc, c) => { acc[c.estado] = (acc[c.estado] || 0) + 1; return acc; }, {} as Record<string, number>);
    const porTipo = filtrados.reduce((acc, c) => { const t = c.tipoCambio || 'Sin tipo'; acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
    const porEmpleado = filtrados.reduce((acc, c) => {
      const n = `${c.solicitante.apellido}, ${c.solicitante.nombre}`;
      acc[n] = (acc[n] || 0) + 1; return acc;
    }, {} as Record<string, number>);

    return {
      total: filtrados.length,
      aprobados: porEstado['APROBADO'] || 0,
      rechazados: porEstado['RECHAZADO'] || 0,
      pendientes: porEstado['PENDIENTE'] || 0,
      realizados: porEstado['REALIZADO'] || 0,
      pieEstado: [
        { name: 'Aprobados', value: porEstado['APROBADO'] || 0, fill: '#10B981' },
        { name: 'Rechazados', value: porEstado['RECHAZADO'] || 0, fill: '#EF4444' },
        { name: 'Pendientes', value: porEstado['PENDIENTE'] || 0, fill: '#F59E0B' },
        { name: 'Realizados', value: porEstado['REALIZADO'] || 0, fill: '#3B82F6' },
      ].filter(d => d.value > 0),
      porTipo: Object.entries(porTipo).map(([name, value]) => ({ name, value })),
      topEmpleados: Object.entries(porEmpleado).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total).slice(0, 5),
    };
  }, [cambios, selectedPeriod]);

  // ============ ESTADÍSTICAS DE SANCIONES ============
  const statsSanciones = useMemo(() => {
    if (!sanciones) return null;
    const now = new Date();
    const mesActual = now.getMonth();
    const añoActual = now.getFullYear();

    const filtradas = sanciones.filter(s => {
      if (!s.created_at) return true;
      const fecha = new Date(s.created_at);
      if (selectedPeriod === 'mes') return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
      if (selectedPeriod === 'trimestre') return Math.floor(fecha.getMonth() / 3) === Math.floor(mesActual / 3) && fecha.getFullYear() === añoActual;
      return fecha.getFullYear() === añoActual;
    });

    const porEstado = filtradas.reduce((acc, s) => { acc[s.estado] = (acc[s.estado] || 0) + 1; return acc; }, {} as Record<string, number>);
    const porEmpleado = filtradas.reduce((acc, s) => {
      const n = s.empleado ? `${s.empleado.apellido}, ${s.empleado.nombre}` : s.empleado_id;
      acc[n] = (acc[n] || 0) + 1; return acc;
    }, {} as Record<string, number>);

    return {
      total: filtradas.length,
      activas: porEstado['ACTIVA'] || 0,
      finalizadas: porEstado['FINALIZADA'] || 0,
      anuladas: porEstado['ANULADA'] || 0,
      pieData: [
        { name: 'Activas', value: porEstado['ACTIVA'] || 0, fill: '#EF4444' },
        { name: 'Finalizadas', value: porEstado['FINALIZADA'] || 0, fill: '#10B981' },
        { name: 'Anuladas', value: porEstado['ANULADA'] || 0, fill: '#6B7280' },
      ].filter(d => d.value > 0),
      topEmpleados: Object.entries(porEmpleado).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total).slice(0, 5),
    };
  }, [sanciones, selectedPeriod]);

  // ============ ESTADÍSTICAS DE LICENCIAS ============
  const statsLicencias = useMemo(() => {
    if (!licencias) return null;
    const TIPO_LABEL: Record<string, string> = { ORDINARIA: 'Ordinaria', ESPECIAL: 'Especial', MEDICA: 'Médica', ESTUDIO: 'Estudio', SIN_GOCE: 'Sin goce' };
    const now = new Date();
    const mesActual = now.getMonth();
    const añoActual = now.getFullYear();

    const filtradas = licencias.filter(l => {
      if (!l.created_at) return true;
      const fecha = new Date(l.created_at);
      if (selectedPeriod === 'mes') return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
      if (selectedPeriod === 'trimestre') return Math.floor(fecha.getMonth() / 3) === Math.floor(mesActual / 3) && fecha.getFullYear() === añoActual;
      return fecha.getFullYear() === añoActual;
    });

    const diasTotal = filtradas.reduce((acc, l) => acc + (l.dias ?? 0), 0);
    const porTipo = filtradas.reduce((acc, l) => { const t = TIPO_LABEL[l.tipo] ?? l.tipo; acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
    const porEstado = filtradas.reduce((acc, l) => { acc[l.estado] = (acc[l.estado] || 0) + 1; return acc; }, {} as Record<string, number>);

    return {
      total: filtradas.length,
      activas: porEstado['ACTIVA'] || 0,
      pendientes: porEstado['PENDIENTE'] || 0,
      diasTotal,
      porTipo: Object.entries(porTipo).map(([name, value]) => ({ name, value })),
      pieEstado: [
        { name: 'Activas', value: porEstado['ACTIVA'] || 0, fill: '#10B981' },
        { name: 'Pendientes', value: porEstado['PENDIENTE'] || 0, fill: '#F59E0B' },
        { name: 'Aprobadas', value: porEstado['APROBADA'] || 0, fill: '#3B82F6' },
        { name: 'Finalizadas', value: porEstado['FINALIZADA'] || 0, fill: '#6B7280' },
        { name: 'Rechazadas', value: porEstado['RECHAZADA'] || 0, fill: '#EF4444' },
      ].filter(d => d.value > 0),
    };
  }, [licencias, selectedPeriod]);

  // ============ COLORES ============
  const COLORS = {
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    orange: '#F97316',
    cyan: '#06b6d4ff',
    pink: '#EC4899',
  };

  const PIE_COLORS = [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.red, COLORS.purple, COLORS.orange];

  if (loadingEmpleados || loadingFaltas || loadingSanciones || loadingLicencias || loadingCambios) {
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

      {/* Selector de Período - mobile inline */}
      <div className="mb-6 flex justify-center md:hidden">
        <div className="inline-flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {(['mes', 'trimestre', 'año'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedPeriod === period
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de Período - desktop fixed */}
      <div className="hidden md:block">
        <div className="fixed right-16 top-24 z-50">
          <div className="inline-flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {(['mes', 'trimestre', 'año'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico: Personal por Turno */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Personal por Turno
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsPersonal.porTurno} style={{ backgroundColor: 'transparent' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
                <Bar dataKey="value" fill={COLORS.green} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráficos: Personal por Horario - Separados por Rol */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Inspectores - Distribución por Horario
            </h3>
            {!statsPersonal?.porHorarioInspectores || statsPersonal.porHorarioInspectores.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos de horarios para inspectores</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={ordenarHorarios(statsPersonal.porHorarioInspectores)}
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
                    width={120}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
                  <Bar
                    dataKey="value"
                    name="Inspectores"
                    fill={COLORS.green}
                    radius={[0, 8, 8, 0]}
                    label={{ position: 'right', fill: '#9CA3AF', fontSize: 12 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Gráfico: Supervisores */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Supervisores - Distribución por Horario
            </h3>
            {!statsPersonal?.porHorarioSupervisores || statsPersonal.porHorarioSupervisores.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos de horarios para supervisores</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={ordenarHorarios(statsPersonal.porHorarioSupervisores)}
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
                    width={120}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                  <Bar
                    dataKey="value"
                    name="Supervisores"
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
                <Tooltip content={<CustomPieTooltip />} />
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
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(246, 171, 59, 0.1)' }} />
                <Bar dataKey="value" name="Faltas" fill={COLORS.orange} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico: Faltas por Día de la Semana */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Faltas por Día de la Semana
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsFaltas.faltasPorDiaSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="dia" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(131, 59, 246, 0.1)' }} />
                <Bar dataKey="cantidad" name="Faltas" fill={COLORS.purple} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Día con más faltas: <span className="font-semibold text-gray-900 dark:text-white">
                  {statsFaltas.faltasPorDiaSemana.reduce((max, dia) =>
                    dia.cantidad > max.cantidad ? dia : max
                  ).dia}
                </span>
              </p>
            </div>
          </div>

          {/* Gráfico: Tendencia de Faltas */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tendencia de Faltas ({selectedPeriod === 'mes' ? 'Últimos 30 días' : selectedPeriod === 'trimestre' ? 'Últimas 12 semanas' : 'Últimos 12 meses'})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={statsFaltas.faltasPorPeriodo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="periodo" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#EF4444' }}
                  separator=": "
                  wrapperStyle={{ color: '#FFFFFF' }}
                  formatter={(value, name) => [<span style={{ color: '#FFF' }}>{value}</span>, name]}
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

          {/* Gráfico: Comparativa Período Actual vs Anterior */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Comparativa de Períodos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
<BarChart
  data={[
    {
      periodo: selectedPeriod === 'mes' ? 'Mes Anterior' :
        selectedPeriod === 'trimestre' ? 'Trimestre Anterior' :
          'Año Anterior',
      cantidad: statsFaltas.comparativaPeriodos.anterior,
      fill: COLORS.cyan
    },
    {
      periodo: selectedPeriod === 'mes' ? 'Mes Actual' :
        selectedPeriod === 'trimestre' ? 'Trimestre Actual' :
          'Año Actual',
      cantidad: statsFaltas.comparativaPeriodos.actual,
      fill: statsFaltas.comparativaPeriodos.mejoro ? COLORS.green : COLORS.red
    }
  ]}
>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="periodo" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
<Tooltip
  content={({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const entry = payload[0];
    const barColor = entry?.payload?.fill || '#10B981';

    return (
      <div className="bg-gray-800 dark:bg-gray-700 border border-gray-600 dark:border-gray-500 rounded-lg shadow-lg px-3 py-2">
        <p className="text-white font-semibold mb-1">{label}</p>
        <p className="text-white">
          <span style={{ color: barColor }}>Cantidad:</span>{' '}
          <span className="font-bold">{entry.value}</span>
        </p>
      </div>
    );
  }}
  cursor={{ fill: 'transparent' }}
/>
<Bar
  dataKey="cantidad"
  name="Cantidad"
  radius={[8, 8, 0, 0]}
>
  {[COLORS.cyan, statsFaltas.comparativaPeriodos.mejoro ? COLORS.green : COLORS.red].map((color, index) => (
    <Cell key={`cell-${index}`} fill={color} />
  ))}
</Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                {statsFaltas.comparativaPeriodos.mejoro ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Mejora del {Math.abs(statsFaltas.comparativaPeriodos.porcentajeCambio).toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      Incremento del {Math.abs(statsFaltas.comparativaPeriodos.porcentajeCambio).toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {statsFaltas.comparativaPeriodos.anterior} → {statsFaltas.comparativaPeriodos.actual} faltas
              </div>
            </div>
          </div>

          {/* Gráfico: Proyección de Faltas */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              Proyección de Faltas
              <span className={`text-xs px-2 py-1 rounded-full ${statsFaltas.tendenciaProyeccion === 'creciente'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : statsFaltas.tendenciaProyeccion === 'decreciente'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                Tendencia {statsFaltas.tendenciaProyeccion}
              </span>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={statsFaltas.datosConProyeccion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="periodo" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#EF4444' }}
                  separator=": "
                  formatter={(value: any, name: any, props: any) => {
                    if (props.payload.esIncompleto) {
                      return [<span style={{ color: '#FFF' }}>{value}</span>, 'Faltas (ajustado)'];
                    }
                    if (props.payload.esProyeccion) {
                      return [<span style={{ color: '#FFF' }}>{value}</span>, 'Proyección'];
                    }
                    return [<span style={{ color: '#FFF' }}>{value}</span>, 'Faltas'];
                  }}

                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cantidad"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.esIncompleto) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={COLORS.cyan}
                          stroke={COLORS.blue}
                          strokeWidth={2}
                          strokeDasharray="3 3"
                        />
                      );
                    }
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.esProyeccion ? 4 : 6}
                        fill={payload.esProyeccion ? COLORS.yellow : COLORS.blue}
                        stroke={payload.esProyeccion ? COLORS.orange : COLORS.blue}
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="Faltas"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-start gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Real</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-blue-500 border-dashed"></div>
                <span className="text-gray-600 dark:text-gray-400">Ajustado (incompleto)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-orange-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Proyección</span>
              </div>
            </div>
          </div>

          {/* Top 10 Empleados con más Faltas */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top 10 - Empleados con Mayor Ausentismo
            </h3>
            <div className="overflow-x-auto relative">
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
                    <tr
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onMouseMove={(e) => {
                        setHoveredEmpleado({
                          empleadoId: item.empleadoId,
                          x: e.clientX,
                          y: e.clientY
                        });
                      }}
                      onMouseLeave={() => setHoveredEmpleado(null)}
                    >
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
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.value >= 5
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

              {/* Tooltip flotante que sigue al mouse */}
              {hoveredEmpleado && statsFaltas.topFaltas.find(item => item.empleadoId === hoveredEmpleado.empleadoId) && (
                <div
                  className="fixed z-50 pointer-events-none"
                  style={{
                    left: `${hoveredEmpleado.x + 15}px`,
                    top: `${hoveredEmpleado.y + 15}px`
                  }}
                >
                  <div className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700 dark:border-gray-600 min-w-[250px]">
                    <p className="font-semibold text-sm mb-2 border-b border-gray-600 pb-2">
                      Causas de las faltas:
                    </p>
                    <div className="space-y-1">
                      {statsFaltas.topFaltas
                        .find(item => item.empleadoId === hoveredEmpleado.empleadoId)
                        ?.causas.map((causa, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-gray-300 truncate max-w-[180px]">
                              {causa.motivo}
                            </span>
                            <span className="font-bold text-blue-400 ml-2">
                              {causa.cantidad}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between text-xs">
                      <span className="text-gray-400">Total:</span>
                      <span className="font-bold text-white">
                        {statsFaltas.topFaltas.find(item => item.empleadoId === hoveredEmpleado.empleadoId)?.value}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 italic">
              💡 Pasa el mouse sobre cada empleado para ver el detalle de las causas
            </div>
          </div>




        </div>
      </div>


      {/* SECCIÓN: CAMBIOS DE TURNO */}
      {statsCambios && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Cambios de Turno
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total solicitudes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsCambios.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Aprobados</p>
              <p className="text-2xl font-bold text-green-600">{statsCambios.aprobados}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{statsCambios.pendientes}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rechazados</p>
              <p className="text-2xl font-bold text-red-600">{statsCambios.rechazados}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución por estado</h3>
              {statsCambios.pieEstado.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statsCambios.pieEstado} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {statsCambios.pieEstado.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-16">Sin datos para el período</p>}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top solicitantes</h3>
              {statsCambios.topEmpleados.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statsCambios.topEmpleados} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="nombre" type="category" stroke="#9CA3AF" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(59,130,246,0.1)' }} />
                    <Bar dataKey="total" name="Solicitudes" fill={COLORS.blue} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-16">Sin datos para el período</p>}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN: SANCIONES */}
      {statsSanciones && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Sanciones
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsSanciones.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Activas</p>
              <p className="text-2xl font-bold text-red-600">{statsSanciones.activas}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Finalizadas</p>
              <p className="text-2xl font-bold text-green-600">{statsSanciones.finalizadas}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por estado</h3>
              {statsSanciones.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statsSanciones.pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {statsSanciones.pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-16">Sin datos para el período</p>}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top empleados sancionados</h3>
              {statsSanciones.topEmpleados.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statsSanciones.topEmpleados} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="nombre" type="category" stroke="#9CA3AF" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(239,68,68,0.1)' }} />
                    <Bar dataKey="total" name="Sanciones" fill={COLORS.red} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-16">Sin datos para el período</p>}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN: LICENCIAS */}
      {statsLicencias && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Licencias
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsLicencias.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Activas</p>
              <p className="text-2xl font-bold text-green-600">{statsLicencias.activas}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{statsLicencias.pendientes}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Días totales</p>
              <p className="text-2xl font-bold text-purple-600">{statsLicencias.diasTotal}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por tipo de licencia</h3>
              {statsLicencias.porTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statsLicencias.porTipo} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(139,92,246,0.1)' }} />
                    <Bar dataKey="value" name="Licencias" fill={COLORS.purple} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-16">Sin datos para el período</p>}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por estado</h3>
              {statsLicencias.pieEstado.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statsLicencias.pieEstado} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''}>
                      {statsLicencias.pieEstado.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-16">Sin datos para el período</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}