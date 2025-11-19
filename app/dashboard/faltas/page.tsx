"use client";

import { useState, useEffect, useMemo } from "react";
import { useFaltas } from "@/hooks/useFaltas";
import { useEmpleados } from "@/hooks/useEmpleados";
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import ModalFalta from '@/app/components/ModalFalta';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  UserCircle,
  XCircle,
  CheckCircle,
  Calendar,
  Clock,
} from "lucide-react";

// Función corregida para fecha local de Argentina
const getTodayDate = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().split("T")[0];
};

// Formato seguro de fecha
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString.replace(/-/g, "/"));
    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

export default function FaltasPage() {
  const [selectedRole, setSelectedRole] = useState("TODOS");
  const [selectedTurno, setSelectedTurno] = useState("TODOS");
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalEmpleado, setModalEmpleado] = useState<any>(null);

  const { empleados, isLoading: loadingEmpleados, error: errorEmpleados } = useEmpleados();
  const { faltas, isLoading: loadingFaltas, error: errorFaltas, deleteFalta: eliminarFalta, mutate } = useFaltas(selectedDate);

  // Extraer roles únicos de los empleados
  const rolesDisponibles = useMemo(() => {
    if (!empleados) return [];
    const roles = new Set(empleados.map(emp => emp.rol));
    return Array.from(roles).filter(rol => rol === 'SUPERVISOR' || rol === 'INSPECTOR').sort();
  }, [empleados]);

  const horariosPorRol: Record<string, string[]> = {
    "SUPERVISOR": ["Mañana", "Tarde", "Noche", "ADM"],
    "INSPECTOR": ["Mañana", "Tarde", "Noche", "ADM"],
  };

  // Reset de turno cuando cambia el rol
  useEffect(() => {
    setSelectedTurno("TODOS");
  }, [selectedRole]);

  // Filtrar empleados por fecha, rol y turno
  const empleadosDelDia = useMemo(() => {
    if (!selectedDate || !empleados) return [];

    return empleados
      .filter((emp) => {
        const fechaCoincide = emp.fechaIngreso <= selectedDate;
        const rolCoincide = selectedRole === "TODOS" || emp.rol === selectedRole;
        const turnoCoincide = selectedTurno === "TODOS" || emp.turno === selectedTurno;
        return fechaCoincide && rolCoincide && turnoCoincide;
      })
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [empleados, selectedDate, selectedRole, selectedTurno]);

  const empleadosConFalta = faltas?.map((f) => f.empleadoId) || [];

  // Handler eliminar falta
  const handleEliminarFalta = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta falta?")) return;
    
    try {
      await eliminarFalta(id);
      toast.success("Falta eliminada correctamente");
      mutate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al eliminar falta";
      toast.error(message);
    }
  };

  // Handler después de guardar falta
  const handleFaltaSaved = () => {
    setModalEmpleado(null);
    mutate();
  };

  if (loadingEmpleados || loadingFaltas) return <LoadingSpinner />;
  if (errorEmpleados || errorFaltas)
    return (
      <div className="text-center text-red-500 dark:text-red-400 py-8">
        Error cargando datos
      </div>
    );

  return (
    <div className="container mx-auto p-6">
      <ToastContainer theme="colored" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Control de Faltas
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona las faltas e inasistencias del personal
        </p>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6 transition-colors">
        {/* Fecha */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 dark:text-gray-300">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Fecha
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                     focus:border-transparent transition-all"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 dark:text-gray-300">
            <UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Rol
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                     focus:border-transparent transition-all"
          >
            <option value="TODOS">Todos los roles</option>
            {rolesDisponibles.map((rol) => (
              <option key={rol} value={rol}>
                {rol}
              </option>
            ))}
          </select>
        </div>

        {/* Turno */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 dark:text-gray-300">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Turno
          </label>
          <select
            value={selectedTurno}
            onChange={(e) => setSelectedTurno(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                     focus:border-transparent transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedRole === "TODOS"}
          >
            <option value="TODOS">Todos los turnos</option>
            {selectedRole !== "TODOS" &&
              horariosPorRol[selectedRole]?.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* LISTADO */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-colors">
        {/* Header de tabla */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Empleados de {formatDate(selectedDate)}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total: {empleadosDelDia.length} empleado(s)
          </p>
        </div>

        {/* Contenido */}
        {empleadosDelDia.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay empleados</p>
            <p className="text-sm">Para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Apellido y Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Turno
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {empleadosDelDia.map((emp) => {
                  const falta = faltas?.find((f) => f.empleadoId === emp.id);
                  const enFalta = !!falta;

                  return (
                    <tr 
                      key={emp.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {emp.apellido}, {emp.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                          {emp.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {emp.turno}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {enFalta ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold
                                       bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
                            <XCircle className="w-4 h-4" />
                            Falta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold
                                       bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                            <CheckCircle className="w-4 h-4" />
                            Presente
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {!enFalta ? (
                          <button
                            onClick={() => setModalEmpleado(emp)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                                     text-white rounded-lg font-medium transition-colors
                                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                     dark:focus:ring-offset-gray-800"
                          >
                            Registrar Falta
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEliminarFalta(falta.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600
                                     text-white rounded-lg font-medium transition-colors
                                     focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                                     dark:focus:ring-offset-gray-800"
                          >
                            Eliminar Falta
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalEmpleado && (
        <ModalFalta
          empleado={modalEmpleado}
          fecha={selectedDate}
          open={true}
          onClose={() => setModalEmpleado(null)}
          onSaved={handleFaltaSaved}
        />
      )}
    </div>
  );
}