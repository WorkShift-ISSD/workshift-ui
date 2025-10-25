import { Search, UserPlus } from 'lucide-react';
import { ExportData } from '@/app/components/ExportToPdf';
import { GrupoTurno, Horario, HORARIOS_MAP, Rol } from '../api/types';

interface EmployeeFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedRole: Rol | 'TODOS';
  setSelectedRole: (role: Rol | 'TODOS') => void;
  selectedShift: GrupoTurno | 'TODOS';
  setSelectedShift: (shift: GrupoTurno | 'TODOS') => void;
  selectedHorario: Horario | '';
  setSelectedHorario: (horario: Horario | '') => void;
  horariosPorRol: Record<Rol, Horario[]>;
  onCreateEmployee: () => void;
  // Props para ExportData
  filteredEmployees: any[];
  stats: any;
  calcularEstado: any;
}

export function EmployeeFilters({
  searchTerm,
  setSearchTerm,
  selectedRole,
  setSelectedRole,
  selectedShift,
  setSelectedShift,
  selectedHorario,
  setSelectedHorario,
  horariosPorRol,
  onCreateEmployee,
  filteredEmployees,
  stats,
  calcularEstado,
}: EmployeeFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all mb-6">
      {/* Input de búsqueda */}
      <div className="w-full mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o Legajo..."
            className="w-full pl-10 pr-4 py-2 dark:bg-gray-700 dark:border-gray-600 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Selects y botones */}
      <div className="flex flex-col sm:flex-wrap md:flex-row gap-3 md:gap-4 w-full justify-between items-stretch">
        {/* Rol */}
        <select
          className="flex-1 dark:text-gray-500 min-w-[180px] px-4 py-2 dark:bg-gray-700 border dark:border-gray-600 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm sm:text-base"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as Rol | 'TODOS')}
        >
          <option value="TODOS">Todos los Roles</option>
          <option value={Rol.ADMIN}>Admin</option>
          <option value={Rol.JEFESECTOR}>Jefe Sector</option>
          <option value={Rol.SUPERVISOR}>Supervisor</option>
          <option value={Rol.INSPECTOR}>Inspector</option>
          <option value={Rol.USUARIO}>Usuario</option>
        </select>

        {/* Turno */}
        <select
          className="flex-1 dark:text-gray-500 min-w-[160px] dark:bg-gray-700 border dark:border-gray-600 border-gray-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm sm:text-base"
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value as GrupoTurno | 'TODOS')}
        >
          <option value="TODOS">Todos los Turnos</option>
          <option value={GrupoTurno.A}>Turno A</option>
          <option value={GrupoTurno.B}>Turno B</option>
        </select>

        {/* Horario */}
        <select
          className="flex-1 min-w-[160px] px-4 pr-7 dark:text-gray-500 py-2 dark:bg-gray-700 dark:border-gray-600 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm sm:text-base disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          value={selectedHorario}
          onChange={(e) => setSelectedHorario(e.target.value as Horario | '')}
          disabled={selectedRole === "TODOS"}
        >
          <option value="">Seleccionar horario laboral</option>
          {selectedRole !== "TODOS" &&
            horariosPorRol[selectedRole].map((horario) => (
              <option key={horario} value={horario}>
                {HORARIOS_MAP[horario].label}
              </option>
            ))}
        </select>

        {/* Botón Exportar */}
        <ExportData
          employees={filteredEmployees}
          stats={stats}
          filters={{
            searchTerm,
            selectedRole,
            selectedShift,
            selectedHorario: selectedHorario || undefined
          }}
          calcularEstado={calcularEstado}
        />

        {/* Botón Nuevo Empleado */}
        <button
          onClick={onCreateEmployee}
          className="w-full flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo Empleado
        </button>
      </div>
    </div>
  );
}