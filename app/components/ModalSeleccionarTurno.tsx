"use client";

import { useState } from "react";
import { X, Calendar, Clock, CheckCircle } from "lucide-react";

interface TurnoOpcion {
  fecha: string;
  horario: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (turnoSeleccionado: TurnoOpcion) => void;
  oferta: {
    id: string;
    ofertante: {
      nombre: string;
      apellido: string;
    };
    turnoOfrece?: TurnoOpcion;
    turnosBusca?: TurnoOpcion[];
  } | null;
}

export function ModalSeleccionarTurno({ isOpen, onClose, onConfirmar, oferta }: Props) {
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoOpcion | null>(null);

  if (!isOpen || !oferta) return null;

  const opciones = oferta.turnosBusca || [];

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "N/A";
    const [year, month, day] = fecha.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleConfirmar = () => {
    if (turnoSeleccionado) {
      onConfirmar(turnoSeleccionado);
      setTurnoSeleccionado(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Seleccionar Turno
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Oferta de {oferta.ofertante.nombre} {oferta.ofertante.apellido}
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
        <div className="p-6 space-y-4">
          {/* Turno que ofrece */}
          {oferta.turnoOfrece && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                📅 Turno disponible:
              </p>
              <div className="flex items-center gap-4 text-sm text-blue-800 dark:text-blue-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatearFecha(oferta.turnoOfrece.fecha)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {oferta.turnoOfrece.horario}
                </span>
              </div>
            </div>
          )}

          {/* Opciones de turnos a cambio */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              🔄 Selecciona el turno que ofrecerás a cambio:
            </p>

            {opciones.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay opciones disponibles
              </p>
            ) : (
              <div className="space-y-2">
                {opciones.map((opcion, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      turnoSeleccionado?.fecha === opcion.fecha &&
                      turnoSeleccionado?.horario === opcion.horario
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="turno"
                      checked={
                        turnoSeleccionado?.fecha === opcion.fecha &&
                        turnoSeleccionado?.horario === opcion.horario
                      }
                      onChange={() => setTurnoSeleccionado(opcion)}
                      className="w-5 h-5 text-green-600 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          {formatearFecha(opcion.fecha)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          {opcion.horario}
                        </span>
                      </div>
                    </div>
                    {turnoSeleccionado?.fecha === opcion.fecha &&
                      turnoSeleccionado?.horario === opcion.horario && (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Mensaje de advertencia */}
          {turnoSeleccionado && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ Al confirmar, se creará una solicitud pendiente de autorización del Jefe.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                       hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!turnoSeleccionado}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmar Intercambio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}