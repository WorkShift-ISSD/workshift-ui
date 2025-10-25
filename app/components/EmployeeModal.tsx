import { X, AlertCircle, UserPlus, Check } from 'lucide-react';
import { Rol, GrupoTurno, Horario, HORARIOS_MAP, getHorarioLabel, User } from '../api/types';
import { Key } from 'react';

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

interface EmployeeModalProps {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create';
  employee: Employee | null;
  formData: Partial<Employee>;
  formError: string;
  horariosPorRol: Record<Rol, Horario[]>;
  onClose: () => void;
  onSave: () => void;
  setFormData: (data: Partial<Employee>) => void;
  setFormError: (error: string) => void;
  formatDate: (date: Date | string | null | undefined) => string;
  getRoleColor: (rol: Rol) => string;
  getShiftColor: (shift: GrupoTurno) => string;
  getStatusColor: (estado: EstadoEmpleado) => string;
  calcularEstado: (employee: Employee) => EstadoEmpleado;
}

export function EmployeeModal({
  isOpen,
  mode,
  employee,
  formData,
  formError,
  horariosPorRol,
  onClose,
  onSave,
  setFormData,
  setFormError,
  formatDate,
  getRoleColor,
  getShiftColor,
  getStatusColor,
  calcularEstado,
}: EmployeeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'create' ? 'Nuevo Empleado' :
                mode === 'edit' ? 'Editar Empleado' : 'Detalles del Empleado'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {formError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
              </div>
            </div>
          )}

          {mode === 'view' && employee ? (
            <ViewMode
              employee={employee}
              formatDate={formatDate}
              getRoleColor={getRoleColor}
              getShiftColor={getShiftColor}
              getStatusColor={getStatusColor}
              calcularEstado={calcularEstado}
            />
          ) : (
            <EditCreateMode
              formData={formData}
              formError={formError}
              horariosPorRol={horariosPorRol}
              setFormData={setFormData}
              setFormError={setFormError}
              onSave={onSave}
            />
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          {mode !== 'view' && (
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              {mode === 'create' ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear Empleado
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewMode({ employee, formatDate, getRoleColor, getShiftColor, getStatusColor, calcularEstado }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Cuenta creada</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(employee.createdAt)}</p>
        </div>
        {employee.legajo && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Legajo</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{employee.legajo}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(calcularEstado(employee))}`}>
            {calcularEstado(employee)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Nombre Completo</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{employee.nombre} {employee.apellido}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 break-all">{employee.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Rol</p>
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(employee.rol)}`}>
            {employee.rol}
          </span>
        </div>
        {employee.grupoTurno && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Grupo de Turno</p>
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getShiftColor(employee.grupoTurno)}`}>
              {employee.grupoTurno}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Horario Laboral</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{getHorarioLabel(employee.horarioLaboral) || 'No asignado'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{employee.telefono || 'No registrado'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Nacimiento</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(employee.fechaNacimiento)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Última actualización</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(employee.updatedAt)}</p>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Dirección</p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{employee.direccion || 'No registrada'}</p>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Estadísticas del Mes</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Turnos</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{employee.turnosEsteMes || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Horas</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{employee.horasAcumuladas || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Intercambios</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{employee.intercambiosPendientes || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditCreateMode({ formData, formError, horariosPorRol, setFormData, setFormError, onSave }: any) {
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              formError && (!formData.nombre || formData.nombre.trim() === '')
                ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            value={formData.nombre || ''}
            onChange={(e) => {
              setFormData({ ...formData, nombre: e.target.value });
              if (formError) setFormError('');
            }}
            placeholder="Ej: Juan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Apellido <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              formError && (!formData.apellido || formData.apellido.trim() === '')
                ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            value={formData.apellido || ''}
            onChange={(e) => {
              setFormData({ ...formData, apellido: e.target.value });
              if (formError) setFormError('');
            }}
            placeholder="Ej: Pérez"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Legajo
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={formData.legajo || ''}
            onChange={(e) => {
              setFormData({ ...formData, legajo: e.target.value });
              if (formError) setFormError('');
            }}
            placeholder="Ej: 12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="email"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              formError && (!formData.email || formData.email.trim() === '')
                ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            value={formData.email || ''}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (formError) setFormError('');
            }}
            placeholder="Ej: juan.perez@email.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rol
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={formData.rol || Rol.INSPECTOR}
            onChange={(e) => {
              const nuevoRol = e.target.value as Rol;
              const horariosDisponibles = horariosPorRol[nuevoRol];
              setFormData({
                ...formData,
                rol: nuevoRol,
                horarioLaboral: horariosDisponibles[0] || null,
              });
              if (formError) setFormError('');
            }}
          >
            <option value={Rol.INSPECTOR}>Inspector</option>
            <option value={Rol.SUPERVISOR}>Supervisor</option>
            <option value={Rol.JEFESECTOR}>Jefe Sector</option>
            <option value={Rol.ADMIN}>Admin</option>
            <option value={Rol.USUARIO}>Usuario</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Grupo de Turno
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={formData.grupoTurno || GrupoTurno.A}
            onChange={(e) => {
              setFormData({ ...formData, grupoTurno: e.target.value as GrupoTurno });
              if (formError) setFormError('');
            }}
          >
            <option value={GrupoTurno.A}>Turno A</option>
            <option value={GrupoTurno.B}>Turno B</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Horario Laboral
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          value={formData.horarioLaboral || horariosPorRol[formData.rol || Rol.INSPECTOR][0]}
          onChange={(e) => setFormData({ ...formData, horarioLaboral: e.target.value as Horario })}
        >
          {horariosPorRol[formData.rol || Rol.INSPECTOR]
            .filter((horario: Horario | null | undefined): horario is Horario => horario !== null && horario !== undefined)
            .map((horario: Horario) => (
              <option key={horario} value={horario}>
                {HORARIOS_MAP[horario].label}
              </option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={formData.telefono || ''}
            onChange={(e) => {
              setFormData({ ...formData, telefono: e.target.value });
              if (formError) setFormError('');
            }}
            placeholder="Ej: +54 221 123-4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fecha de Nacimiento
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toISOString().split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value ? new Date(e.target.value) : null })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Dirección
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          value={formData.direccion || ''}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          placeholder="Ej: Calle 123, Cipolletti"
        />
      </div>

      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <input
          type="checkbox"
          id="activo-checkbox"
          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 h-4 w-4 bg-white dark:bg-gray-700"
          checked={formData.activo !== undefined ? formData.activo : true}
          onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
        />
        <label htmlFor="activo-checkbox" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          Cuenta activa
        </label>
      </div>
    </form>
  );
}