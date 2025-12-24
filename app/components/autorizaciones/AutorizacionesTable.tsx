"use client";

import { useState } from "react";
import { Check, X, Eye, Clock, AlertTriangle } from "lucide-react";
import { Autorizacion } from "@/app/api/types";
import { ModalAutorizacion } from "./ModalAutorizacion";

interface Props {
  autorizaciones: Autorizacion[];
  loading: boolean;
  onAprobar: (id: string, observaciones?: string) => Promise<void>;
  onRechazar: (id: string, observaciones: string) => Promise<void>;
}

export function AutorizacionesTable({
  autorizaciones,
  loading,
  onAprobar,
  onRechazar,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [autorizacionSeleccionada, setAutorizacionSeleccionada] =
    useState<Autorizacion | null>(null);

  const abrirDetalle = (autorizacion: Autorizacion) => {
    setAutorizacionSeleccionada(autorizacion);
    setModalOpen(true);
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "-";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "CAMBIO_TURNO":
        return "Cambio de Turno";
      case "LICENCIA_ORDINARIA":
        return "Licencia Ordinaria";
      default:
        return tipo;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case "APROBADA":
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            Aprobada
          </span>
        );
      case "RECHAZADA":
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
            <X className="w-3 h-3" />
            Rechazada
          </span>
        );
      case "CANCELADA":
        return (
          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
            Cancelada
          </span>
        );
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Cargando autorizaciones...
        </div>
      </div>
    );
  }

  if (autorizaciones.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay autorizaciones pendientes</p>
          <p className="text-sm mt-1">
            Cuando los empleados soliciten cambios o licencias, aparecerán aquí
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left text-gray-700 dark:text-gray-400">
                  Tipo
                </th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-400">
                  Empleado
                </th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-400">
                  Fecha Solicitud
                </th>
                <th className="p-3 text-center text-gray-700 dark:text-gray-400">
                  Estado
                </th>
                <th className="p-3 text-center text-gray-700 dark:text-gray-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {autorizaciones.map((auth) => (
                <tr
                  key={auth.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <td className="p-3 text-gray-900 dark:text-white font-medium">
                    {getTipoLabel(auth.tipo)}
                  </td>
                  <td className="p-3 text-gray-900 dark:text-white">
                    {auth.empleado
                      ? `${auth.empleado.apellido}, ${auth.empleado.nombre}`
                      : "N/A"}
                  </td>
                  <td className="p-3 text-gray-900 dark:text-white">
                    {formatearFecha(auth.createdAt)}
                  </td>
                  <td className="p-3 flex justify-center">
                    {getEstadoBadge(auth.estado)}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => abrirDetalle(auth)}
                        title="Ver detalle"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle */}
      <ModalAutorizacion
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        autorizacion={autorizacionSeleccionada}
        onAprobar={onAprobar}
        onRechazar={onRechazar}
      />
    </>
  );
}