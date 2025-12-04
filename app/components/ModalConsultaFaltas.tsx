// app/components/ModalConsultaFaltas.tsx
"use client";

import { useState, useMemo } from "react";
import { X, Search, Calendar, User, Filter } from "lucide-react";

interface Falta {
  id: string;
  empleadoId: string;
  fecha: string;
  causa: string;
  observaciones: string | null;
  justificada: boolean;
  registradoPor: {
    id: string;
    nombre: string;
    apellido: string;
  }
  createdAt: string;
  empleado?: {
    id: string;
    nombre: string;
    apellido: string;
    rol: string;
  };
}

interface ModalConsultaFaltasProps {
  open: boolean;
  onClose: () => void;
  faltas: Falta[];
  empleados: any[];
}

export default function ModalConsultaFaltas({
  open,
  onClose,
  faltas,
  empleados,
}: ModalConsultaFaltasProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpleado, setSelectedEmpleado] = useState("TODOS");
  const [selectedJustificada, setSelectedJustificada] = useState("TODOS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const faltasFiltradas = useMemo(() => {
    if (!faltas) return [];

    // Normalizo y separo el texto de búsqueda en palabras
    const palabras = searchTerm?.toLowerCase().trim().split(/\s+/) ?? [];

    return faltas.filter((falta) => {
      // Normalización segura
      const nombre = falta.empleado?.nombre?.toLowerCase() ?? "";
      const apellido = falta.empleado?.apellido?.toLowerCase() ?? "";
      const causa = falta.causa?.toLowerCase() ?? "";

      // Filtro por texto (multi-palabra)
      const textoCoincide =
        palabras.length === 0 ||
        palabras.every((p) =>
          nombre.includes(p) ||
          apellido.includes(p) ||
          causa.includes(p)
        );

      // Filtro por empleado
      const empleadoCoincide =
        selectedEmpleado === "TODOS" ||
        falta.empleadoId === selectedEmpleado;

      // Filtro por justificada
      const justificadaCoincide =
        selectedJustificada === "TODOS" ||
        (selectedJustificada === "SI" && falta.justificada) ||
        (selectedJustificada === "NO" && !falta.justificada);

      // Filtro por rango de fechas
      const fechaCoincide =
        (!fechaDesde || falta.fecha >= fechaDesde) &&
        (!fechaHasta || falta.fecha <= fechaHasta);

      // retorno final
      return (
        textoCoincide &&
        empleadoCoincide &&
        justificadaCoincide &&
        fechaCoincide
      );
    });
  }, [
    faltas,
    searchTerm,
    selectedEmpleado,
    selectedJustificada,
    fechaDesde,
    fechaHasta,
  ]);


  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: faltasFiltradas.length,
      justificadas: faltasFiltradas.filter((f) => f.justificada).length,
      noJustificadas: faltasFiltradas.filter((f) => !f.justificada).length,
    };
  }, [faltasFiltradas]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Consulta de Faltas
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Historial completo de ausencias e inasistencias
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Estadísticas */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Justificadas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.justificadas}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">No Justificadas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.noJustificadas}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Search className="w-4 h-4 inline mr-1" />
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o causa..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            {/* Empleado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Empleado
              </label>
              <select
                value={selectedEmpleado}
                onChange={(e) => setSelectedEmpleado(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="TODOS">Todos</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.apellido}, {emp.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Filtro Justificada */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Estado
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedJustificada("TODOS")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedJustificada === "TODOS"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedJustificada("SI")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedJustificada === "SI"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
              >
                Justificadas
              </button>
              <button
                onClick={() => setSelectedJustificada("NO")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedJustificada === "NO"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
              >
                No Justificadas
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de resultados */}
        <div className="flex-1 overflow-y-auto">
          {faltasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No se encontraron faltas</p>
              <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Empleado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Causa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Observaciones
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Registrado Por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {faltasFiltradas.map((falta) => (
                  <tr
                    key={falta.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(falta.fecha)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {falta.empleado?.apellido}, {falta.empleado?.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {falta.causa}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {falta.observaciones || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {falta.justificada ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                          Justificada
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                          No Justificada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {`${falta.registradoPor.nombre} ${falta.registradoPor.apellido}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {faltasFiltradas.length} resultado(s)
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}