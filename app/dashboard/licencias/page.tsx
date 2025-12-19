"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  FileSearch,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLicencias } from "@/hooks/useLicencias";
import { useFormatters } from "@/hooks/useFormatters";
import { LicenciaForm } from "@/app/components/licencias/LicenciaForm";
import { LicenciasTable } from "@/app/components/licencias/LicenciasTable";


export default function LicenciasPage() {
  const { getTodayDate } = useFormatters();
  const today = getTodayDate();


  const { licencias, crearLicencia, loading } = useLicencias();


  const stats = useMemo(() => {
    return {
      total: licencias.length,
      solicitadas: licencias.filter(l => l.estado === "PENDIENTE").length,
      aprobadas: licencias.filter(l => l.estado === "APROBADA").length,
      rechazadas: licencias.filter(l => l.estado === "RECHAZADA").length,
    };
  }, [licencias]);



  return (
    <div className="container mx-auto p-6">
      <ToastContainer theme="colored" />

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestión de Licencias
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Solicita y consulta tus licencias
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

      {/* LISTADO */}
      <LicenciasTable licencias={licencias} /> 

    </div>
  );
}
