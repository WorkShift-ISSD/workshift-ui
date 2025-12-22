"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sancion } from "@/app/api/types";
import { useSanciones } from "@/hooks/useSanciones";

type ModalMode = "create" | "view" | "edit";

interface Props {
  open: boolean;
  onClose: () => void;
  modo: ModalMode;
  sancion: Sancion | null;
}

export function ModalSancion({
  open,
  onClose,
  modo,
  sancion,
}: Props) {
  const { crearSancion, actualizarSancion } = useSanciones();

  const [form, setForm] = useState({
    empleado_id: "",
    motivo: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const soloLectura = modo === "view";

  /* Cargar datos al abrir */
  useEffect(() => {
    if (sancion) {
      setForm({
        empleado_id: sancion.empleado_id,
        motivo: sancion.motivo,
        fecha_desde: sancion.fecha_desde,
        fecha_hasta: sancion.fecha_hasta,
      });
    } else {
      setForm({
        empleado_id: "",
        motivo: "",
        fecha_desde: "",
        fecha_hasta: "",
      });
    }
  }, [sancion, open]);
  

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (modo === "create") {
      await crearSancion(form);
    }

    if (modo === "edit" && sancion) {
      await actualizarSancion(sancion.id, form);
    }

    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6 relative">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold dark:text-gray-200">
            {modo === "create" && "Nueva sanción"}
            {modo === "view" && "Detalle de sanción"}
            {modo === "edit" && "Editar sanción"}
          </h3>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1 dark:text-gray-400">EMPLEADO</label>
            <input
              name="empleado_id"
              value={form.empleado_id}
              onChange={handleChange}
              disabled={soloLectura || modo !== "create"}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 dark:text-gray-400">Motivo</label>
            <textarea
              name="motivo"
              value={form.motivo}
              onChange={handleChange}
              disabled={soloLectura}
              className="w-full border rounded p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 dark:text-gray-400">Desde</label>
              <input
                type="date"
                name="fecha_desde"
                value={form.fecha_desde}
                onChange={handleChange}
                disabled={soloLectura}
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 dark:text-gray-400">Hasta</label>
              <input
                type="date"
                name="fecha_hasta"
                value={form.fecha_hasta}
                onChange={handleChange}
                disabled={soloLectura}
                className="w-full border rounded p-2"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Cerrar
          </button>

          {modo !== "view" && (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
