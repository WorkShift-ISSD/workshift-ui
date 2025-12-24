"use client";

import { useState } from "react";
import { X, Check, XCircle, Calendar, User, FileText, Clock } from "lucide-react";
import { Autorizacion } from "@/app/api/types";
import { toast } from "react-toastify";

interface Props {
  open: boolean;
  onClose: () => void;
  autorizacion: Autorizacion | null;
  onAprobar: (id: string, observaciones?: string) => Promise<void>;
  onRechazar: (id: string, observaciones: string) => Promise<void>;
}

export function ModalAutorizacion({
  open,
  onClose,
  autorizacion,
  onAprobar,
  onRechazar,
}: Props) {
  const [observaciones, setObservaciones] = useState("");
  const [showConfirmAprobar, setShowConfirmAprobar] = useState(false);
  const [showConfirmRechazar, setShowConfirmRechazar] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "-";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  const handleAprobar = async () => {
    if (!autorizacion) return;

    setLoading(true);
    try {
      await onAprobar(autorizacion.id, observaciones || undefined);
      toast.success("Autorización aprobada exitosamente");
      setShowConfirmAprobar(false);
      setObservaciones("");
      onClose();
    } catch (error) {
      toast.error("Error al aprobar la autorización");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!autorizacion) return;

    if (!observaciones || observaciones.trim().length < 10) {
      toast.error("Debes especificar el motivo del rechazo (mínimo 10 caracteres)");
      return;
    }

    setLoading(true);
    try {
      await onRechazar(autorizacion.id, observaciones);
      toast.success("Autorización rechazada");
      setShowConfirmRechazar(false);
      setObservaciones("");
      onClose();
    } catch (error) {
      toast.error("Error al rechazar la autorización");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !autorizacion) return null;

  const isPendiente = autorizacion.estado === "PENDIENTE";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detalle de Autorización
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getTipoLabel(autorizacion.tipo)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Información del Empleado */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Empleado Solicitante
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nombre</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {autorizacion.empleado
                      ? `${autorizacion.empleado.apellido}, ${autorizacion.empleado.nombre}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rol</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {autorizacion.empleado?.rol || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Información de la Solicitud */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Información de la Solicitud
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tipo</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getTipoLabel(autorizacion.tipo)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fecha Solicitud</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatearFecha(autorizacion.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {autorizacion.estado}
                  </p>
                </div>
                {autorizacion.fechaAprobacion && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Fecha de Respuesta
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatearFecha(autorizacion.fechaAprobacion)}
                    </p>
                  </div>
                )}
              </div>

              {/* IDs de referencia */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {autorizacion.solicitudId && `Solicitud ID: ${autorizacion.solicitudId}`}
                  {autorizacion.ofertaId && `Oferta ID: ${autorizacion.ofertaId}`}
                  {autorizacion.licenciaId && `Licencia ID: ${autorizacion.licenciaId}`}
                </p>
              </div>
            </div>

            {/* Observaciones existentes */}
            {autorizacion.observaciones && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Observaciones:
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  {autorizacion.observaciones}
                </p>
              </div>
            )}

            {/* Aprobador (si ya fue procesada) */}
            {autorizacion.aprobador && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {autorizacion.estado === "APROBADA" ? "Aprobada por:" : "Rechazada por:"}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {`${autorizacion.aprobador.apellido}, ${autorizacion.aprobador.nombre}`}
                </p>
              </div>
            )}

            {/* Campo de observaciones para aprobar/rechazar */}
            {isPendiente && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Observaciones {autorizacion.estado === "PENDIENTE" && "(opcional para aprobar, obligatorio para rechazar)"}
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Agregar observaciones..."
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {observaciones.length} caracteres
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cerrar
              </button>

              {isPendiente && (
                <>
                  <button
                    onClick={() => setShowConfirmRechazar(true)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                  <button
                    onClick={() => setShowConfirmAprobar(true)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Aprobar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación - APROBAR */}
      {showConfirmAprobar && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Confirmar Aprobación
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro que deseas aprobar esta autorización?
              {autorizacion.tipo === "CAMBIO_TURNO" && (
                <span className="block mt-2 text-sm">
                  El cambio de turno se hará efectivo inmediatamente.
                </span>
              )}
              {autorizacion.tipo === "LICENCIA_ORDINARIA" && (
                <span className="block mt-2 text-sm">
                  La licencia ordinaria será aprobada.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmAprobar(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprobar}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Aprobando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar Aprobación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación - RECHAZAR */}
      {showConfirmRechazar && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Confirmar Rechazo
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro que deseas rechazar esta autorización?
            </p>
            {(!observaciones || observaciones.trim().length < 10) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-400">
                  ⚠️ Debes especificar el motivo del rechazo (mínimo 10 caracteres)
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmRechazar(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={loading || !observaciones || observaciones.trim().length < 10}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Rechazando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirmar Rechazo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}