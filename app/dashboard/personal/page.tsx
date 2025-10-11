'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Download,
  Calendar,
  Shield,
  Clock,
  AlertCircle,
  Check,
  X,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { useEmpleados } from '@/hooks/useEmpleados';

// Types based on our Prisma schema
type Rol = 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
type GrupoTurno = 'A' | 'B';
type EstadoEmpleado = 'ACTIVO' | 'LICENCIA' | 'AUSENTE' | 'INACTIVO';

interface Inspector {
  id: string;
  legajo: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  telefono: string | null;
  direccion: string | null;
  horario: string | null;
  fechaNacimiento: string | null;
  activo: boolean;
  grupoTurno: GrupoTurno;
  fotoPerfil: string | null;
  ultimoLogin: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  estado?: EstadoEmpleado;
  turnosEsteMes?: number;
  horasAcumuladas?: number;
  intercambiosPendientes?: number;
  // Campos adicionales para cálculo de estado
  enLicencia?: boolean;
  ausente?: boolean;
}

export default function DashboardPage() {
  const [filteredEmployees, setFilteredEmployees] = useState<Inspector[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Rol | 'TODOS'>('TODOS');
  const [selectedShift, setSelectedShift] = useState<GrupoTurno | 'TODOS'>('TODOS');
  const [selectedHorario, setSelectedHorario] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<Inspector | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState<Partial<Inspector>>({});
  const [formError, setFormError] = useState('');

  const {
    empleados,
    isLoading,
    error,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado
  } = useEmpleados();

  const employees = empleados || [];

  const horariosPorRol: Record<Rol, string[]> = {
    INSPECTOR: ["04:00-14:00", "06:00-16:00", "10:00-20:00", "13:00-23:00", "19:00-05:00"],
    SUPERVISOR: ["05:00-14:00", "14:00-23:00", "23:00-05:00"],
    JEFE: ["05:00-17:00", "17:00-05:00"],
  };

  // Calcular estado del empleado
  const calcularEstado = (empleado: Inspector): EstadoEmpleado => {
    if (!empleado.activo) return 'INACTIVO';

    // Si tiene campos adicionales para estado
    if (empleado.enLicencia) return 'LICENCIA';
    if (empleado.ausente) return 'AUSENTE';

    // Si el empleado no ha iniciado sesión en más de 7 días, considerarlo ausente
    if (empleado.ultimoLogin) {
      const ultimoAcceso = new Date(empleado.ultimoLogin);
      const ahora = new Date();
      const diasSinAcceso = Math.floor((ahora.getTime() - ultimoAcceso.getTime()) / (1000 * 60 * 60 * 24));

      if (diasSinAcceso > 7) return 'AUSENTE';
    }

    return 'ACTIVO';
  };

  // Resetear horario cuando cambia el rol seleccionado en filtros
  useEffect(() => {
    if (selectedRole !== 'TODOS') {
      // Si el horario actual no existe en el nuevo rol, resetear
      const horariosDisponibles = horariosPorRol[selectedRole];
      if (selectedHorario && !horariosDisponibles.includes(selectedHorario)) {
        setSelectedHorario("");
      }
    } else {
      setSelectedHorario("");
    }
  }, [selectedRole]);

  // Filter employees con useMemo para optimizar
  const filteredEmployeesMemo = useMemo(() => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();

      filtered = filtered.filter(emp => {
        const fullName = `${emp.nombre} ${emp.apellido}`.toLowerCase();
        return (
          emp.nombre.toLowerCase().includes(term) ||
          emp.apellido.toLowerCase().includes(term) ||
          fullName.includes(term) ||
          emp.email.toLowerCase().includes(term) ||
          emp.legajo.toString().includes(term)
        );
      });
    }

    // Role filter
    if (selectedRole !== 'TODOS') {
      filtered = filtered.filter(emp => emp.rol === selectedRole);
    }

    // Shift filter
    if (selectedShift !== 'TODOS') {
      filtered = filtered.filter(emp => emp.grupoTurno === selectedShift);
    }

    // Horario Laboral Filter
    if (selectedHorario) {
      filtered = filtered.filter(emp => emp.horario === selectedHorario);
    }

    return filtered;
  }, [searchTerm, selectedRole, selectedShift, selectedHorario, employees]);

  useEffect(() => {
    setFilteredEmployees(filteredEmployeesMemo);
  }, [filteredEmployeesMemo]);

  // Calcular estadísticas
  const stats = useMemo(() => ({
    total: employees.length,
    activos: employees.filter(e => e.activo && calcularEstado(e) === 'ACTIVO').length,
    enLicencia: employees.filter(e => calcularEstado(e) === 'LICENCIA').length,
    ausentes: employees.filter(e => calcularEstado(e) === 'AUSENTE').length
  }), [employees]);

  // Modal handlers
  const openModal = (mode: 'view' | 'edit' | 'create', employee?: Inspector) => {
    setModalMode(mode);
    setFormError('');
    if (employee) {
      setSelectedEmployee(employee);
      setFormData({ ...employee });
    } else {
      setSelectedEmployee(null);
      setFormData({
        nombre: '',
        apellido: '',
        legajo: undefined,
        email: '',
        rol: 'INSPECTOR',
        grupoTurno: 'A',
        telefono: '',
        horario: horariosPorRol['INSPECTOR'][0],
        direccion: '',
        activo: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setFormData({});
    setFormError('');
  };

  const handleSave = async () => {
    // Validar nombre
    if (!formData.nombre || formData.nombre.trim() === '') {
      setFormError('El nombre es obligatorio');
      return;
    }

    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(formData.nombre)) {
      setFormError('El nombre solo puede contener letras');
      return;
    }

    // Validar apellido
    if (!formData.apellido || formData.apellido.trim() === '') {
      setFormError('El apellido es obligatorio');
      return;
    }

    if (!nombreRegex.test(formData.apellido)) {
      setFormError('El apellido solo puede contener letras');
      return;
    }

    // Validar legajo
    if (!formData.legajo) {
      setFormError('El legajo es obligatorio');
      return;
    }

    if (isNaN(Number(formData.legajo))) {
      setFormError('El legajo debe ser numérico');
      return;
    }

    const legajoExistente = employees.find(emp =>
      emp.legajo === formData.legajo && emp.id !== selectedEmployee?.id
    );

    if (legajoExistente) {
      setFormError('El legajo ya está asignado a otro empleado');
      return;
    }

    // Validar email
    if (!formData.email || formData.email.trim() === '') {
      setFormError('El email es obligatorio');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('El formato del email no es válido');
      return;
    }

    // Verificar email duplicado
    const emailExistente = employees.find(emp =>
      emp.email.toLowerCase() === formData.email!.toLowerCase() && emp.id !== selectedEmployee?.id
    );

    if (emailExistente) {
      setFormError('El email ya está registrado en otro empleado');
      return;
    }

    // Validar teléfono
    if (formData.telefono && formData.telefono.trim() !== '') {
      const telefonoRegex = /^[\d\s\-\+\(\)]+$/;
      if (!telefonoRegex.test(formData.telefono)) {
        setFormError('El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +');
        return;
      }

      const soloNumeros = formData.telefono.replace(/\D/g, '');
      if (soloNumeros.length < 7) {
        setFormError('El teléfono debe tener al menos 7 dígitos');
        return;
      }
    }

    // Validar rol y grupo de turno
    if (!formData.rol) {
      setFormError('Debe seleccionar un rol');
      return;
    }

    if (!formData.grupoTurno) {
      setFormError('Debe seleccionar un grupo de turno');
      return;
    }

    // Si pasa las validaciones, limpiar error
    setFormError('');

    try {
      if (modalMode === 'create') {
        const confirmCreate = window.confirm('¿Seguro que quiere crear un nuevo empleado?');
        if (!confirmCreate) return;

        await createEmpleado({
          legajo: formData.legajo!,
          email: formData.email!,
          nombre: formData.nombre!,
          apellido: formData.apellido!,
          rol: formData.rol || 'INSPECTOR',
          telefono: formData.telefono || null,
          direccion: formData.direccion || null,
          horario: formData.horario || null,
          fechaNacimiento: formData.fechaNacimiento || null,
          activo: formData.activo !== undefined ? formData.activo : true,
          grupoTurno: formData.grupoTurno || 'A',
        });
      } else if (modalMode === 'edit' && selectedEmployee) {
        const confirmEdit = window.confirm('¿Seguro quiere modificar los datos del empleado?');
        if (!confirmEdit) return;

        await updateEmpleado(selectedEmployee.id, formData);
      }
      closeModal();
    } catch (error) {
      console.error('Error guardando empleado:', error);
      setFormError('Error al guardar el empleado. Por favor intente nuevamente.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este empleado? Esta acción no se puede deshacer.')) {
      try {
        await deleteEmpleado(id);
      } catch (error) {
        console.error('Error eliminando empleado:', error);
        alert('Error al eliminar el empleado. Por favor intente nuevamente.');
      }
    }
  };

  // Role styles
  const getRoleColor = (rol: Rol) => {
    const colors = {
      JEFE: 'bg-red-100 text-red-800',
      SUPERVISOR: 'bg-orange-100 text-orange-800',
      INSPECTOR: 'bg-blue-100 text-blue-800',
    };
    return colors[rol];
  };

  // Shift styles
  const getShiftColor = (shift: GrupoTurno) => {
    const colors = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-blue-100 text-blue-800',
    };
    return colors[shift];
  };

  // Status styles
  const getStatusColor = (estado: EstadoEmpleado) => {
    const colors = {
      ACTIVO: 'bg-green-100 text-green-800',
      LICENCIA: 'bg-yellow-100 text-yellow-800',
      AUSENTE: 'bg-red-100 text-red-800',
      INACTIVO: 'bg-gray-100 text-gray-800'
    };
    return colors[estado];
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format last login
  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffHours < 48) return 'Ayer';
    return `Hace ${Math.floor(diffHours / 24)} días`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar empleados</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="  ">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de Empleados</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Administra los empleados, turnos y permisos del sistema WorkShift</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600text-sm text-gray-500 dark:text-gray-400">Total Empleados</p>
              <p className="text-2xl font-bold text-blue-400 dark:text-blue-400">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600text-sm text-gray-500 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600text-sm text-gray-500 dark:text-gray-400">En Licencia</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.enLicencia}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600text-sm text-gray-500 dark:text-gray-400">Ausentes</p>
              <p className="text-2xl font-bold text-red-600">{stats.ausentes}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
        {/* Input de búsqueda */}
        <div className="w-full mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 " />
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
            className="flex-1 dark:text-gray-500 min-w-[180px] px-4 py-2 dark:bg-gray-700 border dark:border-gray-600 border-gray-200 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm sm:text-base"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Rol | 'TODOS')}
          >
            <option value="TODOS">Todos los Roles</option>
            <option value="JEFE">Jefe</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="INSPECTOR">Inspector</option>
          </select>

          {/* Turno */}
          <select
            className="flex-1 dark:text-gray-500 min-w-[160px] dark:bg-gray-700 border dark:border-gray-600 border-gray-200 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm sm:text-base"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value as GrupoTurno | 'TODOS')}
          >
            <option value="TODOS">Todos los Turnos</option>
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
          </select>

          {/* Horario */}
          <select
            className="flex-1 min-w-[160px] px-4 pr-7 dark:text-gray-500 py-2 dark:bg-gray-700 dark:border-gray-600 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm sm:text-base disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            value={selectedHorario}
            onChange={(e) => setSelectedHorario(e.target.value)}
            disabled={selectedRole === "TODOS"}
          >
            <option value="">Seleccionar horario laboral</option>
            {selectedRole !== "TODOS" &&
              horariosPorRol[selectedRole].map((horario) => (
                <option key={horario} value={horario}>
                  {horario}
                </option>
              ))}
          </select>

          {/* Botón Exportar */}
          <button
            className="flex-1 sm:flex-none px-4 dark:text-gray-500 py-2 dark:bg-gray-700 dark:border-gray-600 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
            title="Exportar datos"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>

          {/* Botón Nuevo Empleado */}
          <button
            onClick={() => openModal('create')}
            className="w-full flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* ENCABEZADO */}
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

            {/* CUERPO */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <AlertCircle className="h-12 w-12 mb-3 text-blue-500 dark:text-blue-400" />
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        No se encontraron empleados
                      </p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                        Intenta ajustar los filtros de búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
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
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Legajo: {employee.legajo}
                          </div>
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
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getShiftColor(
                          employee.grupoTurno
                        )}`}
                      >
                        {employee.grupoTurno}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {employee.horario || 'No asignado'}
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
                          onClick={() => openModal('view', employee)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', employee)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-colors">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {modalMode === 'create' ? 'Nuevo Empleado' :
                    modalMode === 'edit' ? 'Editar Empleado' : 'Detalles del Empleado'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Error message */}
              {formError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
                  </div>
                </div>
              )}

              {modalMode === 'view' && selectedEmployee ? (
                // View mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cuenta creada</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(selectedEmployee.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Legajo</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedEmployee.legajo || 'No asignado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(calcularEstado(selectedEmployee))}`}>
                        {calcularEstado(selectedEmployee)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Nombre Completo</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedEmployee.nombre} {selectedEmployee.apellido}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 break-all">{selectedEmployee.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Rol</p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(selectedEmployee.rol)}`}>
                        {selectedEmployee.rol}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Grupo de Turno</p>
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getShiftColor(selectedEmployee.grupoTurno)}`}>
                        {selectedEmployee.grupoTurno}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Horario Laboral</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedEmployee.horario || 'No asignado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedEmployee.telefono || 'No registrado'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Nacimiento</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(selectedEmployee.fechaNacimiento)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Última actualización</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(selectedEmployee.updatedAt)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Dirección</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedEmployee.direccion || 'No registrada'}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Estadísticas del Mes</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Turnos</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedEmployee.turnosEsteMes || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Horas</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedEmployee.horasAcumuladas || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Intercambios</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedEmployee.intercambiosPendientes || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Edit/Create form
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors ${formError && (!formData.nombre || formData.nombre.trim() === '')
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
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors ${formError && (!formData.apellido || formData.apellido.trim() === '')
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
                        Legajo <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors ${formError && (!formData.legajo || isNaN(Number(formData.legajo)))
                            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                        value={formData.legajo || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, legajo: e.target.value ? Number(e.target.value) : undefined });
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
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors ${formError && (!formData.email || formData.email.trim() === '')
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
                        Rol <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                        value={formData.rol || 'INSPECTOR'}
                        onChange={(e) => {
                          const nuevoRol = e.target.value as Rol;
                          setFormData({
                            ...formData,
                            rol: nuevoRol,
                            horario: horariosPorRol[nuevoRol][0],
                          });
                          if (formError) setFormError('');
                        }}
                      >
                        <option value="INSPECTOR">Inspector</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="JEFE">Jefe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Grupo de Turno <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                        value={formData.grupoTurno || 'A'}
                        onChange={(e) => {
                          setFormData({ ...formData, grupoTurno: e.target.value as GrupoTurno });
                          if (formError) setFormError('');
                        }}
                      >
                        <option value="A">Turno A</option>
                        <option value="B">Turno B</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Horario Laboral
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      value={formData.horario || horariosPorRol[formData.rol || "INSPECTOR"][0]}
                      onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    >
                      {horariosPorRol[formData.rol || "INSPECTOR"].map((horario) => (
                        <option key={horario} value={horario}>
                          {horario}
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                        value={formData.fechaNacimiento ? formData.fechaNacimiento.split('T')[0] : ''}
                        onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
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
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              {modalMode !== 'view' && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  {modalMode === 'create' ? (
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
      )}
    </div>
  );
}