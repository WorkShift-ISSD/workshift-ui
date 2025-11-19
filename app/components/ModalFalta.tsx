"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "react-toastify";

interface ModalFaltaProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  falta?: any;
  empleado: any; // ✅ Cambiado de string a any para recibir el objeto completo
  fecha?: string;
}

export default function ModalFalta({ open, onClose, onSaved, falta, empleado, fecha }: ModalFaltaProps) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      causa: "", // ✅ Cambiado de 'tipo' a 'causa' para coincidir con la API
      observaciones: "", // ✅ Cambiado de 'descripcion'
      fecha: fecha || "", // ✅ Usa la fecha pasada por prop
      justificada: false,
    },
  });

  useEffect(() => {
    if (falta) {
      reset({
        causa: falta.causa,
        observaciones: falta.observaciones,
        fecha: falta.fecha?.slice(0, 10),
        justificada: falta.justificada || false,
      });
    } else {
      reset({
        causa: "",
        observaciones: "",
        fecha: fecha || "",
        justificada: false,
      });
    }
  }, [falta, fecha, reset]);

  if (!open) return null;

  const guardar = async (data: any) => {
    try {
      const url = falta
        ? `/api/faltas/${falta.id}`
        : `/api/faltas`;

      const method = falta ? "PUT" : "POST";

      const payload = {
        ...data,
        empleadoId: empleado.id, // ✅ Agrega el ID del empleado
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar");
      }

      toast.success("Falta guardada correctamente");
      onSaved(); // ✅ Llama al callback sin parámetros
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar la falta";
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">

        <h2 className="text-xl font-bold mb-4">
          {falta ? "Editar Falta" : `Registrar Falta - ${empleado.apellido}, ${empleado.nombre}`}
        </h2>

        <form onSubmit={handleSubmit(guardar)} className="flex flex-col gap-4">

          <select
            {...register("causa")}
            className="border p-2 rounded"
            required
          >
            <option value="">Seleccionar causa</option>
            <option value="Inasistencia">Inasistencia</option>
            <option value="Llegada tarde">Llegada tarde</option>
            <option value="Incumplimiento">Incumplimiento</option>
            <option value="Licencia sin aviso">Licencia sin aviso</option>
            <option value="Otro">Otro</option>
          </select>

          <input
            type="date"
            {...register("fecha")}
            className="border p-2 rounded"
            required
          />

          <textarea
            {...register("observaciones")}
            placeholder="Observaciones (opcional)"
            className="border p-2 rounded"
            rows={3}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("justificada")}
              className="w-4 h-4"
            />
            <span>Falta justificada</span>
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}