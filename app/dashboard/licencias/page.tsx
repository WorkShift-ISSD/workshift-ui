"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  FileSearch,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLicencias } from "@/hooks/useLicencias";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useFormatters } from "@/hooks/useFormatters";
import { LicenciaForm } from "@/app/components/licencias/LicenciaForm";
import { LicenciasTable } from "@/app/components/licencias/LicenciasTable";
import { useAuth } from "@/app/context/AuthContext";
import ImportarLicenciasModal from "@/app/components/licencias/ImportarLicenciasModal";


export default function LicenciasPage() {
  const { getTodayDate } = useFormatters();
  const today = getTodayDate();


  const { licencias, crearLicencia, loading, refetch } = useLicencias();
  const { empleados } = useEmpleados();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Arranca en Pendientes, igual que en Autorizaciones.
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>("PENDIENTE");


  const licenciasActivos = useMemo(
    () => licencias.filter(l => empleados?.some(e => e.id === l.empleado_id)),
    [licencias, empleados],
  );

  const stats = useMemo(() => {
    return {
      total: licenciasActivos.length,
      solicitadas: licenciasActivos.filter(l => l.estado === "PENDIENTE").length,
      aprobadas: licenciasActivos.filter(l => l.estado === "APROBADA").length,
      rechazadas: licenciasActivos.filter(l => l.estado === "RECHAZADA").length,
    };
  }, [licenciasActivos]);



  return (
    <div className="container mx-auto p-6">
      <ToastContainer theme="colored" />

      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestión de Licencias
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Solicita y consulta tus licencias
          </p>
        </div>
        {/* {isAdmin && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Importar Excel
          </button>
        )} */}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, icon: ClipboardList },
          { label: "Solicitadas", value: stats.solicitadas, icon: AlertCircle },
          { label: "Aprobadas", value: stats.aprobadas, icon: CheckCircle },
          { label: "Rechazadas", value: stats.rechazadas, icon: XCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center"
          >
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
            </div>
            <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        ))}
      </div>

      {/* FORMULARIO */}
      <LicenciaForm />

      {/* Filtros por estado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button onClick={() => setFiltroEstado(undefined)}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition ${filtroEstado === undefined ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            Todas
          </button>
          <button onClick={() => setFiltroEstado("PENDIENTE")}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition ${filtroEstado === "PENDIENTE" ? "bg-yellow-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            Pendientes ({stats.solicitadas})
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

      {/* LISTADO */}
      <LicenciasTable licencias={licencias} onRefetch={refetch} filtroEstado={filtroEstado} />

      {isImportModalOpen && (
        <ImportarLicenciasModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            refetch();
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}