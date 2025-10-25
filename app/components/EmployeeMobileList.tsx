import { useState } from 'react';
import { Eye, Edit2, Trash2, Clock, AlertCircle } from 'lucide-react';
import { Rol, GrupoTurno, getHorarioLabel, User } from '../api/types';

type EstadoEmpleado = 'ACTIVO' | 'LICENCIA' | 'AUSENTE' | 'INACTIVO';


interface Employee extends User {
  // Computed fields
  estado?: EstadoEmpleado;
  turnosEsteMes?: number;
  horasAcumuladas?: number;
  intercambiosPendientes?: number;
  // Campos adicionales para cálculo de estado
  enLicencia?: boolean;
  ausente?: boolean;
}


interface EmployeeMobileListProps {
  employees: Employee[];
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  calcularEstado: (employee: Employee) => EstadoEmpleado;
  getRoleColor: (rol: Rol) => string;
  getShiftColor: (shift: GrupoTurno) => string;
  getStatusColor: (estado: EstadoEmpleado) => string;
}

export function EmployeeMobileList({
  employees,
  onView,
  onEdit,
  onDelete,
  calcularEstado,
  getRoleColor,
  getShiftColor,
  getStatusColor,
}: EmployeeMobileListProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  if (employees.length === 0) {
    return (
      <div className="md:hidden p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <AlertCircle className="h-8 w-8 mb-2 mx-auto text-blue-500" />
        <p className="font-medium text-gray-700 dark:text-gray-200">No se encontraron empleados</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Intenta ajustar los filtros</p>
      </div>
    );
  }

  return (
    <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {employees.map((emp) => (
        <div key={emp.id} className="transition-colors">
          <div
            className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            onClick={() => setExpandedCardId(expandedCardId === emp.id ? null : emp.id)}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                {emp.nombre[0]}{emp.apellido[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {emp.nombre} {emp.apellido}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.email}</p>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full ${getRoleColor(emp.rol)}`}>
                    {emp.rol}
                  </span>
                  <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(calcularEstado(emp))}`}>
                    {calcularEstado(emp)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView(emp);
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                title="Ver"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(emp);
                }}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 transition"
                title="Editar"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(emp.id);
                }}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {expandedCardId === emp.id && (
            <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-600 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-3 pt-3">
                {emp.legajo && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Legajo</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {emp.legajo}
                    </p>
                  </div>
                )}
                {emp.grupoTurno && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Turno</p>
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full ${getShiftColor(emp.grupoTurno)}`}>
                      {emp.grupoTurno}
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {getHorarioLabel(emp.horarioLaboral) || 'No asignado'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Turnos/Mes</p>
                  <div className="flex items-center gap-1 justify-center">
                    <Clock className="h-3 w-3 text-gray-400 dark:text-gray-300" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {emp.turnosEsteMes || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}