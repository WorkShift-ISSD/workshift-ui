"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useAutorizaciones } from "@/hooks/useAutorizaciones";
import { AutorizacionesTable } from "@/app/components/autorizaciones/AutorizacionesTable";
import { ConsultarAutorizaciones } from "@/app/components/autorizaciones/ConsultarAutorizaciones";
import { useDashboardJefe } from '@/hooks/useDashboardJefe';
import { useAuth } from '@/app/context/AuthContext';

type Tab = 'autorizaciones' | 'consultar';

export default function AutorizacionesPage() {
  const [tab, setTab] = useState<Tab>('autorizaciones');
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>(undefined);
  const { user } = useAuth();
  const esJefe = user?.rol === 'JEFE' || user?.rol === 'ADMINISTRADOR';

  const {
    autorizaciones,
    loading,
    aprobarAutorizacion,
    rechazarAutorizacion
  } = useAutorizaciones(filtroEstado);

  // Las canceladas van al historial (tab Consultar), no al panel de gestión
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setTab('autorizaciones')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'autorizaciones'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Autorizaciones
          {stats.pendientes > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {stats.pendientes}
            </span>
          )}
        </button>
        {esJefe && (
          <button
            onClick={() => setTab('consultar')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === 'consultar'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Consultar
          </button>
        )}
      </div>

      {tab === 'autorizaciones' && (
        <>
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

          <AutorizacionesTable
            autorizaciones={autorizacionesVisibles}
            loading={loading}
            onAprobar={aprobarAutorizacion}
            onRechazar={rechazarAutorizacion}
            impactoMap={impactoMap}
          />
        </>
      )}

      {tab === 'consultar' && <ConsultarAutorizaciones />}
    </div>
  );
}
