"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "react-toastify";

interface ModalFaltaProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  falta?: any; // si viene con datos => estoy editando
}

export default function ModalFalta({ open, onClose, onSaved, falta }: ModalFaltaProps) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      tipo: "",
      descripcion: "",
      fecha: "",
    },
  });

  useEffect(() => {
    if (falta) {
      reset({
        tipo: falta.tipo,
        descripcion: falta.descripcion,
        fecha: falta.fecha?.slice(0, 10),
      });
    } else {
      reset({
        tipo: "",
        descripcion: "",
        fecha: "",
      });
    }
  }, [falta, reset]);

  if (!open) return null;

  const guardar = async (data: any) => {
    try {
      const url = falta
        ? `/api/faltas/${falta.id}`
        : `/api/faltas`;

      const method = falta ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast.success("Falta guardada correctamente");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Error al guardar la falta");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">

        <h2 className="text-xl font-bold mb-4">
          {falta ? "Editar Falta" : "Registrar Falta"}
        </h2>

        <form onSubmit={handleSubmit(guardar)} className="flex flex-col gap-4">

          <select
            {...register("tipo")}
            className="border p-2 rounded"
            required
          >
            <option value="">Seleccionar tipo</option>
            <option value="Inasistencia">Inasistencia</option>
            <option value="Llegada tarde">Llegada tarde</option>
            <option value="Incumplimiento">Incumplimiento</option>
          </select>

          <input
            type="date"
            {...register("fecha")}
            className="border p-2 rounded"
            required
          />

          <textarea
            {...register("descripcion")}
            placeholder="Descripción"
            className="border p-2 rounded"
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Guardar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
