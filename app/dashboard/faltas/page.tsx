"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/app/api/fetcher";
import { useLicenciasDelDia } from "@/hooks/useLicenciasPorDia";
import { useSancionesDelDia } from "@/hooks/useSancionesDelDia";
import { useFaltas, useTodasLasFaltas } from "@/hooks/useFaltas";
import { useFormatters } from "@/hooks/useFormatters";
import { useEmpleados } from "@/hooks/useEmpleados";
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import ModalConsultaFaltas from '@/app/components/faltas/ModalConsultaFaltas';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CustomDatePicker } from '@/app/components/CustomDatePicker';

import {
  UserCircle,
  XCircle,
  CheckCircle,
  Calendar,
  Clock,
  FileSearch,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { calcularGrupoTrabaja, type GrupoTurno } from "@/app/lib/turnosUtils";
import { ExportData } from "@/app/components/ExportToPdf";


export default function FaltasPage() {
  const {
    getTodayDate,
    formatDate,
    parseFechaLocal,
  } = useFormatters();

  const ITEMS_POR_PAGINA = 20;
  const [procesando, setProcesando] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState("TODOS");
  const [selectedTurno, setSelectedTurno] = useState("TODOS");
  const today = useMemo(() => getTodayDate(), [getTodayDate]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalConsultaOpen, setModalConsultaOpen] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const { licenciasDelDia } = useLicenciasDelDia(selectedDate);
  const { sancionesDelDia } = useSancionesDelDia(selectedDate);

  const abrirModalConsulta = async () => {
    await refetchFaltas();
    setModalConsultaOpen(true);
  };

  const [turnosEfectivosDelDia, setTurnosEfectivosDelDia] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/turnos-efectivos?fecha=${selectedDate}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          console.log("turno ejemplo:", data[0]);
          setTurnosEfectivosDelDia(data);
        }
      });
  }, [selectedDate]);

  const { data: presentesData, mutate: mutatePresentes } = useSWR(
    selectedDate ? `/api/presentes?fecha=${selectedDate}` : null,
    fetcher
  );

  const [searchText, setSearchText] = useState("");

  const { empleados, isLoading: loadingEmpleados, error: errorEmpleados } = useEmpleados();
  const { faltas, isLoading: loadingFaltas, error: errorFaltas, deleteFalta: eliminarFalta, mutate } = useFaltas(selectedDate);
  const {
    faltas: todasLasFaltas = [],
    refetch: refetchFaltas,
  } = useTodasLasFaltas();
  const { data: todasLasLicencias = [] } = useSWR<any[]>("/api/licencias", fetcher);
  const { data: todasLasSanciones = [] } = useSWR<any[]>("/api/sanciones", fetcher);

  const presentesExplicitos = useMemo(() => {
    if (!Array.isArray(presentesData)) return new Set<string>();
    return new Set<string>(presentesData.map((p: any) => String(p.empleadoId)));
  }, [presentesData]);

  const registrosAusencias = useMemo(() => {
    const faltas = (todasLasFaltas || []).map((f: any) => ({
      ...f,
      tipo: "FALTA" as const,
    }));

    const licencias = (todasLasLicencias || []).map((l: any) => ({
      id: String(l.id),
      tipo: "LICENCIA" as const,
      empleadoId: l.empleado_id ?? l.empleadoId,
      fecha: l.fecha_desde?.split("T")[0] ?? l.fecha,
      motivo: l.tipo ?? l.motivo ?? "Licencia",
    }));

    const sanciones = (todasLasSanciones || []).map((s: any) => ({
      id: String(s.id),
      tipo: "SANCION" as const,
      empleadoId: s.empleado_id ?? s.empleadoId,
      fecha: s.fecha_desde?.split("T")[0] ?? s.fecha,
      motivo: s.motivo ?? "Sanción",
      observaciones: s.observaciones ?? null,
    }));

    return [...faltas, ...licencias, ...sanciones].sort((a, b) =>
      b.fecha.localeCompare(a.fecha)
    );
  }, [todasLasFaltas, todasLasLicencias, todasLasSanciones]);

  // ==== VALIDAR FECHA FUTURA ====
  const esFechaFutura = useMemo(() => {
    const fechaSeleccionada = parseFechaLocal(selectedDate);
    const hoy = parseFechaLocal(today);
    if (!fechaSeleccionada || !hoy) return false;

    return fechaSeleccionada > hoy;
  }, [selectedDate, today, parseFechaLocal]);

  // Calcular qué grupo trabaja en la fecha seleccionada
  const grupoQueTrabaja = useMemo(() => {
    return calcularGrupoTrabaja(selectedDate);
  }, [selectedDate]);

  // Extraer roles únicos de los empleados
  const rolesDisponibles = useMemo(() => {
    if (!empleados) return [];
    const roles = new Set(empleados.map(emp => emp.rol));
    return Array.from(roles).filter(rol => rol === 'SUPERVISOR' || rol === 'INSPECTOR').sort();
  }, [empleados]);

  // ==== TURNOS DISPONIBLES SEGÚN ROL ====
  const turnosDisponibles = useMemo(() => {
    if (!empleados || selectedRole === "TODOS") return [];

    const turnos = new Set(
      empleados
        .filter(emp => emp.rol === selectedRole)
        .map(emp => (emp.horario ?? "").trim())
        .filter(h => h !== "")
    );

    return Array.from(turnos).sort();
  }, [empleados, selectedRole]);

  // Reset turno al cambiar rol
  useEffect(() => {
    setSelectedTurno("TODOS");
  }, [selectedRole]);

  // Reset página al cambiar cualquier filtro
  useEffect(() => {
    setPaginaActual(1);
  }, [selectedDate, selectedRole, selectedTurno, searchText]);


  // Filtrar empleados por fecha, rol, turno y grupo
  const empleadosDelDia = useMemo(() => {
    if (!selectedDate || !empleados) return [];

    const empleadosGanaron = turnosEfectivosDelDia.filter((t: any) => t.tipo === 'GANADO');
    const empleadosCedieron = new Set(turnosEfectivosDelDia.filter((t: any) => t.tipo === 'CEDIDO').map((t: any) => t.empleadoId));

    return empleados
      .filter((emp) => {
        const estaActivo = emp.activo;
        const perteneceAlGrupo = emp.grupoTurno === grupoQueTrabaja;
        const turnoGanado = empleadosGanaron.find((t: any) => t.empleadoId === emp.id);
        const ganoTurno = !!turnoGanado;
        const cedioTurno = empleadosCedieron.has(emp.id);
        const rolCoincide = selectedRole === "TODOS"
          ? (emp.rol === 'SUPERVISOR' || emp.rol === 'INSPECTOR')
          : emp.rol === selectedRole;
        const horarioEfectivo = turnoGanado ? turnoGanado.horarioEfectivo : emp.horario;
        const turnoCoincide = selectedTurno === "TODOS" || horarioEfectivo === selectedTurno;
        const coincideTexto = searchText === "" ||
          emp.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
          emp.apellido.toLowerCase().includes(searchText.toLowerCase());

        return estaActivo && (perteneceAlGrupo || ganoTurno) && !cedioTurno && rolCoincide && turnoCoincide && coincideTexto;
      })
      .sort((a, b) => {
        const horaA = a.horario?.split("-")[0] ?? "";
        const horaB = b.horario?.split("-")[0] ?? "";
        return horaA.localeCompare(horaB);
      });
  }, [empleados, selectedDate, selectedRole, selectedTurno, grupoQueTrabaja, searchText, turnosEfectivosDelDia]);


  // Lista de faltas del día
  const empleadosConFalta = (faltas || []).map((f) => f.empleadoId);

  const empleadosConLicencia = useMemo(() => {
    return new Set(
      (licenciasDelDia || []).map((l: any) => l.empleado_id)
    );
  }, [licenciasDelDia]);

  const empleadosConSancion = useMemo(() => {
    const data = Array.isArray(sancionesDelDia) ? sancionesDelDia : [];
    return new Set(
      data
        .map((s: any) => String(s?.empleado_id ?? s?.empleadoId))
        .filter((id: string) => !!id && id !== 'undefined')
    );
  }, [sancionesDelDia]);

  // ==== EMPLEADOS PARA EXPORTAR (sin filtros) ====
  const empleadosParaExportar = useMemo(() => {
    if (!empleados) return [];

    const empleadosGanaron = turnosEfectivosDelDia.filter((t: any) => t.tipo === 'GANADO');
    const empleadosCedieron = new Set(turnosEfectivosDelDia.filter((t: any) => t.tipo === 'CEDIDO').map((t: any) => t.empleadoId));

    return empleados.filter((emp) => {
      const estaActivo = emp.activo;
      const perteneceAlGrupo = emp.grupoTurno === grupoQueTrabaja;
      const esRolValido = emp.rol === 'SUPERVISOR' || emp.rol === 'INSPECTOR';
      const ganoTurno = empleadosGanaron.some((t: any) => t.empleadoId === emp.id);
      const cedioTurno = empleadosCedieron.has(emp.id);

      return estaActivo && (perteneceAlGrupo || ganoTurno) && !cedioTurno && esRolValido;
    });
  }, [empleados, grupoQueTrabaja, turnosEfectivosDelDia]);

  // ==== ELIMINAR FALTA ====
  const handleEliminarFalta = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta falta?")) return;

    try {
      await eliminarFalta(id);
      toast.success("Falta eliminada correctamente");
      mutate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al eliminar falta";
      toast.error(message);
    }
  };

  // ==== REGISTRAR PRESENTE ====
  const handleRegistrarPresente = async (empleadoId: String, falta?: any) => {
    const id = String(empleadoId);
    if (procesando.has(id)) return;
    setProcesando(prev => new Set(prev).add(id));
    try {
      if (falta) {
        await eliminarFalta(falta.id);
        mutate();
      }
      await fetch('/api/presentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId, fecha: selectedDate }),
      });
      mutatePresentes();
      toast.success("Presente registrado correctamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar presente";
      toast.error(message);
    } finally {
      setProcesando(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // ==== REGISTRAR FALTA (directo, sin modal) ====
  const handleRegistrarFalta = async (emp: any) => {
    const id = String(emp.id);
    if (procesando.has(id)) return;
    setProcesando(prev => new Set(prev).add(id));
    try {
      const res = await fetch("/api/faltas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleadoId: emp.id,
          fecha: selectedDate,
          motivo: "Inasistencia",
          observaciones: null,
          justificada: false,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al registrar falta");
      }
      await fetch('/api/presentes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId: String(emp.id), fecha: selectedDate }),
      });
      mutatePresentes();
      toast.success("Falta registrada correctamente");
      mutate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar falta";
      toast.error(message);
    } finally {
      setProcesando(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // ==== MANEJAR CAMBIO DE FECHA ====
  const handleDateChange = (newDate: string) => {
    const fechaSeleccionada = new Date(newDate);
    const hoy = new Date(today);

    //if (fechaSeleccionada > hoy) {
    //toast.warning("No se pueden consultar fechas futuras");
    //return;
    //}

    setSelectedDate(newDate);
  };

  if (loadingEmpleados || loadingFaltas) return <LoadingSpinner />;
  if (errorEmpleados || errorFaltas)
    return (
      <div className="text-center text-red-500 dark:text-red-400 py-8">
        Error cargando datos
      </div>
    );

  return (
    <div className="container mx-auto p-6">
      <ToastContainer theme="colored" />

      {/* Header con botón de consultas */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Control de Faltas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona las faltas e inasistencias del personal
          </p>
        </div>

        {/* Botones agrupados */}

        <div className="flex items-center gap-3">
          <button
            onClick={abrirModalConsulta}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
              dark:bg-blue-500 dark:hover:bg-blue-600
              text-white rounded-lg font-medium transition-colors shadow-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <FileSearch className="w-5 h-5" />
            Consultar Faltas
          </button>

          <ExportData
            employees={empleadosParaExportar}
            stats={{
              total: empleadosParaExportar.length,
              activos: empleadosParaExportar.filter(emp => !empleadosConFalta.includes(emp.id)).length,
              ausentes: empleadosConFalta.length,
              enLicencia: 0,
              inactivo: 0,
            }}
            faltasDelDia={(faltas ?? []).map(f => ({
              ...f,
              observaciones: f.observaciones ?? undefined
            }))}
            fechaSeleccionada={selectedDate}
            calcularEstado={(empleado) => {
              return empleadosConFalta.includes(empleado.id) ? 'ausente' : 'presente';
            }}
            mode="faltas"
            presentesDelDia={Array.from(presentesExplicitos)}
            licenciasDelDia={(licenciasDelDia ?? []) as any[]}
            sancionesDelDia={(sancionesDelDia ?? []) as any[]}
            turnosEfectivosDelDia={turnosEfectivosDelDia ?? []}
/>
        </div>
      </div>

      {/* Alerta de fecha futura */}
      {/*{esFechaFutura && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              No se pueden consultar fechas futuras. Por favor selecciona una fecha válida.
            </p>
          </div>
        </div>
      )}*/}

      {/* Info del grupo que trabaja */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <span className="font-semibold">Grupo que trabaja:</span> Grupo {grupoQueTrabaja}
        </p>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6 transition-colors">

        {/* 👇 Búsqueda - ocupa toda la línea */}
        <div className="md:col-span-4">
          <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 dark:text-gray-300">
            <FileSearch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Buscar Empleado
          </label>
          <input
            type="text"
            placeholder="Escribe el nombre o apellido del empleado..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 
        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
        placeholder:text-gray-400 dark:placeholder:text-gray-500
        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
        focus:border-transparent transition-all"
          />
        </div>




        {/* Fecha */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 dark:text-gray-300">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Fecha
          </label>
          <CustomDatePicker
            id="fecha-faltas"
            value={selectedDate}
            onChange={handleDateChange}
            minDate={new Date(2024, 0, 1)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 dark:text-gray-300">
            <UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Rol
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                    focus:border-transparent transition-all"
          >
            <option value="TODOS">Todos los roles</option>
            {rolesDisponibles.map((rol) => (
              <option key={rol} value={rol}>
                {rol}
              </option>
            ))}
          </select>
        </div>

        {/* Turno */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 dark:text-gray-300">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Turno
          </label>
          <select
            value={selectedTurno}
            onChange={(e) => setSelectedTurno(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                  focus:border-transparent transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedRole === "TODOS"}
          >
            <option value="TODOS">Todos los Horarios</option>
            {selectedRole !== "TODOS" &&
              turnosDisponibles.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
          </select>
        </div>


      </div>

      {/* === LISTADO === */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-colors">
        {/* Header tabla */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Empleados de {formatDate(selectedDate)}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total: {empleadosDelDia.length} empleado(s) del Grupo {grupoQueTrabaja}
          </p>
        </div>

        {/* Contenido */}
        {empleadosDelDia.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay empleados</p>
            <p className="text-sm">
              Para los filtros seleccionados (Grupo {grupoQueTrabaja})
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Turno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Apellido y Nombre
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {empleadosDelDia.slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA).map((emp) => {
                  const falta = faltas?.find((f) => f.empleadoId === emp.id);
                  const enFalta = !!falta;
                  const enLicencia = empleadosConLicencia.has(emp.id);
                  const enSancion = empleadosConSancion.has(String(emp.id));
                  const esPresenteExplicito = presentesExplicitos.has(String(emp.id));
                  const turnoGanado = turnosEfectivosDelDia.find((t: any) => t.tipo === 'GANADO' && t.empleadoId === emp.id);
                  const horarioMostrar = turnoGanado ? turnoGanado.horarioEfectivo : emp.horario;
                  const esFechaHoy = selectedDate === today;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-400">
                        {horarioMostrar}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium text-gray-900 dark:text-white">
                        {emp.apellido}, {emp.nombre}
                        {turnoGanado?.companero && (
                          <span className="ml-2 text-xs font-normal text-amber-400 dark:text-amber-300">
                            (cambio x {turnoGanado.companero})
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                          {emp.rol}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {enLicencia ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200">
                            <Calendar className="w-4 h-4" /> Licencia
                          </span>
                        ) : enSancion ? (
                          // 4. Mostrar Badge de Sanción
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200">
                            <AlertCircle className="w-4 h-4" /> Sancionado
                          </span>
                        ) : enFalta ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
                            <XCircle className="w-4 h-4" /> Falta
                          </span>
                        ) : (
                          esPresenteExplicito ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                              <CheckCircle className="w-4 h-4" /> Presente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )
                        )}
                      </td>


                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(enLicencia || enSancion) ? (
                          <span className="text-sm text-gray-500 italic">
                            {enLicencia ? "En licencia" : "Sancionado"}
                          </span>
                        ) : (
                          <div className="flex gap-2 justify-center items-center min-w-[200px]">

                            <button
                              onClick={() => !(esPresenteExplicito && !enFalta) && handleRegistrarPresente(String(emp.id), falta || undefined)}
                              disabled={procesando.has(String(emp.id)) || (esPresenteExplicito && !enFalta || !esFechaHoy)}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors
                                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                                dark:focus:ring-offset-gray-800 text-white
                                ${procesando.has(String(emp.id)) || (esPresenteExplicito && !enFalta || !esFechaHoy)
                                  ? "bg-green-300 dark:bg-green-900 cursor-not-allowed opacity-50"
                                  : "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                                }`}
                              >
                                Presente
                              </button>
                              <button
                                onClick={() => !enFalta && handleRegistrarFalta(emp)}
                                disabled={procesando.has(String(emp.id)) || enFalta || !esFechaHoy}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors
                                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                                dark:focus:ring-offset-gray-800 text-white
                                ${procesando.has(String(emp.id)) || enFalta || !esFechaHoy
                                    ? "bg-red-300 dark:bg-red-900 cursor-not-allowed opacity-50"
                                    : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                                  }`}
                              >
                                Falta
                              </button>

                                <button
                                  title="Limpiar estado"
                                  onClick={async () => {
                                    const id = String(emp.id);
                                    if (procesando.has(id)) return;
                                    setProcesando(prev => new Set(prev).add(id));
                                    try {
                                      if (enFalta) {
                                        await eliminarFalta(falta!.id);
                                        mutate();
                                      }
                                      await fetch('/api/presentes', {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ empleadoId: id, fecha: selectedDate }),
                                      });
                                      mutatePresentes();
                                      toast.success("Estado limpiado");
                                    } finally {
                                      setProcesando(prev => { const s = new Set(prev); s.delete(id); return s; });
                                    }
                                  }}
                                disabled={procesando.has(String(emp.id)) || (!enFalta && !esPresenteExplicito || !esFechaHoy)}
                                className={`p-2 rounded-lg transition-colors
                                  ${(enFalta || esPresenteExplicito) && esFechaHoy
                                    ? "text-gray-400 hover:text-white hover:bg-gray-600 dark:hover:bg-gray-500 cursor-pointer"
                                    : "invisible cursor-default"
                                  }`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {empleadosDelDia.length > ITEMS_POR_PAGINA && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1}–{Math.min(paginaActual * ITEMS_POR_PAGINA, empleadosDelDia.length)} de {empleadosDelDia.length} empleados
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
              Página {paginaActual} de {Math.ceil(empleadosDelDia.length / ITEMS_POR_PAGINA)}
            </span>
            <button
              onClick={() => setPaginaActual(p => Math.min(Math.ceil(empleadosDelDia.length / ITEMS_POR_PAGINA), p + 1))}
              disabled={paginaActual === Math.ceil(empleadosDelDia.length / ITEMS_POR_PAGINA)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal Consultar Historial */}
      <ModalConsultaFaltas
        open={modalConsultaOpen}
        onClose={() => setModalConsultaOpen(false)}
        registros={registrosAusencias}
        empleados={empleados || []}
      />

    </div>
  );
}