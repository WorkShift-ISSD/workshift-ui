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

interface EmployeeTableProps {
  employees: Employee[];
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  calcularEstado: (employee: Employee) => EstadoEmpleado;
  getRoleColor: (rol: Rol) => string;
  getShiftColor: (shift: GrupoTurno) => string;
  getStatusColor: (estado: EstadoEmpleado) => string;
}

export function EmployeeTable({
  employees,
  onView,
  onEdit,
  onDelete,
  calcularEstado,
  getRoleColor,
  getShiftColor,
  getStatusColor,
}: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-12 text-center">
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-12 w-12 mb-3 text-blue-500 dark:text-blue-400" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              No se encontraron empleados
            </p>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 transition-colors">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Empleado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Turno
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Horario
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Turnos/Mes
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {employee.nombre[0]}
                        {employee.apellido[0]}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {employee.nombre} {employee.apellido}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {employee.email}
                      </div>
                      {employee.legajo && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Legajo: {employee.legajo}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(
                      employee.rol
                    )}`}
                  >
                    {employee.rol}
                  </span>
                </td>

                <td className="px-6 py-4 text-center whitespace-nowrap">
                  {employee.grupoTurno ? (
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getShiftColor(
                        employee.grupoTurno
                      )}`}
                    >
                      {employee.grupoTurno}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>

                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {getHorarioLabel(employee.horarioLaboral) || 'No asignado'}
                </td>

                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      calcularEstado(employee)
                    )}`}
                  >
                    {calcularEstado(employee)}
                  </span>
                </td>

                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  <div className="flex justify-center items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                    {employee.turnosEsteMes || 0}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onView(employee)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(employee)}
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(employee.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}