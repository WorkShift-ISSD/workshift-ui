"use client";

import { useState } from "react";
import { useLicencias } from "@/hooks/useLicencias";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useFormatters } from "@/hooks/useFormatters";

export function LicenciaForm() {
  const { crearLicencia } = useLicencias();

  const today = new Date().toISOString().split("T")[0];

  const [tipo, setTipo] = useState("ORDINARIA");
  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [observaciones, setObservaciones] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { formatDate, formatDate2 } = useFormatters();


  const formValido =
    tipo &&
    fechaDesde &&
    fechaHasta &&
    fechaDesde >= today &&
    fechaHasta >= fechaDesde;

  const handleSubmit = async () => {
    if (!formValido) return;

    try {
      setLoading(true);

      await crearLicencia({
        tipo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        observaciones,
      });

      toast.success(
        tipo === "ORDINARIA"
          ? "Licencia enviada para autorización del jefe"
          : "Licencia aprobada correctamente"
      );

      setObservaciones("");
      setShowConfirm(false);
    } catch {
      toast.error("Error al solicitar la licencia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer theme="colored" />

      {/* FORMULARIO */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Solicitar Licencia
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TIPO */}
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Tipo de Licencia
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full border rounded-lg p-2.5
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                border-gray-300 dark:border-gray-600"
            >
              <option value="ORDINARIA">Ordinaria</option>
              <option value="MEDICA">Médica</option>
              <option value="ESPECIAL">Especial</option>
              <option value="ESTUDIO">Estudio</option>
              <option value="SIN_GOCE">Sin goce</option>

            </select>
          </div>

          {/* DESDE */}
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              min={today}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full border rounded-lg p-2.5
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* HASTA */}
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full border rounded-lg p-2.5
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* OBS */}
          <div className="md:col-span-2">
            <label className="font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full border rounded-lg p-2.5
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>

        <button
          disabled={!formValido || loading}
          onClick={() => setShowConfirm(true)}
          className={`mt-4 px-6 py-2 rounded-lg font-semibold transition-colors
            ${formValido
              ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
              : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
            }`}
        >
          Solicitar Licencia
        </button>
      </div>

      {/* MODAL CONFIRMACIÓN */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              Confirmar solicitud
            </h3>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Está por solicitar una licencia{" "}
              <span className="font-semibold">{tipo}</span>
              <br />
              desde el{" "}
              <span className="font-semibold">
                {formatDate2(fechaDesde)}
              </span>{" "}
              hasta el{" "}
              <span className="font-semibold">
                {formatDate2(fechaHasta)}
              </span>.

            </p>

            {tipo === "ORDINARIA" ? (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-6">
                ⚠️ Requiere autorización del jefe (estado pendiente)
              </p>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400 mb-6">
                ✔️ Se aprobará automáticamente
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600
                  text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancelar
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700
                  dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
