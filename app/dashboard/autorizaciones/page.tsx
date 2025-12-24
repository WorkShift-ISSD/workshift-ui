"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Clock, CheckCircle, XCircle } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useAutorizaciones } from "@/hooks/useAutorizaciones";
import { AutorizacionesTable } from "@/app/components/autorizaciones/AutorizacionesTable";

export default function AutorizacionesPage() {
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>(undefined);
  
  const { 
    autorizaciones, 
    loading, 
    aprobarAutorizacion, 
    rechazarAutorizacion 
  } = useAutorizaciones(filtroEstado);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: autorizaciones.length,
      pendientes: autorizaciones.filter((a) => a.estado === "PENDIENTE").length,
      aprobadas: autorizaciones.filter((a) => a.estado === "APROBADA").length,
      rechazadas: autorizaciones.filter((a) => a.estado === "RECHAZADA").length,
    };
  }, [autorizaciones]);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </p>
          </div>
          <ClipboardCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.pendientes}
            </p>
          </div>
          <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.aprobadas}
            </p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rechazadas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.rechazadas}
            </p>
          </div>
          <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroEstado(undefined)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filtroEstado === undefined
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroEstado("PENDIENTE")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filtroEstado === "PENDIENTE"
                ? "bg-yellow-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Pendientes ({stats.pendientes})
          </button>
          <button
            onClick={() => setFiltroEstado("APROBADA")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filtroEstado === "APROBADA"
                ? "bg-green-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFiltroEstado("RECHAZADA")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filtroEstado === "RECHAZADA"
                ? "bg-red-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Rechazadas
          </button>
        </div>
      </div>

      {/* Tabla */}
      <AutorizacionesTable
        autorizaciones={autorizaciones}
        loading={loading}
        onAprobar={aprobarAutorizacion}
        onRechazar={rechazarAutorizacion}
      />
    </div>
  );
}