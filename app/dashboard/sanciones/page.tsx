"use client";

import { useMemo } from "react";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useSanciones } from "@/hooks/useSanciones";
import { SancionesTable } from "@/app/components/sanciones/SancionesTable";
import { useEmpleados } from "@/hooks/useEmpleados";


export default function SancionesPage() {
  const { sanciones, loading } = useSanciones();

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestión de Sanciones
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Registro y consulta de sanciones vigentes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
      <SancionesTable sanciones={sanciones} loading={loading} />
    </div>
  );
}
