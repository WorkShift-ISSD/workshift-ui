"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useFaltas } from "@/hooks/useFaltas";
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
  Filter,
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
  const { data: session } = useSession();
  const [selectedRole, setSelectedRole] = useState("TODOS");
  const [selectedTurno, setSelectedTurno] = useState("TODOS");

  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);

  const { empleados, loading: loadingEmpleados, error: errorEmpleados } = useEmpleados();
  const { faltas, loading: loadingFaltas, error: errorFaltas, registrarFalta, eliminarFalta } = useFaltas(selectedDate);

  const [modalEmpleado, setModalEmpleado] = useState(null);

  const horariosPorRol: Record<string, string[]> = {
    "Control Migratorio": ["Mañana", "Tarde", "Noche", "ADM"],
    Seguridad: ["Mañana", "Tarde"],
    Administrativo: ["ADM"],
  };

  // Reset de turno simplificado
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

  const empleadosConFalta = faltas?.map((f) => f.inspectorId) || [];

  const empleadosPresentes = empleadosDelDia.filter(
    (emp) => !empleadosConFalta.includes(emp.id)
  );

  // Handler registrar falta
  const handleRegistrarFalta = async (data) => {
    try {
      await registrarFalta({
        ...data,
        fecha: selectedDate,
        registradoPor: session?.user?.name || "Sistema",
      });

      toast.success("Falta registrada correctamente");
      setModalEmpleado(null);
    } catch (error) {
      toast.error(error.message || "Error al registrar falta");
    }
  };

  // Handler eliminar falta
  const handleEliminarFalta = async (id: string) => {
    try {
      await eliminarFalta(id);
      toast.success("Falta eliminada");
    } catch (error) {
      toast.error(error.message || "Error al eliminar falta");
    }
  };

  if (loadingEmpleados || loadingFaltas) return <LoadingSpinner />;
  if (errorEmpleados || errorFaltas)
    return <div className="text-center text-red-500">Error cargando datos</div>;

  return (
    <div className="container mx-auto p-6">
      <ToastContainer />

      <h1 className="text-3xl font-bold mb-6">Control de Faltas</h1>


      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded shadow">
        {/* Fecha */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-1">
            <Calendar className="w-5 h-5" /> Fecha
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-1">
            <UserCircle className="w-5 h-5" /> Rol
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input"
          >
            <option value="TODOS">Todos</option>
            <option value="Control Migratorio">Control Migratorio</option>
            <option value="Seguridad">Seguridad</option>
            <option value="Administrativo">Administrativo</option>
          </select>
        </div>

        {/* Turno */}
        <div>
          <label className="flex items-center gap-2 font-semibold mb-1">
            <Clock className="w-5 h-5" /> Turno
          </label>
          <select
            value={selectedTurno}
            onChange={(e) => setSelectedTurno(e.target.value)}
            className="input"
          >
            <option value="TODOS">Todos</option>
            {selectedRole !== "TODOS" &&
              horariosPorRol[selectedRole]?.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* LISTADO */}
      {/* ========================================== */}

      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">
          Empleados de {formatDate(selectedDate)}
        </h2>

        {empleadosDelDia.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No hay empleados para los filtros seleccionados
          </div>
        )}

        <table className="w-full border mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Apellido y Nombre</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Turno</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {empleadosDelDia.map((emp) => {
              const falta = faltas?.find((f) => f.inspectorId === emp.id);
              const enFalta = !!falta;

              return (
                <tr key={emp.id} className="border-t">
                  <td className="p-2">{emp.apellido + ", " + emp.nombre}</td>
                  <td className="p-2">{emp.rol}</td>
                  <td className="p-2">{emp.turno}</td>

                  <td className="p-2 text-center">
                    {enFalta ? (
                      <span className="text-red-600 font-semibold flex items-center gap-1 justify-center">
                        <XCircle className="w-5 h-5" /> Falta
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold flex items-center gap-1 justify-center">
                        <CheckCircle className="w-5 h-5" /> Presente
                      </span>
                    )}
                  </td>

                  <td className="p-2 text-center">
                    {!enFalta ? (
                      <button
                        onClick={() => setModalEmpleado(emp)}
                        className="btn-primary"
                      >
                        Registrar Falta
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEliminarFalta(falta.id)}
                        className="btn-danger"
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

      {/* Modal */}
      {modalEmpleado && (
        <ModalFalta
          empleado={modalEmpleado}
          fecha={selectedDate}
          onClose={() => setModalEmpleado(null)}
          onSubmit={handleRegistrarFalta}
        />
      )}
    </div>
  );
}
