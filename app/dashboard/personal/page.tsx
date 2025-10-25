'use client';

import { useState, useEffect, useMemo } from 'react';
import { Briefcase, Check, Calendar, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import useUser from '@/hooks/backend/useUser';
import { Rol, GrupoTurno, Horario, getHorarioLabel, type User } from '@/app/api/types';
import { EmployeeModal } from '@/app/components/EmployeeModal';
import { EmployeeFilters } from '@/app/components/EmployeeFilters';
import { EmployeeTable } from '@/app/components/EmployeeTable';
import { StatsCard } from '@/app/components/StatsCard';
import { EmployeeMobileList } from '@/app/components/EmployeeMobileList';

type EstadoEmpleado = 'ACTIVO' | 'LICENCIA' | 'AUSENTE' | 'INACTIVO';

interface InspectorExtended extends User {
  estado?: EstadoEmpleado;
  turnosEsteMes?: number;
  horasAcumuladas?: number;
  intercambiosPendientes?: number;
  enLicencia?: boolean;
  ausente?: boolean;
}

// Mapeo de horarios por rol
const horariosPorRol: Record<Rol, Horario[]> = {
  [Rol.INSPECTOR]: [
    Horario.TURNO_04_14,
    Horario.TURNO_06_16,
    Horario.TURNO_10_20,
    Horario.TURNO_13_23,
    Horario.TURNO_19_05,
  ],
  [Rol.SUPERVISOR]: [
    Horario.TURNO_04_14,
    Horario.TURNO_06_16,
    Horario.TURNO_10_20,
  ],
  [Rol.JEFESECTOR]: [
    Horario.TURNO_04_14,
    Horario.TURNO_10_20,
  ],
  [Rol.ADMIN]: [
    Horario.TURNO_04_14,
    Horario.TURNO_06_16,
  ],
  [Rol.USUARIO]: [],
};

export default function DashboardPage() {
  const [filteredEmployees, setFilteredEmployees] = useState<InspectorExtended[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Rol | 'TODOS'>('TODOS');
  const [selectedShift, setSelectedShift] = useState<GrupoTurno | 'TODOS'>('TODOS');
  const [selectedHorario, setSelectedHorario] = useState<Horario | ''>('');
  const [selectedEmployee, setSelectedEmployee] = useState<InspectorExtended | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState<Partial<InspectorExtended>>({});
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: userData } = useUser();

  const employees = useMemo(() => {
    if (!userData || !Array.isArray(userData)) return [];
    return userData as InspectorExtended[];
  }, [userData]);

  // Calcular estado del empleado
  const calcularEstado = (empleado: InspectorExtended): EstadoEmpleado => {
    if (!empleado.activo) return 'INACTIVO';
    if (empleado.enLicencia) return 'LICENCIA';
    if (empleado.ausente) return 'AUSENTE';

    if (empleado.ultimoLogin) {
      const ultimoAcceso = new Date(empleado.ultimoLogin);
      const ahora = new Date();
      const diasSinAcceso = Math.floor((ahora.getTime() - ultimoAcceso.getTime()) / (1000 * 60 * 60 * 24));
      if (diasSinAcceso > 7) return 'AUSENTE';
    }

    return 'ACTIVO';
  };

  // Funciones de estilo
  const getRoleColor = (rol: Rol) => {
    const colors = {
      [Rol.ADMIN]: 'bg-purple-100 text-purple-800',
      [Rol.JEFESECTOR]: 'bg-red-100 text-red-800',
      [Rol.SUPERVISOR]: 'bg-orange-100 text-orange-800',
      [Rol.INSPECTOR]: 'bg-blue-100 text-blue-800',
      [Rol.USUARIO]: 'bg-gray-100 text-gray-800',
    };
    return colors[rol];
  };

  const getShiftColor = (shift: GrupoTurno) => {
    const colors = {
      [GrupoTurno.A]: 'bg-green-100 text-green-800',
      [GrupoTurno.B]: 'bg-blue-100 text-blue-800',
    };
    return colors[shift];
  };

  const getStatusColor = (estado: EstadoEmpleado) => {
    const colors = {
      ACTIVO: 'bg-green-100 text-green-800',
      LICENCIA: 'bg-yellow-100 text-yellow-800',
      AUSENTE: 'bg-red-100 text-red-800',
      INACTIVO: 'bg-gray-100 text-gray-800'
    };
    return colors[estado];
  };

  const formatDate = (dateString: Date | string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // CRUD operations
  const createEmpleado = async (data: Partial<InspectorExtended>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Error al crear empleado');
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmpleado = async (id: string, data: Partial<InspectorExtended>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Error al actualizar empleado');
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmpleado = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar empleado');
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Resetear horario cuando cambia el rol
  useEffect(() => {
    if (selectedRole !== 'TODOS') {
      const horariosDisponibles = horariosPorRol[selectedRole];
      if (selectedHorario && !horariosDisponibles.includes(selectedHorario as Horario)) {
        setSelectedHorario('');
      }
    } else {
      setSelectedHorario('');
    }
  }, [selectedRole]);

  // Filtrar empleados
  const filteredEmployeesMemo = useMemo(() => {
    let filtered = [...employees];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(emp => {
        const fullName = `${emp.nombre} ${emp.apellido}`.toLowerCase();
        return (
          emp.nombre.toLowerCase().includes(term) ||
          emp.apellido.toLowerCase().includes(term) ||
          fullName.includes(term) ||
          emp.email.toLowerCase().includes(term) ||
          (emp.legajo && emp.legajo.toString().includes(term))
        );
      });
    }

    if (selectedRole !== 'TODOS') {
      filtered = filtered.filter(emp => emp.rol === selectedRole);
    }

    if (selectedShift !== 'TODOS') {
      filtered = filtered.filter(emp => emp.grupoTurno === selectedShift);
    }

    if (selectedHorario) {
      filtered = filtered.filter(emp => emp.horarioLaboral === selectedHorario);
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
  const openModal = (mode: 'view' | 'edit' | 'create', employee?: InspectorExtended) => {
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
        legajo: '',
        email: '',
        rol: Rol.INSPECTOR,
        grupoTurno: GrupoTurno.A,
        telefono: '',
        horarioLaboral: Horario.TURNO_04_14,
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
    // Validaciones
    if (!formData.nombre || formData.nombre.trim() === '') {
      setFormError('El nombre es obligatorio');
      return;
    }

    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(formData.nombre)) {
      setFormError('El nombre solo puede contener letras');
      return;
    }

    if (!formData.apellido || formData.apellido.trim() === '') {
      setFormError('El apellido es obligatorio');
      return;
    }

    if (!nombreRegex.test(formData.apellido)) {
      setFormError('El apellido solo puede contener letras');
      return;
    }

    if (formData.legajo) {
      const legajoExistente = employees.find(emp =>
        emp.legajo === formData.legajo && emp.id !== selectedEmployee?.id
      );

      if (legajoExistente) {
        setFormError('El legajo ya está asignado a otro empleado');
        return;
      }
    }

    if (!formData.email || formData.email.trim() === '') {
      setFormError('El email es obligatorio');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('El formato del email no es válido');
      return;
    }

    const emailExistente = employees.find(emp =>
      emp.email.toLowerCase() === formData.email!.toLowerCase() && emp.id !== selectedEmployee?.id
    );

    if (emailExistente) {
      setFormError('El email ya está registrado en otro empleado');
      return;
    }

    if (formData.fechaNacimiento) {
      const fechaNacimiento = new Date(formData.fechaNacimiento);
      const hoy = new Date();

      if (fechaNacimiento > hoy) {
        setFormError('La fecha de nacimiento no puede ser futura');
        return;
      }

      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mesActual = hoy.getMonth();
      const mesNacimiento = fechaNacimiento.getMonth();

      if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }

      if (edad < 18) {
        setFormError('Debes ser mayor de 18 años');
        return;
      }
    }

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

    if (!formData.rol) {
      setFormError('Debe seleccionar un rol');
      return;
    }

    if (!formData.grupoTurno) {
      setFormError('Debe seleccionar un grupo de turno');
      return;
    }

    setFormError('');

    try {
      if (modalMode === 'create') {
        const confirmCreate = window.confirm('¿Seguro que quiere crear un nuevo empleado?');
        if (!confirmCreate) return;

        await createEmpleado({
          legajo: formData.legajo,
          email: formData.email!,
          nombre: formData.nombre!,
          apellido: formData.apellido!,
          rol: formData.rol || Rol.INSPECTOR,
          telefono: formData.telefono || null,
          direccion: formData.direccion || null,
          horarioLaboral: formData.horarioLaboral || null,
          fechaNacimiento: formData.fechaNacimiento || null,
          activo: formData.activo !== undefined ? formData.activo : true,
          grupoTurno: formData.grupoTurno || GrupoTurno.A,
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

  // Loading state
  if (!userData || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <p className="text-gray-600 dark:text-gray-400">Cargando empleados...</p>
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de Empleados</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Administra los empleados, turnos y permisos del sistema WorkShift
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Empleados"
          value={stats.total}
          icon={Briefcase}
          iconBgColor="bg-blue-100 dark:bg-blue-900"
          iconColor="text-blue-600"
          valueColor="text-blue-400 dark:text-blue-400"
        />
        <StatsCard
          title="Activos"
          value={stats.activos}
          icon={Check}
          iconBgColor="bg-green-100 dark:bg-green-900"
          iconColor="text-green-600"
          valueColor="text-green-600"
        />
        <StatsCard
          title="En Licencia"
          value={stats.enLicencia}
          icon={Calendar}
          iconBgColor="bg-yellow-100 dark:bg-yellow-900"
          iconColor="text-yellow-600"
          valueColor="text-yellow-600"
        />
        <StatsCard
          title="Ausentes"
          value={stats.ausentes}
          icon={AlertCircle}
          iconBgColor="bg-red-100 dark:bg-red-900"
          iconColor="text-red-600"
          valueColor="text-red-600"
        />
      </div>

      {/* Filters */}
      <EmployeeFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        selectedShift={selectedShift}
        setSelectedShift={setSelectedShift}
        selectedHorario={selectedHorario}
        setSelectedHorario={setSelectedHorario}
        horariosPorRol={horariosPorRol}
        onCreateEmployee={() => openModal('create')}
        filteredEmployees={filteredEmployees.map(emp => ({
          ...emp,
          horario: getHorarioLabel(emp.horarioLaboral),
          createdAt: emp.createdAt ? new Date(emp.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: emp.updatedAt ? new Date(emp.updatedAt).toISOString() : new Date().toISOString(),
        }))}
        stats={stats}
        calcularEstado={calcularEstado}
      />

      {/* Desktop Table */}
      <EmployeeTable
        employees={filteredEmployees}
        onView={(emp) => openModal('view', emp)}
        onEdit={(emp) => openModal('edit', emp)}
        onDelete={handleDelete}
        calcularEstado={calcularEstado}
        getRoleColor={getRoleColor}
        getShiftColor={getShiftColor}
        getStatusColor={getStatusColor}
      />

      {/* Mobile List */}
      <EmployeeMobileList
        employees={filteredEmployees}
        onView={(emp) => openModal('view', emp)}
        onEdit={(emp) => openModal('edit', emp)}
        onDelete={handleDelete}
        calcularEstado={calcularEstado}
        getRoleColor={getRoleColor}
        getShiftColor={getShiftColor}
        getStatusColor={getStatusColor}
      />

      {/* Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        mode={modalMode}
        employee={selectedEmployee}
        formData={formData}
        formError={formError}
        horariosPorRol={horariosPorRol}
        onClose={closeModal}
        onSave={handleSave}
        setFormData={setFormData}
        setFormError={setFormError}
        formatDate={formatDate}
        getRoleColor={getRoleColor}
        getShiftColor={getShiftColor}
        getStatusColor={getStatusColor}
        calcularEstado={calcularEstado}
      />
    </div>
  );
}