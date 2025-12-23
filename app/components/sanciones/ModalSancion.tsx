"use client";

import { useEffect, useState, useRef } from "react";
import { X, Search } from "lucide-react";
import { Sancion } from "@/app/api/types";
import { useSanciones } from "@/hooks/useSanciones";
import { useEmpleados } from "@/hooks/useEmpleados";
import { toast } from "react-toastify";
import { useFormatters } from "@/hooks/useFormatters";

type ModalMode = "create" | "view" | "edit";

interface Props {
  open: boolean;
  onClose: () => void;
  modo: ModalMode;
  sancion: Sancion | null;
  onSancionCreada?: () => void;
}

export function ModalSancion({
  open,
  onClose,
  modo,
  sancion,
  onSancionCreada
}: Props) {
  const { crearSancion, actualizarSancion } = useSanciones();
  const { empleados } = useEmpleados();

  const [form, setForm] = useState({
    empleado_id: "",
    motivo: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const [errors, setErrors] = useState({
    empleado_id: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [searchEmpleado, setSearchEmpleado] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { parseFechaLocal, formatTimeAgo, formatDate, formatDate2 } = useFormatters();

  const soloLectura = modo === "view";
  const hoy = new Date().toISOString().split("T")[0];

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Cargar datos al abrir */
  useEffect(() => {
    if (sancion) {
      setForm({
        empleado_id: sancion.empleado_id,
        motivo: sancion.motivo,
        fecha_desde: sancion.fecha_desde,
        fecha_hasta: sancion.fecha_hasta,
      });
      // Cargar nombre del empleado para mostrar
      const emp = (empleados || []).find((e) => e.id === sancion.empleado_id);
      if (emp) {
        setSearchEmpleado(`${emp.apellido}, ${emp.nombre} (${emp.legajo})`);
      }
    } else {
      setForm({
        empleado_id: "",
        motivo: "",
        fecha_desde: "",
        fecha_hasta: "",
      });
      setSearchEmpleado("");
    }
    setErrors({ empleado_id: "", fecha_desde: "", fecha_hasta: "" });
    setShowConfirm(false);
    setShowSuggestions(false);
  }, [sancion, open, empleados]);

  // Filtrar empleados mientras escribe
  const empleadosFiltrados = (empleados || []).filter((emp) => {
    if (!searchEmpleado) return true;

    const searchLower = searchEmpleado.toLowerCase().trim();
    const palabras = searchLower.split(/\s+/);

    const nombreCompleto = `${emp.nombre} ${emp.apellido}`.toLowerCase();
    const legajoStr = emp.legajo?.toString() || "";

    return palabras.every(
      (palabra) =>
        nombreCompleto.includes(palabra) ||
        legajoStr.includes(palabra)
    );
  });

  const empleadoSeleccionado = empleados?.find((e) => e.id === form.empleado_id);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmpleado(e.target.value);
    setShowSuggestions(true);
    // Si borra el texto, limpiar selección
    if (!e.target.value) {
      setForm({ ...form, empleado_id: "" });
    }
  };

  const handleSelectEmpleado = (emp: any) => {
    setForm({ ...form, empleado_id: emp.id });
    setSearchEmpleado(`${emp.apellido}, ${emp.nombre} (${emp.legajo})`);
    setErrors({ ...errors, empleado_id: "" });
    setShowSuggestions(false);
  };

  const validarFormulario = () => {
    const newErrors = {
      empleado_id: "",
      fecha_desde: "",
      fecha_hasta: "",
    };

    let isValid = true;

    if (!form.empleado_id) {
      newErrors.empleado_id = "Debe seleccionar un empleado";
      isValid = false;
    }

    if (!form.fecha_desde) {
      newErrors.fecha_desde = "La fecha desde es requerida";
      isValid = false;
    } else if (form.fecha_desde < hoy) {
      newErrors.fecha_desde = "La fecha no puede ser anterior a hoy";
      isValid = false;
    }

    if (!form.fecha_hasta) {
      newErrors.fecha_hasta = "La fecha hasta es requerida";
      isValid = false;
    } else if (form.fecha_hasta < hoy) {
      newErrors.fecha_hasta = "La fecha no puede ser anterior a hoy";
      isValid = false;
    } else if (form.fecha_hasta < form.fecha_desde) {
      newErrors.fecha_hasta = "La fecha hasta debe ser posterior a la fecha desde";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleGuardarClick = () => {
    if (!validarFormulario()) {
      toast.error("Por favor corrige los errores del formulario");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmarGuardado = async () => {
    try {
      if (modo === "create") {
        await crearSancion(form);
        toast.success("Sanción creada exitosamente");
        onSancionCreada?.();
      }

      if (modo === "edit" && sancion) {
        await actualizarSancion(sancion.id, form);
        toast.success("Sanción actualizada exitosamente");
        onSancionCreada?.();
      }

      setShowConfirm(false);
      onClose();
    } catch (error) {
      toast.error("Error al guardar la sanción");
      console.error(error);
      setShowConfirm(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6 relative">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
              {modo === "create" && "Nueva sanción"}
              {modo === "view" && "Detalle de sanción"}
              {modo === "edit" && "Editar sanción"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              <X />
            </button>
          </div>

          {/* FORM */}
          <div className="space-y-4">
            {/* Empleado - Input con sugerencias */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-400">
                Empleado *
              </label>

              {soloLectura || modo === "edit" ? (
                <input
                  value={searchEmpleado || form.empleado_id}
                  disabled
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                           bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <div className="relative">
                  {/* Input de búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchEmpleado}
                      onChange={handleSearchChange}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Buscar por nombre, apellido o legajo..."
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${errors.empleado_id ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                    />
                  </div>

                  {/* Lista de sugerencias */}
                  {showSuggestions && searchEmpleado && empleadosFiltrados.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      {empleadosFiltrados.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectEmpleado(emp)}
                          className={`w-full px-4 py-2 text-left text-sm
                            hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors
                            ${form.empleado_id === emp.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                            text-gray-900 dark:text-white`}
                        >
                          {emp.apellido}, {emp.nombre}{" "}
                          <span className="text-gray-500 dark:text-gray-400">
                            ({emp.legajo})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {errors.empleado_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.empleado_id}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-400">
                Motivo
              </label>
              {soloLectura ? (
                <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white
                 min-h-[80px]">
                  {form.motivo || 'Sin motivo especificado'}
                </div>
              ) : (
                <textarea
                  name="motivo"
                  value={form.motivo}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
               focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-400">
                  Desde *
                </label>
                {soloLectura ? (
                  <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                   bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {form.fecha_desde
                      ? formatDate2(form.fecha_desde.split('T')[0] + 'T12:00:00')
                      : '-'}
                  </div>
                ) : (
                  <input
                    type="date"
                    name="fecha_desde"
                    value={form.fecha_desde}
                    onChange={handleChange}
                    min={hoy}
                    className={`w-full border rounded-lg p-2
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                 focus:outline-none focus:ring-2 focus:ring-blue-500
                 ${errors.fecha_desde ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  />
                )}
                {errors.fecha_desde && !soloLectura && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.fecha_desde}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-400">
                  Hasta *
                </label>
                {soloLectura ? (
                  <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                   bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {form.fecha_hasta
                      ? formatDate2(form.fecha_hasta.split('T')[0] + 'T12:00:00')
                      : '-'}
                  </div>
                ) : (
                  <input
                    type="date"
                    name="fecha_hasta"
                    value={form.fecha_hasta}
                    onChange={handleChange}
                    min={form.fecha_desde || hoy}
                    className={`w-full border rounded-lg p-2
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                 focus:outline-none focus:ring-2 focus:ring-blue-500
                 ${errors.fecha_hasta ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  />
                )}
                {errors.fecha_hasta && !soloLectura && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.fecha_hasta}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg
                       hover:bg-gray-400 dark:hover:bg-gray-500 transition"
            >
              Cerrar
            </button>

            {modo !== "view" && (
              <button
                onClick={handleGuardarClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition"
              >
                Guardar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Confirmar acción
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro que deseas guardar esta sanción?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarGuardado}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition"
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
