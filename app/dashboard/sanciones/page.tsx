"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useSanciones } from "@/hooks/useSanciones";
import { SancionesTable } from "@/app/components/sanciones/SancionesTable";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useAuth } from "@/app/context/AuthContext";
import ImportarSancionesModal from "@/app/components/sanciones/ImportarSancionesModal";


export default function SancionesPage() {
  const { sanciones, loading, cargarSanciones } = useSanciones();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const stats = useMemo(() => {
    return {
      total: sanciones.length,
      activas: sanciones.filter((s) => s.estado === "ACTIVA").length,
      finalizadas: sanciones.filter((s) => s.estado === "FINALIZADA").length,
      anuladas: sanciones.filter((s) => s.estado === "ANULADA").length,
    };
  }, [sanciones]);

  return (
    <div className="container mx-auto p-6">
      <ToastContainer theme="colored" />

      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestión de Sanciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Registro y consulta de sanciones vigentes
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
          { label: "Activas", value: stats.activas, icon: AlertTriangle },
          { label: "Finalizadas", value: stats.finalizadas, icon: CheckCircle },
          { label: "Anuladas", value: stats.anuladas, icon: XCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex justify-between items-center"
          >
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {label}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
            </div>
            <Icon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        ))}
      </div>

      {/* TABLA + MODAL (todo vive adentro) */}
      <SancionesTable sanciones={sanciones} loading={loading} onRecargar={cargarSanciones} />

      {isImportModalOpen && (
        <ImportarSancionesModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            cargarSanciones();
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
