"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "react-toastify";

interface ModalFaltaProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  falta?: any;
  empleado: any;
  fecha?: string;
}

export default function ModalFalta({ 
  open, 
  onClose, 
  onSaved, 
  falta, 
  empleado, 
  fecha 
}: ModalFaltaProps) {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      motivo: "",
      observaciones: "",
      fecha: fecha || "",
      justificada: false,
    },
  });

  // Obtener la fecha actual en formato YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getTodayDate();

  useEffect(() => {
    if (falta) {
      reset({
        motivo: falta.motivo || falta.causa || "", // Soportar ambos nombres
        observaciones: falta.observaciones || "",
        fecha: falta.fecha?.split('T')[0] || fecha || "",
        justificada: falta.justificada || false,
      });
    } else {
      reset({
        motivo: "",
        observaciones: "",
        fecha: fecha || "",
        justificada: false,
      });
    }
  }, [falta, fecha, reset]);

  if (!open) return null;

  const guardar = async (data: any) => {
    try {
      // Validar que la fecha no sea futura
      if (data.fecha > today) {
        toast.error("No se puede registrar una falta en una fecha futura");
        return;
      }

      const url = falta ? `/api/faltas/${falta.id}` : `/api/faltas`;
      const method = falta ? "PUT" : "POST";

      // Normalizar la fecha (solo YYYY-MM-DD)
      const fechaNormalizada = data.fecha.split('T')[0];

      const payload = {
        empleadoId: empleado.id,
        fecha: fechaNormalizada,
        motivo: data.motivo,
        observaciones: data.observaciones || null,
        justificada: data.justificada,
      };

      console.log("📤 Enviando falta:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar");
      }

      const resultado = await res.json();
      console.log("✅ Falta guardada:", resultado);

      toast.success("Falta guardada correctamente");
      onSaved();
      onClose();
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar la falta";
      console.error("❌ Error:", err);
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {falta 
            ? "Editar Falta" 
            : `Registrar Falta - ${empleado.apellido}, ${empleado.nombre}`
          }
        </h2>

        <form onSubmit={handleSubmit(guardar)} className="flex flex-col gap-4">
          {/* Motivo/Causa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivo de la falta <span className="text-red-500">*</span>
            </label>
            <select
              {...register("motivo")}
              className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar motivo</option>
              <option value="Inasistencia">Inasistencia</option>
              <option value="Llegada tarde">Llegada tarde</option>
              <option value="Incumplimiento">Incumplimiento</option>
              <option value="Licencia sin aviso">Licencia sin aviso</option>
              <option value="Enfermedad">Enfermedad</option>
              <option value="Asunto personal">Asunto personal</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("fecha")}
              max={today}
              className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observaciones
            </label>
            <textarea
              {...register("observaciones")}
              placeholder="Detalles adicionales (opcional)"
              className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Justificada */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("justificada")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded 
                       focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Falta justificada (con certificado o aviso previo)
            </span>
          </label>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                reset();
              }}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 
                       rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 
                       transition-colors font-medium"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg 
                       hover:bg-blue-700 dark:hover:bg-blue-600 
                       transition-colors font-medium"
            >
              {falta ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}