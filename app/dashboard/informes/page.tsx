"use client";

import { useState, useEffect, useMemo } from "react";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useTodasLasFaltas } from "@/hooks/useFaltas";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { ExportInformes } from "@/app/components/ExportInformes";
import { CustomDatePicker } from "@/app/components/CustomDatePicker";
import { CustomTooltip } from "@/app/components/CustomTooltip";
import {
  calcularGrupoTrabaja,
  calcularDiasTrabajoEnRango,
  calcularPorcentajeAsistenciaReal,
} from "@/app/lib/turnosUtils";
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
  RefreshCw,
} from "lucide-react";
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
} from "recharts";

import { InformeCambiosTurno } from "@/app/components/informes/InformeCambiosTurno";
import { InformeSanciones } from "@/app/components/informes/InformeSanciones";
import { InformeLicencias } from "@/app/components/informes/InformeLicencias";
import { useAuth } from "@/app/context/AuthContext";
import { useLicencias } from "@/hooks/useLicencias";
import { useSanciones } from "@/hooks/useSanciones";
import { useCambios } from '@/hooks/useCambios';

type Rol = "SUPERVISOR" | "INSPECTOR";
type GrupoTurno = "A" | "B";
type TipoInforme =
  | "asistencia"
  | "ausentismo"
  | "comparativo"
  | "individual"
  | "cambios-turno"
  | "sanciones"
  | "licencias";

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

const ChartInfo = ({ text }: { text: string }) => (
  <div className="relative group inline-flex items-center ml-auto pl-3">
    <span className="px-1.5 h-5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs flex items-center justify-center cursor-help font-bold leading-none select-none">?</span>
    <div className="absolute z-50 bottom-full right-0 mb-2 w-64 p-2.5 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 text-left">
      {text}
      <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
    </div>
  </div>
);

export default function InformesPage() {
  const { user } = useAuth();
  const esJefe = user?.rol === "JEFE" || user?.rol === "ADMINISTRADOR";
  const { empleados, isLoading: loadingEmpleados } = useEmpleados();
  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();
  const { licencias } = useLicencias();
  const { sanciones } = useSanciones();
  const { cambios } = useCambios();

  // Data recibida desde InformeCambiosTurno para el export general
  const [cambiosTurnoExport, setCambiosTurnoExport] = useState<{
    data: any;
    filtros: { desde: string; hasta: string; empleadoId: string };
  } | null>(null);

const [sancionesExport, setSancionesExport] = useState<{
    data: any;
    filtros: { desde: string; hasta: string; empleadoId: string; estado: string };
  } | null>(null);

  const [licenciasExport, setLicenciasExport] = useState<{
    data: any;
    filtros: { desde: string; hasta: string; empleadoId: string; tipo: string };
  } | null>(null);

  // Estados para filtros
  const [tipoInforme, setTipoInforme] = useState<TipoInforme>("asistencia");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState<string>("TODOS");
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | "TODOS">(
    "TODOS",
  );
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<
    GrupoTurno | "TODOS"
  >("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [horarioSeleccionado, setHorarioSeleccionado] =
    useState<string>("TODOS");

  const [soloConFaltas, setSoloConFaltas] = useState(false);
  const [sortColumna, setSortColumna] = useState<string>('porcentajeAsistencia');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columna: string) => {
    if (sortColumna === columna) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumna(columna);
      setSortDir('asc');
    }
    setPaginaActual(1);
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className={`text-[9px] leading-none shrink-0 ${sortColumna === col ? 'text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
      {sortColumna === col ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  );

  // Turnos efectivos del empleado seleccionado
  const [turnosEfectivos, setTurnosEfectivos] = useState<{
    ganados: any[];
    cedidos: any[];
  }>({ ganados: [], cedidos: [] });

  useEffect(() => {
    if (empleadoSeleccionado === "TODOS") {
      setTurnosEfectivos({ ganados: [], cedidos: [] });
      return;
    }
    fetch(`/api/turnos-efectivos?userId=${empleadoSeleccionado}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ganados) setTurnosEfectivos(d);
      })
      .catch(() => {});
  }, [empleadoSeleccionado]);

  const turnosEfectivosFiltrados = useMemo(() => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59);
    const enRango = (t: any) => {
      const f = new Date(t.fecha);
      return f >= inicio && f <= fin;
    };
    return {
      ganados: turnosEfectivos.ganados.filter(enRango),
      cedidos: turnosEfectivos.cedidos.filter(enRango),
    };
  }, [turnosEfectivos, fechaInicio, fechaFin]);

  const licenciasDelEmpleado = useMemo(() => {
    if (!licencias || empleadoSeleccionado === "TODOS") return [];
    return licencias.filter((l) => {
      if (l.empleado_id !== empleadoSeleccionado) return false;
      return l.fecha_desde <= fechaFin && l.fecha_hasta >= fechaInicio;
    });
  }, [licencias, empleadoSeleccionado, fechaInicio, fechaFin]);

  // Estados para el segundo grupo de comparación
  const [compararActivo, setCompararActivo] = useState(false);
  const [rolComparacion, setRolComparacion] = useState<Rol | "TODOS">("TODOS");
  const [turnoComparacion, setTurnoComparacion] = useState<
    GrupoTurno | "TODOS"
  >("TODOS");
  const [horarioComparacion, setHorarioComparacion] = useState<string>("TODOS");
  const [fechaInicioComparacion, setFechaInicioComparacion] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [fechaFinComparacion, setFechaFinComparacion] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Colores para gráficos
  const COLORS = {
    blue: "#3B82F6",
    green: "#10B981",
    yellow: "#F59E0B",
    red: "#EF4444",
    purple: "#8B5CF6",
    orange: "#F97316",
    teal: '#06B6D4',
  };

  const horariosPorRol: Record<Rol, string[]> = {
    INSPECTOR: [
      "04:00-14:00",
      "06:00-16:00",
      "09:00-19:00",
      "13:00-23:00",
      "19:00-05:00",
    ],
    SUPERVISOR: ["05:00-14:00", "14:00-23:00", "23:00-05:00"],
  };

  useEffect(() => {
    setHorarioSeleccionado("TODOS");
  }, [rolSeleccionado]);

  useEffect(() => {
    if (tipoInforme !== "individual") {
      setEmpleadoSeleccionado("TODOS");
    }
  }, [tipoInforme]);

    useEffect(() => {
    setHorarioComparacion("TODOS");
  }, [rolComparacion]);

  // Empleados filtrados
  const empleadosFiltrados = useMemo(() => {
    if (!empleados) return [];
    let filtrados = [...empleados];

    // Excluir JEFE y ADMINISTRADOR comparando como string para evitar error de tipos
    filtrados = filtrados.filter(
      (e) => !["JEFE", "ADMINISTRADOR"].includes(String(e.rol)),
    );

    // Solo filtrar por empleado seleccionado si estamos en informe individual
    if (empleadoSeleccionado !== "TODOS" && tipoInforme === "individual") {
      filtrados = filtrados.filter((e) => e.id === empleadoSeleccionado);
    }

    if (rolSeleccionado !== "TODOS") {
      filtrados = filtrados.filter((e) => e.rol === rolSeleccionado);
    }

    if (turnoSeleccionado !== "TODOS") {
      filtrados = filtrados.filter((e) => e.grupoTurno === turnoSeleccionado);
    }

    if (horarioSeleccionado !== "TODOS") {
      filtrados = filtrados.filter((e) => e.horario === horarioSeleccionado);
    }

    if (searchTerm) {
      const palabras = searchTerm.toLowerCase().trim().split(/\s+/);

      filtrados = filtrados.filter((e) => {
        const nombre = e.nombre.toLowerCase();
        const apellido = e.apellido.toLowerCase();
        const legajo = e.legajo.toString();

        return palabras.every(
          (palabra) =>
            nombre.includes(palabra) ||
            apellido.includes(palabra) ||
            legajo.includes(palabra),
        );
      });
    }

    return filtrados;
  }, [
    empleados,
    empleadoSeleccionado,
    rolSeleccionado,
    turnoSeleccionado,
    horarioSeleccionado,
    searchTerm,
    tipoInforme,
  ]);

  // Empleados para el selector (filtrados por búsqueda)
  const empleadosParaSelector = useMemo(() => {
    if (!empleados) return [];
    let filtrados = empleados.filter(
      (e) => !["JEFE", "ADMINISTRADOR"].includes(String(e.rol)),
    );

    if (searchTerm) {
      const palabras = searchTerm.toLowerCase().trim().split(/\s+/);

      filtrados = filtrados.filter((e) => {
        const nombre = e.nombre.toLowerCase();
        const apellido = e.apellido.toLowerCase();
        const legajo = e.legajo.toString();

        return palabras.every(
          (palabra) =>
            nombre.includes(palabra) ||
            apellido.includes(palabra) ||
            legajo.includes(palabra),
        );
      });
    }

    return filtrados;
  }, [empleados, searchTerm]);

  // Empleados del segundo grupo (para comparación)
  const empleadosComparacion = useMemo(() => {
    if (!empleados || !compararActivo) return [];
    let filtrados = [...empleados];

    filtrados = filtrados.filter(
      (e) => !["JEFE", "ADMINISTRADOR"].includes(String(e.rol)),
    );

    if (rolComparacion !== "TODOS") {
      filtrados = filtrados.filter((e) => e.rol === rolComparacion);
    }

    if (turnoComparacion !== "TODOS") {
      filtrados = filtrados.filter((e) => e.grupoTurno === turnoComparacion);
    }

    if (horarioComparacion !== "TODOS") {
      filtrados = filtrados.filter((e) => e.horario === horarioComparacion);
    }

    return filtrados;
  }, [
    empleados,
    rolComparacion,
    turnoComparacion,
    horarioComparacion,
    compararActivo,
  ]);

  // Faltas filtradas por fecha
  const faltasFiltradas = useMemo(() => {
    if (!faltas) return [];
    return faltas.filter((f) => {
      const fecha = new Date(f.fecha);
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      return fecha >= inicio && fecha <= fin;
    });
  }, [faltas, fechaInicio, fechaFin]);

  // Faltas del segundo grupo
  const faltasComparacion = useMemo(() => {
    if (!faltas || !compararActivo) return [];
    return faltas.filter((f) => {
      const fecha = new Date(f.fecha);
      const inicio = new Date(fechaInicioComparacion);
      const fin = new Date(fechaFinComparacion);
      return fecha >= inicio && fecha <= fin;
    });
  }, [faltas, fechaInicioComparacion, fechaFinComparacion, compararActivo]);

  // Datos para informe de asistencia
  const datosAsistencia = useMemo(() => {
    const empleadosIds = empleadosFiltrados.map((e) => e.id);
    const faltasDelPeriodo = faltasFiltradas.filter((f) =>
      empleadosIds.includes(f.empleadoId),
    );

    const porEmpleado = empleadosFiltrados
      .map((emp) => {
        const faltasEmp = faltasDelPeriodo.filter(
          (f) => f.empleadoId === emp.id,
        );
        const injustificadas = faltasEmp.filter((f) => !f.justificada).length;

        const sancionesEmp =
          sanciones
            ?.filter(
              (s) =>
                s.empleado_id === emp.id &&
                s.fecha_desde <= fechaFin &&
                s.fecha_hasta >= fechaInicio,
            )
            .reduce((total, s) => {
              // Intersecar el rango de la sanción con el período del informe
              const desdeEfectivo =
                s.fecha_desde > fechaInicio ? s.fecha_desde : fechaInicio;
              const hastaEfectivo =
                s.fecha_hasta < fechaFin ? s.fecha_hasta : fechaFin;
              // Contar solo los días que le tocaba trabajar dentro de la sanción
              return (
                total +
                calcularDiasTrabajoEnRango(
                  desdeEfectivo,
                  hastaEfectivo,
                  emp.grupoTurno,
                )
              );
            }, 0) ?? 0;

        const licenciasEmp =
          licencias?.filter(
            (l) =>
              l.empleado_id === emp.id &&
              l.fecha_desde <= fechaFin &&
              l.fecha_hasta >= fechaInicio,
          ) ?? [];
        const diasLicencia = licenciasEmp.reduce((acc, l) => {
          const desdeEfectivo = l.fecha_desde > fechaInicio ? l.fecha_desde : fechaInicio;
          const hastaEfectivo = l.fecha_hasta < fechaFin ? l.fecha_hasta : fechaFin;
          return acc + calcularDiasTrabajoEnRango(desdeEfectivo, hastaEfectivo, emp.grupoTurno);
        }, 0);

        const faltasReales = injustificadas + sancionesEmp;

        const diasBase = calcularDiasTrabajoEnRango(
          fechaInicio,
          fechaFin,
          emp.grupoTurno,
        );
        const diasEfectivos = Math.max(0, diasBase - diasLicencia);

        // % días que estuvo presente (licencias y faltas reducen el porcentaje)
        const porcentajeAsistencia =
          diasBase > 0
            ? Math.max(
                0,
                Math.round(
                  ((diasBase - diasLicencia - faltasReales) / diasBase) * 100,
                ),
              )
            : 100;

        return {
          id: emp.id,
          nombre: `${emp.apellido}, ${emp.nombre}`,
          legajo: emp.legajo,
          rol: emp.rol,
          turno: emp.grupoTurno,
          faltas: faltasReales,
          licencias: diasLicencia,
          sanciones: sancionesEmp,
          faltasInjustificadas: injustificadas,
          diasDebioTrabajar: diasBase,
          diasEfectivos,
          diasTrabajados: Math.max(0, diasEfectivos - faltasReales),
          porcentajeAsistencia,
        };
      })
      .sort((a, b) => a.porcentajeAsistencia - b.porcentajeAsistencia);

    return porEmpleado;
  }, [
    empleadosFiltrados,
    faltasFiltradas,
    fechaInicio,
    fechaFin,
    licencias,
    sanciones,
  ]);

  const datosOrdenados = useMemo(() => {
    return [...datosAsistencia].sort((a, b) => {
      const aVal = (a as any)[sortColumna];
      const bVal = (b as any)[sortColumna];
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [datosAsistencia, sortColumna, sortDir]);

  // Datos paginados
  const datosPaginados = useMemo(() => {
    if (datosOrdenados.length === 0) return [];

    const indexInicio = (paginaActual - 1) * itemsPorPagina;
    const indexFin = indexInicio + itemsPorPagina;

    return datosOrdenados.slice(indexInicio, indexFin);
  }, [datosOrdenados, paginaActual, itemsPorPagina]);

  // Calcular número total de páginas
  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(datosOrdenados.length / itemsPorPagina));
  }, [datosOrdenados.length, itemsPorPagina]);

  // Resetear página cuando cambian los filtros o si la página actual es mayor al total
  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(1);
    }
  }, [paginaActual, totalPaginas]);

  // Datos para informe de ausentismo
  const datosAusentismo = useMemo(() => {
    const porRol = empleadosFiltrados.reduce(
      (acc, emp) => {
        const faltasEmp = faltasFiltradas.filter(
          (f) => f.empleadoId === emp.id,
        ).length;
        if (!acc[emp.rol]) {
          acc[emp.rol] = { faltas: 0, empleados: 0 };
        }
        acc[emp.rol].faltas += faltasEmp;
        acc[emp.rol].empleados += 1;
        return acc;
      },
      {} as Record<string, { faltas: number; empleados: number }>,
    );

    const porTurno = empleadosFiltrados.reduce(
      (acc, emp) => {
        const faltasEmp = faltasFiltradas.filter(
          (f) => f.empleadoId === emp.id,
        ).length;
        if (!acc[emp.grupoTurno]) {
          acc[emp.grupoTurno] = { faltas: 0, empleados: 0 };
        }
        acc[emp.grupoTurno].faltas += faltasEmp;
        acc[emp.grupoTurno].empleados += 1;
        return acc;
      },
      {} as Record<string, { faltas: number; empleados: number }>,
    );

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
  }, [empleadosFiltrados, faltasFiltradas, licencias, sanciones]);

  // Datos comparativos
  const datosComparativos = useMemo(() => {
    const grupoA = empleadosFiltrados;
    const grupoB = compararActivo ? empleadosComparacion : [];
    const faltasParaGrupoB = compararActivo
      ? faltasComparacion
      : faltasFiltradas;

    const faltasA = faltasFiltradas.filter((f) =>
      grupoA.some((e) => e.id === f.empleadoId),
    ).length;
    const faltasB = faltasParaGrupoB.filter((f) =>
      grupoB.some((e) => e.id === f.empleadoId),
    ).length;

    const licenciasA =
      licencias?.filter((l) => grupoA.some((e) => e.id === l.empleado_id))
        .length ?? 0;
    const licenciasB =
      licencias?.filter((l) => grupoB.some((e) => e.id === l.empleado_id))
        .length ?? 0;

    const sancionesA =
      sanciones?.filter((s) => grupoA.some((e) => e.id === s.empleado_id))
        .length ?? 0;
    const sancionesB =
      sanciones?.filter((s) => grupoB.some((e) => e.id === s.empleado_id))
        .length ?? 0;

    const justificadasA = faltasFiltradas.filter(
      (f) => grupoA.some((e) => e.id === f.empleadoId) && f.justificada,
    ).length;
    const justificadasB = faltasParaGrupoB.filter(
      (f) => grupoB.some((e) => e.id === f.empleadoId) && f.justificada,
    ).length;

const formatFechaCorta = (f: string) =>
      f ? new Date(f + "T12:00:00").toLocaleDateString("es-AR") : "";
    const formatRolTexto = (r: string) => (r === "TODOS" ? "Todos" : r);
    const formatTurnoTexto = (t: string) =>
      t === "TODOS" ? "Todos" : `Grupo ${t}`;
    const formatHorarioTexto = (h: string) => (h === "TODOS" ? "Todos" : h);

    const filtrosTextoA = `Período: ${formatFechaCorta(fechaInicio)} al ${formatFechaCorta(fechaFin)} | Rol: ${formatRolTexto(rolSeleccionado)} | Turno: ${formatTurnoTexto(turnoSeleccionado)} | Horario: ${formatHorarioTexto(horarioSeleccionado)}`;

    const filtrosTextoB = compararActivo
      ? `Período: ${formatFechaCorta(fechaInicioComparacion)} al ${formatFechaCorta(fechaFinComparacion)} | Rol: ${formatRolTexto(rolComparacion)} | Turno: ${formatTurnoTexto(turnoComparacion)} | Horario: ${formatHorarioTexto(horarioComparacion)}`
      : "";

    return {
      comparacion: [
        {
          grupo: "de Referencia",
          empleados: grupoA.length,
          faltas: faltasA,
          licencias: licenciasA,
          sanciones: sancionesA,
          filtrosTexto: filtrosTextoA,
        },
        {
          grupo: "de Comparación",
          empleados: grupoB.length,
          faltas: faltasB,
          licencias: licenciasB,
          sanciones: sancionesB,
          filtrosTexto: filtrosTextoB,
        },
      ],
      porRol: {
        A: grupoA.reduce(
          (acc, e) => {
            acc[e.rol] = (acc[e.rol] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        B: grupoB.reduce(
          (acc, e) => {
            acc[e.rol] = (acc[e.rol] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    };
}, [
    empleadosFiltrados,
    faltasFiltradas,
    licencias,
    sanciones,
    compararActivo,
    empleadosComparacion,
    faltasComparacion,
    fechaInicio,
    fechaFin,
    rolSeleccionado,
    turnoSeleccionado,
    horarioSeleccionado,
    fechaInicioComparacion,
    fechaFinComparacion,
    rolComparacion,
    turnoComparacion,
    horarioComparacion,
  ]);

  // Estadísticas generales
  const estadisticas = useMemo(() => {
    const totalEmpleados = empleadosFiltrados.length;
    const totalFaltas = faltasFiltradas.filter((f) =>
      empleadosFiltrados.some((e) => e.id === f.empleadoId),
    ).length;
    const justificadas = faltasFiltradas.filter(
      (f) =>
        empleadosFiltrados.some((e) => e.id === f.empleadoId) && f.justificada,
    ).length;
    const injustificadas = totalFaltas - justificadas;

    // Calcular días reales que debieron trabajar todos los empleados
    let diasDebieroTrabajarTotal = 0;
    empleadosFiltrados.forEach((emp) => {
      diasDebieroTrabajarTotal += calcularDiasTrabajoEnRango(
        fechaInicio,
        fechaFin,
        emp.grupoTurno,
      );
    });

    let totalDiasLicencia = 0;
    (licencias ?? [])
      .filter(
        (l) =>
          empleadosFiltrados.some((e) => e.id === l.empleado_id) &&
          l.fecha_desde <= fechaFin &&
          l.fecha_hasta >= fechaInicio,
      )
      .forEach((l) => {
        const emp = empleadosFiltrados.find((e) => e.id === l.empleado_id)!;
        const desdeEfectivo = l.fecha_desde > fechaInicio ? l.fecha_desde : fechaInicio;
        const hastaEfectivo = l.fecha_hasta < fechaFin ? l.fecha_hasta : fechaFin;
        totalDiasLicencia += calcularDiasTrabajoEnRango(desdeEfectivo, hastaEfectivo, emp.grupoTurno);
      });

    const tasaAusentismo =
      diasDebieroTrabajarTotal > 0
        ? (((totalFaltas + totalDiasLicencia) / diasDebieroTrabajarTotal) * 100).toFixed(2)
        : "0.00";

    return {
      totalEmpleados,
      totalFaltas,
      justificadas,
      injustificadas,
      tasaAusentismo,
      promedioFaltasPorEmpleado:
        totalEmpleados > 0 ? (totalFaltas / totalEmpleados).toFixed(2) : "0.00",
    };
  }, [empleadosFiltrados, faltasFiltradas, fechaInicio, fechaFin, licencias]);

  // Estadísticas para comparación avanzada
  const estadisticasComparativas = useMemo(() => {
    if (!compararActivo) return null;

    // Estadísticas Grupo A (filtros principales)
    const empleadosIdsA = empleadosFiltrados.map((e) => e.id);
    const faltasA = faltasFiltradas.filter((f) =>
      empleadosIdsA.includes(f.empleadoId),
    );

    let diasDebieroTrabajarA = 0;
    empleadosFiltrados.forEach((emp) => {
      diasDebieroTrabajarA += calcularDiasTrabajoEnRango(
        fechaInicio,
        fechaFin,
        emp.grupoTurno,
      );
    });

    // Estadísticas Grupo B (filtros de comparación)
    const empleadosIdsB = empleadosComparacion.map((e) => e.id);
    const faltasB = faltasComparacion.filter((f) =>
      empleadosIdsB.includes(f.empleadoId),
    );

    let diasDebieroTrabajarB = 0;
    empleadosComparacion.forEach((emp) => {
      diasDebieroTrabajarB += calcularDiasTrabajoEnRango(
        fechaInicioComparacion,
        fechaFinComparacion,
        emp.grupoTurno,
      );
    });

    const licenciasA = licencias?.filter(l =>
      empleadosIdsA.includes(l.empleado_id) &&
      l.fecha_desde <= fechaFin && l.fecha_hasta >= fechaInicio
    ).length ?? 0;

    const licenciasB = licencias?.filter(l =>
      empleadosIdsB.includes(l.empleado_id) &&
      l.fecha_desde <= fechaFinComparacion && l.fecha_hasta >= fechaInicioComparacion
    ).length ?? 0;

    const sancionesA = sanciones?.filter(s =>
      empleadosIdsA.includes(s.empleado_id) &&
      s.fecha_desde <= fechaFin && s.fecha_hasta >= fechaInicio
    ).length ?? 0;

    const sancionesB = sanciones?.filter(s =>
      empleadosIdsB.includes(s.empleado_id) &&
      s.fecha_desde <= fechaFinComparacion && s.fecha_hasta >= fechaInicioComparacion
    ).length ?? 0;

    const cambiosA = cambios?.filter(c =>
      (empleadosIdsA.includes(c.solicitante.id) || empleadosIdsA.includes(c.destinatario?.id ?? '')) &&
      c.fecha >= fechaInicio && c.fecha <= fechaFin &&
      ['APROBADO', 'REALIZADO'].includes(c.estado)
    ).length ?? 0;

    const cambiosB = cambios?.filter(c =>
      (empleadosIdsB.includes(c.solicitante.id) || empleadosIdsB.includes(c.destinatario?.id ?? '')) &&
      c.fecha >= fechaInicioComparacion && c.fecha <= fechaFinComparacion &&
      ['APROBADO', 'REALIZADO'].includes(c.estado)
    ).length ?? 0;

    return {
      grupoA: {
        nombre: "Referencia",
        empleados: empleadosFiltrados.length,
        totalFaltas: faltasA.length,
        justificadas: faltasA.filter((f) => f.justificada).length,
        injustificadas: faltasA.filter((f) => !f.justificada).length,
        licencias: licenciasA,
        sanciones: sancionesA,
        cambios: cambiosA,
        diasDebioTrabajar: diasDebieroTrabajarA,
        tasaAusentismo:
          diasDebieroTrabajarA > 0
            ? ((faltasA.length / diasDebieroTrabajarA) * 100).toFixed(2)
            : "0.00",
        promedioFaltas:
          empleadosFiltrados.length > 0
            ? (faltasA.length / empleadosFiltrados.length).toFixed(2)
            : "0.00",
      },
      grupoB: {
        nombre: "Comparación",
        empleados: empleadosComparacion.length,
        totalFaltas: faltasB.length,
        justificadas: faltasB.filter((f) => f.justificada).length,
        injustificadas: faltasB.filter((f) => !f.justificada).length,
        licencias: licenciasB,
        sanciones: sancionesB,
        cambios: cambiosB,
        diasDebioTrabajar: diasDebieroTrabajarB,
        tasaAusentismo:
          diasDebieroTrabajarB > 0
            ? ((faltasB.length / diasDebieroTrabajarB) * 100).toFixed(2)
            : "0.00",
        promedioFaltas:
          empleadosComparacion.length > 0
            ? (faltasB.length / empleadosComparacion.length).toFixed(2)
            : "0.00",
      },
    };
}, [
    compararActivo,
    empleadosFiltrados,
    faltasFiltradas,
    empleadosComparacion,
    faltasComparacion,
    fechaInicio,
    fechaFin,
    fechaInicioComparacion,
    fechaFinComparacion,
    licencias,
    sanciones,
    cambios,
  ]);

  if (loadingEmpleados || loadingFaltas) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          Cargando datos...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Informes y Reportes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Análisis detallado de asistencia, ausentismo y rendimiento del
              personal
            </p>
          </div>
          <ExportInformes
            tipoInforme={tipoInforme}
            datos={
              tipoInforme === "asistencia"
                ? datosAsistencia
                : tipoInforme === "ausentismo"
                  ? datosAusentismo
                  : tipoInforme === "comparativo"
                    ? datosComparativos
                    : tipoInforme === "individual"
                      ? {
                          empleado: empleados?.find(
                            (e) => e.id === empleadoSeleccionado,
                          ),
                          ...datosAsistencia.find(
                            (d) => d.id === empleadoSeleccionado,
                          ),
                          detallesFaltas: faltasFiltradas.filter(
                            (f) => f.empleadoId === empleadoSeleccionado,
                          ),
                        }
: tipoInforme === "cambios-turno"
                        ? (cambiosTurnoExport?.data ?? null)
                        : tipoInforme === "sanciones"
                          ? (sancionesExport?.data ?? null)
                          : tipoInforme === "licencias"
                            ? (licenciasExport?.data ?? null)
                            : null
            }
estadisticas={
              tipoInforme === "cambios-turno" && cambiosTurnoExport?.data?.stats
                ? cambiosTurnoExport.data.stats
                : tipoInforme === "sanciones" && sancionesExport?.data?.stats
                  ? sancionesExport.data.stats
                  : tipoInforme === "licencias" && licenciasExport?.data?.stats
                    ? licenciasExport.data.stats
                    : estadisticas
            }
fechaInicio={
              tipoInforme === "cambios-turno" &&
              cambiosTurnoExport?.filtros?.desde
                ? cambiosTurnoExport.filtros.desde
                : tipoInforme === "sanciones" && sancionesExport?.filtros?.desde
                  ? sancionesExport.filtros.desde
                  : tipoInforme === "licencias" && licenciasExport?.filtros?.desde
                    ? licenciasExport.filtros.desde
                    : fechaInicio
            }
fechaFin={
              tipoInforme === "cambios-turno" &&
              cambiosTurnoExport?.filtros?.hasta
                ? cambiosTurnoExport.filtros.hasta
                : tipoInforme === "sanciones" && sancionesExport?.filtros?.hasta
                  ? sancionesExport.filtros.hasta
                  : tipoInforme === "licencias" && licenciasExport?.filtros?.hasta
                    ? licenciasExport.filtros.hasta
                    : fechaFin
            }
            filtros={{
              rol: rolSeleccionado !== "TODOS" ? rolSeleccionado : undefined,
              turno:
                turnoSeleccionado !== "TODOS" ? turnoSeleccionado : undefined,
              empleado:
                empleadoSeleccionado !== "TODOS"
                  ? empleadoSeleccionado
                  : undefined,
            }}
          />
        </div>
      </div>

      {/* Selector de Tipo de Informe */}

      <div className="mb-6 grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
        {/* Asistencia */}
        <button
          onClick={() => setTipoInforme("asistencia")}
          title="Asistencia"
          className={`p-3 rounded-lg border-2 transition-all ${
            tipoInforme === "asistencia"
              ? "border-blue-500 bg-blue-500/10 dark:bg-blue-500/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <CheckCircle
              className={`h-5 w-5 ${tipoInforme === "asistencia" ? "text-blue-500" : "text-gray-400"}`}
            />
            <span
              className={`text-xs font-semibold text-center ${tipoInforme === "asistencia" ? "text-blue-500" : "text-gray-700 dark:text-gray-400"}`}
            >
              Asistencia
            </span>
          </div>
        </button>

        {/* Ausentismo */}
        <button
          onClick={() => setTipoInforme("ausentismo")}
          title="Ausentismo"
          className={`p-3 rounded-lg border-2 transition-all ${
            tipoInforme === "ausentismo"
              ? "border-red-500 bg-red-500/10 dark:bg-red-500/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <UserX
              className={`h-5 w-5 ${tipoInforme === "ausentismo" ? "text-red-500" : "text-gray-400"}`}
            />
            <span
              className={`text-xs font-semibold text-center ${tipoInforme === "ausentismo" ? "text-red-500" : "text-gray-700 dark:text-gray-400"}`}
            >
              Ausentismo
            </span>
          </div>
        </button>

        {/* Comparativo */}
        <button
          onClick={() => setTipoInforme("comparativo")}
          title="Comparativo"
          className={`p-3 rounded-lg border-2 transition-all ${
            tipoInforme === "comparativo"
              ? "border-purple-500 bg-purple-500/10 dark:bg-purple-500/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <BarChart3
              className={`h-5 w-5 ${tipoInforme === "comparativo" ? "text-purple-500" : "text-gray-400"}`}
            />
            <span
              className={`text-xs font-semibold text-center ${tipoInforme === "comparativo" ? "text-purple-500" : "text-gray-700 dark:text-gray-400"}`}
            >
              Comparativo
            </span>
          </div>
        </button>

        {/* Individual */}
        <button
          onClick={() => setTipoInforme("individual")}
          title="Individual"
          className={`p-3 rounded-lg border-2 transition-all ${
            tipoInforme === "individual"
              ? "border-green-500 bg-green-500/10 dark:bg-green-500/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <FileBarChart
              className={`h-5 w-5 ${tipoInforme === "individual" ? "text-green-500" : "text-gray-400"}`}
            />
            <span
              className={`text-xs font-semibold text-center ${tipoInforme === "individual" ? "text-green-500" : "text-gray-700 dark:text-gray-400"}`}
            >
              Individual
            </span>
          </div>
        </button>

        {/* Cambios de Turno • solo jefe */}
        {esJefe && (
          <button
            onClick={() => setTipoInforme("cambios-turno")}
            title="Cambios de Turno"
            className={`p-3 rounded-lg border-2 transition-all ${
              tipoInforme === "cambios-turno"
                ? "border-blue-500 bg-blue-500/10 dark:bg-blue-500/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <RefreshCw
                className={`h-5 w-5 ${tipoInforme === "cambios-turno" ? "text-blue-500" : "text-gray-400"}`}
              />
              <span
                className={`text-xs font-semibold text-center leading-tight ${tipoInforme === "cambios-turno" ? "text-blue-500" : "text-gray-700 dark:text-gray-400"}`}
              >
                Cambios
                <br />
                Turno
              </span>
            </div>
          </button>
        )}

        {/* Sanciones */}
        <button
          onClick={() => setTipoInforme("sanciones")}
          title="Sanciones"
          className={`p-3 rounded-lg border-2 transition-all ${
            tipoInforme === "sanciones"
              ? "border-red-500 bg-red-500/10 dark:bg-red-500/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <AlertCircle
              className={`h-5 w-5 ${tipoInforme === "sanciones" ? "text-red-500" : "text-gray-400"}`}
            />
            <span
              className={`text-xs font-semibold text-center ${tipoInforme === "sanciones" ? "text-red-500" : "text-gray-700 dark:text-gray-400"}`}
            >
              Sanciones
            </span>
          </div>
        </button>

        {/* Licencias */}
        <button
          onClick={() => setTipoInforme("licencias")}
          title="Licencias"
          className={`p-3 rounded-lg border-2 transition-all ${
            tipoInforme === "licencias"
              ? "border-purple-500 bg-purple-500/10 dark:bg-purple-500/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <Calendar
              className={`h-5 w-5 ${tipoInforme === "licencias" ? "text-purple-500" : "text-gray-400"}`}
            />
            <span
              className={`text-xs font-semibold text-center ${tipoInforme === "licencias" ? "text-purple-500" : "text-gray-700 dark:text-gray-400"}`}
            >
              Licencias
            </span>
          </div>
        </button>
      </div>

      {/* Panel de Filtros */}
      {!["cambios-turno", "sanciones", "licencias"].includes(tipoInforme) && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Filtros
              </span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-gray-500 transition-transform ${mostrarFiltros ? "rotate-180" : ""}`}
            />
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
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha Inicio
                  </label>
                  <CustomDatePicker
                    value={fechaInicio}
                    onChange={(v) => {
                      setFechaInicio(v);
                      if (v > fechaFin) setFechaFin(v);
                    }}
                    minDate={new Date("2020-01-01")}
                    showGrupo={false}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Fecha Fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha Fin
                  </label>
                  <CustomDatePicker
                    value={fechaFin}
                    onChange={(v) => {
                      if (v >= fechaInicio) setFechaFin(v);
                    }}
                    minDate={
                      fechaInicio
                        ? new Date(fechaInicio + "T00:00:00")
                        : new Date("2020-01-01")
                    }
                    showGrupo={false}
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
                    onChange={(e) =>
                      setRolSeleccionado(e.target.value as Rol | "TODOS")
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="TODOS">Todos los roles</option>
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
                    onChange={(e) =>
                      setTurnoSeleccionado(
                        e.target.value as GrupoTurno | "TODOS",
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="TODOS">Todos los turnos</option>
                    <option value="A">Grupo A</option>
                    <option value="B">Grupo B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Horario
                  </label>
                  <select
                    value={horarioSeleccionado}
                    onChange={(e) => setHorarioSeleccionado(e.target.value)}
                    disabled={rolSeleccionado === "TODOS"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="TODOS">Todos los horarios</option>
                    {rolSeleccionado !== "TODOS" &&
                      horariosPorRol[rolSeleccionado].map((horario) => (
                        <option key={horario} value={horario}>
                          {horario}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Empleado Individual */}
                {tipoInforme === "individual" && (
                  <div className="col-span-full lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Empleado
                    </label>
                    <select
                      value={empleadoSeleccionado}
                      onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="TODOS">Seleccionar empleado</option>
                      {empleadosParaSelector.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.apellido}, {emp.nombre} - Leg. {emp.legajo}
                        </option>
                      ))}
                    </select>
                    {searchTerm && empleadosParaSelector.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Mostrando {empleadosParaSelector.length} empleado
                        {empleadosParaSelector.length !== 1 ? "s" : ""} que
                        coincide{empleadosParaSelector.length !== 1 ? "n" : ""}{" "}
                        con "{searchTerm}"
                      </p>
                    )}
                    {searchTerm && empleadosParaSelector.length === 0 && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        No se encontraron empleados con "{searchTerm}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards de Estadísticas */}
      {!["cambios-turno", "sanciones", "licencias"].includes(tipoInforme) && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Empleados
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {estadisticas.totalEmpleados}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Faltas
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {estadisticas.totalFaltas}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Licencias
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {licencias?.filter((l) =>
                empleadosFiltrados.some((e) => e.id === l.empleado_id) &&
                l.fecha_desde <= fechaFin &&
                l.fecha_hasta >= fechaInicio,
              ).length ?? 0}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sanciones
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {sanciones?.filter((s) =>
                empleadosFiltrados.some((e) => e.id === s.empleado_id) &&
                s.fecha_desde <= fechaFin &&
                s.fecha_hasta >= fechaInicio,
              ).length ?? 0}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tasa Ausentismo
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {estadisticas.tasaAusentismo}%
            </p>
          </div>
        </div>
      )}

      {/* Contenido según tipo de informe */}
      {tipoInforme === "asistencia" && (
        <div className="space-y-6">
          {/* Tabla de Asistencia */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                Registro de Asistencia por Empleado
                <ChartInfo text="Registro diario de asistencia de cada empleado en el período seleccionado." />
              </h3>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {([
                      { key: 'legajo', label: 'Legajo', align: 'left' },
                      { key: 'nombre', label: 'Empleado', align: 'left' },
                      { key: 'rol', label: 'Rol', align: 'center' },
                      { key: 'turno', label: 'Turno', align: 'center' },
                      { key: 'diasDebioTrabajar', label: 'Días debió trabajar', align: 'center' },
                      { key: 'faltas', label: 'Faltas', align: 'center' },
                      { key: 'licencias', label: 'Licencias', align: 'center' },
                      { key: 'faltasInjustificadas', label: 'Injustif.', align: 'center' },
                      { key: 'sanciones', label: 'Sanciones', align: 'center' },
                      { key: 'porcentajeAsistencia', label: '% Asistencia', align: 'center' },
                    ] as const).map(({ key, label, align }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
                          <span>{label}</span>
                          <SortIcon col={key} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {datosPaginados.map((dato) => (
                    <tr
                      key={dato.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {dato.legajo}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {dato.nombre}
                      </td>
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
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white font-semibold">
                        {dato.diasDebioTrabajar}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                        {dato.faltas}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-green-600 dark:text-green-400">
                        {dato.licencias}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-red-600 dark:text-red-400">
                        {dato.faltasInjustificadas}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-purple-600 dark:text-purple-400">
                        {dato.sanciones}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`font-semibold ${
                            dato.porcentajeAsistencia >= 95
                              ? "text-green-600"
                              : dato.porcentajeAsistencia >= 90
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {dato.porcentajeAsistencia}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CARDS - solo móvil */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {datosPaginados.map((dato) => (
                <div key={dato.id} className="p-4">
                  {/* Fila 1: Nombre + % Asistencia */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {dato.nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Leg. {dato.legajo}
                      </p>
                    </div>
                    <span
                      className={`text-xl font-bold ${
                        dato.porcentajeAsistencia >= 95
                          ? "text-green-600"
                          : dato.porcentajeAsistencia >= 90
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {dato.porcentajeAsistencia}%
                    </span>
                  </div>
                  {/* Fila 2: Rol + Turno */}
                  <div className="flex gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      {dato.rol}
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                      Grupo {dato.turno}
                    </span>
                  </div>
                  {/* Fila 3: Stats en grid */}
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-1.5">
                      <p className="text-gray-500 dark:text-gray-400">Días</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {dato.diasDebioTrabajar}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-1.5">
                      <p className="text-gray-500 dark:text-gray-400">Faltas</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {dato.faltas}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-1.5">
                      <p className="text-gray-500 dark:text-gray-400">Lic.</p>
                      <p className="font-bold text-green-600">
                        {dato.licencias}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-1.5">
                      <p className="text-gray-500 dark:text-gray-400">Sanc.</p>
                      <p className="font-bold text-purple-600">
                        {dato.sanciones}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controles de paginación */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrar
                </span>
                <select
                  value={itemsPorPagina}
                  onChange={(e) => {
                    setItemsPorPagina(Number(e.target.value));
                    setPaginaActual(1);
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
                  {datosAsistencia.length === 0
                    ? 0
                    : (paginaActual - 1) * itemsPorPagina + 1}{" "}
                  a{" "}
                  {Math.min(
                    paginaActual * itemsPorPagina,
                    datosAsistencia.length,
                  )}{" "}
                  de {datosAsistencia.length} registros
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Botón Primera Página */}
                <button
                  onClick={() => setPaginaActual(1)}
                  disabled={paginaActual === 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  «
                </button>

                {/* Botón Anterior */}
                <button
                  onClick={() =>
                    setPaginaActual((prev) => Math.max(1, prev - 1))
                  }
                  disabled={paginaActual === 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ‹
                </button>

                {/* Números de página - solo desktop */}
                <span className="text-sm text-gray-700 dark:text-gray-300 sm:hidden">
                  {paginaActual} / {totalPaginas}
                </span>
                <span className="hidden sm:contents">
                  {(() => {
                    const pages = [];
                    const maxPagesToShow = 5;
                    let startPage = Math.max(
                      1,
                      paginaActual - Math.floor(maxPagesToShow / 2),
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
                          onClick={() => setPaginaActual(i)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            paginaActual === i
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
                    setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))
                  }
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ›
                </button>

                {/* Botón Última Página */}
                <button
                  onClick={() => setPaginaActual(totalPaginas)}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  »
                </button>
              </div>
            </div>
          </div>

          {/* Gráfico Top 10 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              Top 10 - Mayor Asistencia
              <ChartInfo text="Los 10 empleados con mayor cantidad de días de asistencia en el período seleccionado." />
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={datosAsistencia.slice(-10).reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="nombre"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="#9CA3AF"
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                  labelStyle={{
                    color: "#F3F4F6",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                  itemStyle={{ color: "#10B981" }}
                  separator=": "
                  formatter={(value, name) => [
                    <span style={{ color: "#FFF" }}>{value}</span>,
                    "Porcentaje de Asistencia",
                  ]}
                  cursor={{ fill: "transparent" }}
                />
                <Bar
                  dataKey="porcentajeAsistencia"
                  fill={COLORS.green}
                  radius={[8, 8, 0, 0]}
                  activeBar={{
                    fill: "#059669",
                    stroke: "#10B981",
                    strokeWidth: 2,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tipoInforme === "ausentismo" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ausentismo por Rol */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              Ausentismo por Rol
              <ChartInfo text="Cantidad de faltas registradas por rol (Supervisor / Inspector) en el período seleccionado." />
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosAusentismo.porRol}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="rol"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) =>
                    value === "INSPECTOR"
                      ? "Insp."
                      : value === "SUPERVISOR"
                        ? "Sup."
                        : value
                  }
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  content={<CustomTooltip labelColor="#F97316" />}
                  cursor={{ fill: "transparent" }}
                />
                <Legend />
                <Bar
                  dataKey="promedio"
                  fill={COLORS.orange}
                  name="Promedio Faltas"
                  radius={[8, 8, 0, 0]}
                  activeBar={{
                    fill: "#EA580C",
                    stroke: "#F97316",
                    strokeWidth: 2,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ausentismo por Turno */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              Ausentismo por Grupo Turno
              <ChartInfo text="Distribución de ausencias entre los grupos de turno A y B en el período seleccionado." />
            </h3>
            <h1 className="font-medium text-gray-900 dark:text-white">
              Promedio de faltas por persona
            </h1>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={datosAusentismo.porTurno.map((item) => ({
                    name: item.turno,
                    value: parseInt(item.total.toString()),
                    promedio: item.promedio,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.green} />
                  <Cell fill={COLORS.blue} />
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend content={<PieLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla Resumen por Rol */}
          {/* TABLA - solo desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Total Faltas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Promedio por Empleado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Nivel
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {datosAusentismo.porRol.map((dato) => (
                  <tr
                    key={dato.rol}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {dato.rol}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {dato.total}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {dato.promedio}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          parseFloat(dato.promedio) >= 5
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : parseFloat(dato.promedio) >= 3
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {parseFloat(dato.promedio) >= 5
                          ? "Crítico"
                          : parseFloat(dato.promedio) >= 3
                            ? "Moderado"
                            : "Bajo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CARDS - solo móvil */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {datosAusentismo.porRol.map((dato) => (
              <div
                key={dato.rol}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {dato.rol}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Total:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dato.total}
                    </span>
                    &nbsp;· Promedio:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dato.promedio}
                    </span>
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    parseFloat(dato.promedio) >= 5
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : parseFloat(dato.promedio) >= 3
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  }`}
                >
                  {parseFloat(dato.promedio) >= 5
                    ? "Crítico"
                    : parseFloat(dato.promedio) >= 3
                      ? "Moderado"
                      : "Bajo"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tipoInforme === "comparativo" && (
        <div className="space-y-6">
          {tipoInforme === "comparativo" && (
            <>
              {/* Toggle para activar comparación avanzada */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      Comparación Avanzada
                      <ChartInfo text="Compara métricas de asistencia entre dos empleados seleccionados en el período." />
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Grupo 1</span> usa los filtros de la parte superior.{' '}
                      <span className="font-semibold text-green-600 dark:text-green-400">Grupo 2</span> usa filtros propios. Podés comparar el mismo grupo en distintos períodos, distintos grupos en el mismo período, o cualquier combinación.
                    </p>
                  </div>
                  <button
                    onClick={() => setCompararActivo(!compararActivo)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex-shrink-0 self-start sm:self-auto ${compararActivo
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                  >
                    {compararActivo ? "Desactivar" : "Activar"} Comparación
                  </button>
                </div>

                {compararActivo && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Grupo A - Filtros actuales */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                            1
                          </span>
                          Grupo de Referencia (Filtros principales)
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Período:</strong>{" "}
                            {new Date(
                              fechaInicio + "T12:00:00",
                            ).toLocaleDateString("es-AR")}{" "}
                            -{" "}
                            {new Date(
                              fechaFin + "T12:00:00",
                            ).toLocaleDateString("es-AR")}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Rol:</strong>{" "}
                            {rolSeleccionado === "TODOS"
                              ? "Todos"
                              : rolSeleccionado}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Turno:</strong>{" "}
                            {turnoSeleccionado === "TODOS"
                              ? "Todos"
                              : `Grupo ${turnoSeleccionado}`}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Horario:</strong>{" "}
                            {horarioSeleccionado === "TODOS"
                              ? "Todos"
                              : horarioSeleccionado}
                          </p>
                        </div>
                      </div>

                      {/* Grupo B - Filtros de comparación */}
                      <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                            2
                          </span>
                          Grupo de Comparación
                        </h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha Inicio
                              </label>
                              <CustomDatePicker
                                value={fechaInicioComparacion}
                                onChange={(v) => {
                                  setFechaInicioComparacion(v);
                                  if (v > fechaFinComparacion)
                                    setFechaFinComparacion(v);
                                }}
                                minDate={new Date("2020-01-01")}
                                showGrupo={false}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha Fin
                              </label>
                              <CustomDatePicker
                                value={fechaFinComparacion}
                                onChange={(v) => {
                                  if (v >= fechaInicioComparacion)
                                    setFechaFinComparacion(v);
                                }}
                                minDate={
                                  fechaInicioComparacion
                                    ? new Date(fechaInicioComparacion + "T00:00:00")
                                    : new Date("2020-01-01")
                                }
                                showGrupo={false}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Rol
                            </label>
                            <select
                              value={rolComparacion}
                              onChange={(e) =>
                                setRolComparacion(
                                  e.target.value as Rol | "TODOS",
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="TODOS">Todos los roles</option>
                              <option value="SUPERVISOR">Supervisor</option>
                              <option value="INSPECTOR">Inspector</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Grupo Turno
                            </label>
                            <select
                              value={turnoComparacion}
                              onChange={(e) =>
                                setTurnoComparacion(
                                  e.target.value as GrupoTurno | "TODOS",
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="TODOS">Todos los turnos</option>
                              <option value="A">Grupo A</option>
                              <option value="B">Grupo B</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Horario
                            </label>
                            <select
                              value={horarioComparacion}
                              onChange={(e) =>
                                setHorarioComparacion(e.target.value)
                              }
                              disabled={rolComparacion === "TODOS"}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                              <option value="TODOS">Todos los horarios</option>
                              {rolComparacion !== "TODOS" &&
                                horariosPorRol[rolComparacion].map(
                                  (horario) => (
                                    <option key={horario} value={horario}>
                                      {horario}
                                    </option>
                                  ),
                                )}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mostrar comparación cuando está activa */}
              {compararActivo && estadisticasComparativas && (
                <div className="space-y-6">
                  {/* Cards comparativos */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Empleados */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Empleados
                      </p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Ref.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoA.empleados}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400">Comp.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoB.empleados}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total Faltas */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Total Faltas
                      </p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Ref.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoA.totalFaltas}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400">Comp.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoB.totalFaltas}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Promedio Faltas */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Promedio Faltas
                      </p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Ref.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoA.promedioFaltas}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400">2:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoB.promedioFaltas}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tasa Ausentismo */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Tasa Ausentismo
                      </p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">1:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoA.tasaAusentismo}%
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400">2:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoB.tasaAusentismo}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Licencias */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Licencias</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Ref.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoA.licencias}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400">Comp.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoB.licencias}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sanciones */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sanciones</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Ref.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoA.sanciones}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400">Comp.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoB.sanciones}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cambios de Turno */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Cambios de Turno</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Ref.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoA.cambios}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400">Comp.:</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white ml-1">
                            {estadisticasComparativas.grupoB.cambios}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico comparativo */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      Comparación Detallada
                      <ChartInfo text="Compara faltas, licencias, sanciones y cambios de turno entre los dos grupos. El eje X muestra 'Referencia' (filtros de arriba) y 'Comparación' (filtros propios de esta sección)." />
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={[
                          estadisticasComparativas.grupoA,
                          estadisticasComparativas.grupoB,
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="nombre" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;

                            return (
                              <div className="bg-gray-800 dark:bg-gray-700 border border-gray-600 dark:border-gray-500 rounded-lg shadow-lg px-3 py-2">
                                <p className="text-white font-semibold mb-1">
                                  {label}
                                </p>
                                {payload.map((entry: any, index: number) => (
                                  <p key={index} className="text-white">
                                    <span style={{ color: entry.color }}>
                                      {entry.name}:
                                    </span>{" "}
                                    <span className="font-bold">
                                      {entry.value}
                                    </span>
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                          cursor={{ fill: "transparent" }}
                        />
                        <Legend />
                        <Bar
                          dataKey="empleados"
                          fill={COLORS.blue}
                          name="Empleados"
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="totalFaltas"
                          fill={COLORS.red}
                          name="Total Faltas"
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="licencias"
                          fill={COLORS.green}
                          name="Licencias"
                          radius={[8, 8, 0, 0]}
                          activeBar={{
                            fill: "#059669",
                            stroke: "#10B981",
                            strokeWidth: 2,
                          }}
                        />
                        <Bar dataKey="sanciones" fill={COLORS.purple} name="Sanciones" radius={[8, 8, 0, 0]}
                          activeBar={{ fill: '#7C3AED', stroke: '#8B5CF6', strokeWidth: 2 }}
/>
                        <Bar dataKey="injustificadas" fill={COLORS.orange} name="Injustificadas" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Distribución de Roles por Grupo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                Distribución de Roles - Referencia
                <ChartInfo text="Distribución de roles (Supervisor / Inspector) del Grupo A de turno." />
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(datosComparativos.porRol.A).map(
                      ([rol, count]) => ({ name: rol, value: count }),
                    )}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(datosComparativos.porRol.A).map(
                      ([rol, _], index) => {
                        const colorPorRol: Record<string, string> = {
                          SUPERVISOR: COLORS.blue, // Azul para Supervisor
                          INSPECTOR: COLORS.green, // Verde para Inspector
                        };
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colorPorRol[rol] || COLORS.blue}
                          />
                        );
                      },
                    )}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;

                      const data = payload[0];
                      const colorMap: Record<string, string> = {
                        'SUPERVISOR': '#3B82F6',
                        'INSPECTOR': '#10B981'
                      };

                      const color = colorMap[data.name ?? ''] ?? '#6B7280';

                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                          <p className="m-0">
                            <span className="text-gray-900 dark:text-white font-bold">
                              {data.name}:
                            </span>
                            {' '}
                            <span style={{ color: color }} className="font-bold">
                              {data.value}
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                Distribución de Roles - Comparación
                <ChartInfo text="Distribución de roles (Supervisor / Inspector) del Grupo B de turno." />
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(datosComparativos.porRol.B).map(
                      ([rol, count]) => ({ name: rol, value: count }),
                    )}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(datosComparativos.porRol.B).map(
                      ([rol, _], index) => {
                        const colorPorRol: Record<string, string> = {
                          SUPERVISOR: COLORS.blue, // Azul para Supervisor
                          INSPECTOR: COLORS.green, // Verde para Inspector
                        };
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colorPorRol[rol] || COLORS.blue}
                          />
                        );
                      },
                    )}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;

                      const data = payload[0];
                      const colorMap: Record<string, string> = {
                        'SUPERVISOR': '#60A5FA',  // Azul
                        'INSPECTOR': '#34D399'    // Verde
                      };

                      const color = colorMap[data.name ?? ''] ?? '#E5E7EB';

                      return (
                        <div style={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}>
                          <p style={{ margin: 0 }}>
                            <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                              {data.name}:
                            </span>
                            {' '}
                            <span style={{ color: color, fontWeight: 'bold' }}>
                              {data.value}
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>
      )}

      {tipoInforme === "individual" && (
        <div className="space-y-6">
          {empleadoSeleccionado === "TODOS" ? (
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
                const empleado = empleados?.find(
                  (e) => e.id === empleadoSeleccionado,
                );
                const datosEmp = datosAsistencia.find(
                  (d) => d.id === empleadoSeleccionado,
                );

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
                            Legajo: {empleado.legajo} | {empleado.rol} | Grupo{" "}
                            {empleado.grupoTurno}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Asistencia
                          </p>
                          <p
                            className={`text-3xl font-bold ${
                              datosEmp.porcentajeAsistencia >= 95
                                ? "text-green-600"
                                : datosEmp.porcentajeAsistencia >= 90
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {datosEmp.porcentajeAsistencia}%
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Total Faltas
                          </p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {datosEmp.faltas}
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Licencias (días)
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            {datosEmp.licencias}
                          </p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Injustificadas
                          </p>
                          <p className="text-2xl font-bold text-red-600">
                            {datosEmp.faltasInjustificadas}
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Sanciones (días)
                          </p>
                          <p className="text-2xl font-bold text-purple-600">
                            {datosEmp.sanciones}
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Días Trabajados
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {datosEmp.diasTrabajados}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Turnos Efectivos */}
                    {/* Cambios de Turno Efectivos */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        Cambios de Turno Efectivos en el Período
                        <ChartInfo text="Cambios de turno completados o aprobados para el empleado seleccionado en el período." />
                      </h3>
                      {turnosEfectivosFiltrados.ganados.length === 0 &&
                      turnosEfectivosFiltrados.cedidos.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
                          No hubo cambios de turno en este período
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Turnos Ganados
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                {turnosEfectivosFiltrados.ganados.length}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Trabajó el turno de otro
                              </p>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Turnos Cedidos
                              </p>
                              <p className="text-2xl font-bold text-orange-600">
                                {turnosEfectivosFiltrados.cedidos.length}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Otro trabajó su turno
                              </p>
                            </div>
                          </div>
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                    Fecha
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                    Tipo
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                    Horario Original
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                    Horario Efectivo
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                    Compañero
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[
                                  ...turnosEfectivosFiltrados.ganados.map(
                                    (t) => ({ ...t, _tipo: "GANADO" }),
                                  ),
                                  ...turnosEfectivosFiltrados.cedidos.map(
                                    (t) => ({ ...t, _tipo: "CEDIDO" }),
                                  ),
                                ]
                                  .sort(
                                    (a, b) =>
                                      new Date(a.fecha).getTime() -
                                      new Date(b.fecha).getTime(),
                                  )
                                  .map((t, i) => (
                                    <tr
                                      key={i}
                                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                                        {new Date(
                                          t.fecha + "T12:00:00",
                                        ).toLocaleDateString("es-AR")}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            t._tipo === "GANADO"
                                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                          }`}
                                        >
                                          {t._tipo}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {t.horario_original || "•"}
                                      </td>
                                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {t.horario_efectivo || "•"}
                                      </td>
                                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {t.companero || "•"}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Licencias en el período */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        Licencias en el Período
                        <ChartInfo text="Licencias registradas para el empleado seleccionado en el período, con tipo y estado." />
                      </h3>
                      {licenciasDelEmpleado.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
                          No hubo licencias en este período
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Tipo
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Artículo
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Desde
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Hasta
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Días
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Estado
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {licenciasDelEmpleado.map((l) => (
                                <tr
                                  key={l.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                                    {{
                                      ORDINARIA: "Ordinaria",
                                      COMPENSATORIO: "Compensatorio",
                                      GREMIAL: "Gremial",
                                      MEDICA: "Médica",
                                      ESTUDIO: "Estudio",
                                      PATERNIDAD: "Paternidad",
                                      COMISION: "Comisión",
                                      CURSO: "Curso",
                                      SIN_GOCE: "Sin goce",
                                    }[l.tipo] ?? l.tipo}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                    {l.articulo ?? "•"}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                    {new Date(
                                      l.fecha_desde + "T12:00:00",
                                    ).toLocaleDateString("es-AR")}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                    {new Date(
                                      l.fecha_hasta + "T12:00:00",
                                    ).toLocaleDateString("es-AR")}
                                  </td>
                                  <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                                    {calcularDiasTrabajoEnRango(
                                      l.fecha_desde > fechaInicio ? l.fecha_desde : fechaInicio,
                                      l.fecha_hasta < fechaFin ? l.fecha_hasta : fechaFin,
                                      empleado.grupoTurno,
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        l.estado === "ACTIVA"
                                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                          : l.estado === "PENDIENTE"
                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                            : l.estado === "FINALIZADA"
                                              ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                      }`}
                                    >
                                      {l.estado}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Detalle de Faltas */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        Detalle de Faltas en el Período
                        <ChartInfo text="Faltas registradas para el empleado seleccionado en el período, con motivo y estado de justificación." />
                      </h3>
                      {faltasFiltradas.filter(
                        (f) => f.empleadoId === empleadoSeleccionado,
                      ).length === 0 ? (
                        <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                          No hay faltas registradas en este período
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Motivo
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                                  Observaciones
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {faltasFiltradas
                                .filter(
                                  (f) => f.empleadoId === empleadoSeleccionado,
                                )
                                .map((falta) => (
                                  <tr
                                    key={falta.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                      {new Date(falta.fecha).toLocaleDateString(
                                        "es-AR",
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                      {falta.causa}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                          falta.justificada
                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        }`}
                                      >
                                        {falta.justificada
                                          ? "Justificada"
                                          : "Injustificada"}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                      {falta.observaciones || "-"}
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

      {tipoInforme === "cambios-turno" && (
        <InformeCambiosTurno onDataChange={setCambiosTurnoExport} />
      )}
      {tipoInforme === "sanciones" && (
        <InformeSanciones onDataChange={setSancionesExport} />
      )}
      {tipoInforme === "licencias" && (
        <InformeLicencias onDataChange={setLicenciasExport} />
      )}
    </div>
  );
}
