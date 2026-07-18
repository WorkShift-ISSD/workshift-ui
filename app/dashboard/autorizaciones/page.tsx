"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useAutorizaciones } from "@/hooks/useAutorizaciones";
import { AutorizacionesTable } from "@/app/components/autorizaciones/AutorizacionesTable";
import { ConsultarAutorizaciones } from "@/app/components/autorizaciones/ConsultarAutorizaciones";
import { CustomDatePicker } from "@/app/components/CustomDatePicker";
import { useDashboardJefe } from '@/hooks/useDashboardJefe';
import { useAuth } from '@/app/context/AuthContext';

export default function AutorizacionesPage() {
  // Arranca en Pendientes: es lo que un jefe necesita resolver primero.
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>("PENDIENTE");
  const [historialAbierto, setHistorialAbierto] = useState(false);
  // El filtro de fecha no aplica a Pendientes: ahí lo que importa es resolver, no buscar en el tiempo.
  const [rangoFecha, setRangoFecha] = useState<'' | 'hoy' | 'semana' | 'mes' | 'personalizado'>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const mostrarFiltroFecha = filtroEstado !== "PENDIENTE";

  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const aplicarRango = (preset: typeof rangoFecha) => {
    setRangoFecha(preset);
    const hoy = new Date();
    if (preset === 'hoy') {
      setDesde(toISODate(hoy));
      setHasta(toISODate(hoy));
    } else if (preset === 'semana') {
      const diaSemana = hoy.getDay(); // 0 = domingo
      const offsetLunes = diaSemana === 0 ? 6 : diaSemana - 1;
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - offsetLunes);
      setDesde(toISODate(lunes));
      setHasta(toISODate(hoy));
    } else if (preset === 'mes') {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setDesde(toISODate(primerDia));
      setHasta(toISODate(hoy));
    } else if (preset === '') {
      setDesde('');
      setHasta('');
    }
    // 'personalizado' deja desde/hasta como estén para que el usuario los edite
  };
  const { user } = useAuth();
  const esJefe = user?.rol === 'JEFE' || user?.rol === 'ADMINISTRADOR';

  const {
    autorizaciones,
    loading,
    aprobarAutorizacion,
    rechazarAutorizacion
  } = useAutorizaciones(filtroEstado);

  // Las canceladas van al historial completo, no al panel de gestión
  const autorizacionesVisibles = useMemo(() =>
    autorizaciones.filter(a => a.estado !== "CANCELADA"),
    [autorizaciones]
  );

  const stats = useMemo(() => ({
    total: autorizacionesVisibles.length,
    pendientes: autorizacionesVisibles.filter((a) => a.estado === "PENDIENTE").length,
    aprobadas: autorizacionesVisibles.filter((a) => a.estado === "APROBADA").length,
    rechazadas: autorizacionesVisibles.filter((a) => a.estado === "RECHAZADA").length,
  }), [autorizacionesVisibles]);

  const { pendientes } = useDashboardJefe();
  const impactoMap = Object.fromEntries(pendientes.map(p => [p.id, p.impacto]));

  const autorizacionesFiltradas = useMemo(() => {
    if (!mostrarFiltroFecha || (!desde && !hasta)) return autorizacionesVisibles;
    return autorizacionesVisibles.filter((a) => {
      const fecha = a.createdAt?.slice(0, 10);
      if (!fecha) return true;
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    });
  }, [autorizacionesVisibles, desde, hasta, mostrarFiltroFecha]);

  return (
    <div className="container mx-auto p-6">
      <ToastContainer theme="colored" position="top-right" />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestión de Autorizaciones
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Aprobar o rechazar solicitudes de cambios de turno y licencias ordinarias
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <ClipboardCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendientes}</p>
          </div>
          <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.aprobadas}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rechazadas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rechazadas}</p>
          </div>
          <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button onClick={() => setFiltroEstado(undefined)}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition ${filtroEstado === undefined ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            Todas
          </button>
          <button onClick={() => setFiltroEstado("PENDIENTE")}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition ${filtroEstado === "PENDIENTE" ? "bg-yellow-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            Pendientes ({stats.pendientes})
          </button>
          <button onClick={() => setFiltroEstado("APROBADA")}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition ${filtroEstado === "APROBADA" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            Aprobadas
          </button>
          <button onClick={() => setFiltroEstado("RECHAZADA")}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition ${filtroEstado === "RECHAZADA" ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            Rechazadas
          </button>
        </div>
      </div>

      {/* Filtro de fecha: solo tiene sentido cuando no estás mirando lo pendiente de resolver */}
      {mostrarFiltroFecha && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Periodo</label>
              <select
                value={rangoFecha}
                onChange={(e) => aplicarRango(e.target.value as typeof rangoFecha)}
                className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
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
              </>
            )}
            {rangoFecha !== '' && (
              <button onClick={() => aplicarRango('')}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors self-end pb-2">
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      <AutorizacionesTable
        autorizaciones={autorizacionesFiltradas}
        loading={loading}
        onAprobar={aprobarAutorizacion}
        onRechazar={rechazarAutorizacion}
        impactoMap={impactoMap}
      />

      {/* Historial completo: plegado por defecto para no competir con la tabla de gestión */}
      {esJefe && (
        <div className="mt-8">
          <button
            onClick={() => setHistorialAbierto(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            {historialAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {historialAbierto ? "Ocultar historial completo" : "Ver historial completo"}
          </button>
          {historialAbierto && (
            <div className="mt-4">
              <ConsultarAutorizaciones />
            </div>
          )}
        </div>
      )}
    </div>
  );
}