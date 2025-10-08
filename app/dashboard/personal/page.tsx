'use client';

import { useState, useEffect } from 'react';
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

} from 'lucide-react';
import WSMSLogo from '@/app/ui/WSMSLogo';

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
}

// Mock data generator
const generateMockEmployees = (): Inspector[] => {
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Patricia', 'Roberto', 'Carmen', 'Miguel', 'Isabel'];
  const apellidos = ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Díaz', 'Torres'];
  const legajos = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025];
  const roles: Rol[] = ['INSPECTOR', 'SUPERVISOR', 'JEFE'];
  const grupos: GrupoTurno[] = ['A', 'B'];

  return Array.from({ length: 25 }, (_, i) => ({
    id: `USR${String(i + 1).padStart(3, '0')}`,
    email: `${nombres[i % nombres.length].toLowerCase()}.${apellidos[i % apellidos.length].toLowerCase()}@workshift.com`,
    nombre: nombres[i % nombres.length],
    apellido: apellidos[i % apellidos.length],
    legajo: legajos[i % legajos.length],
    rol: roles[Math.floor(Math.random() * roles.length)],
    telefono: `+54 11${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    direccion: `Calle ${apellidos[(i + 3) % apellidos.length]} ${Math.floor(Math.random() * 100)}, Buenos Aires`,
    horario: `${8 + Math.floor(Math.random() * 5)}:00 - ${17 + Math.floor(Math.random() * 5)}:00`,
    fechaNacimiento: new Date(1970 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
    activo: Math.random() > 0.2,
    grupoTurno: grupos[i % grupos.length],
    fotoPerfil: null,
    ultimoLogin: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 7)).toISOString(),
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 365)).toISOString(),
    updatedAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 30)).toISOString(),
    estado: ['ACTIVO', 'LICENCIA', 'AUSENTE', 'ACTIVO', 'ACTIVO'][Math.floor(Math.random() * 5)] as EstadoEmpleado,
    turnosEsteMes: Math.floor(Math.random() * 22),
    horasAcumuladas: Math.floor(Math.random() * 160) + 40,
    intercambiosPendientes: Math.floor(Math.random() * 3)
  }));
};

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Inspector[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Inspector[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Rol | 'TODOS'>('TODOS');
  const [selectedShift, setSelectedShift] = useState<GrupoTurno | 'TODOS'>('TODOS');
  const [selectedEmployee, setSelectedEmployee] = useState<Inspector | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState<Partial<Inspector>>({});
  const [formError, setFormError] = useState('');

  // Initialize mock data
  useEffect(() => {
    const mockData = generateMockEmployees();
    setEmployees(mockData);
    setFilteredEmployees(mockData);
  }, []);

  // Filter employees
  useEffect(() => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();

      filtered = filtered.filter(emp => {
        const fullName = `${emp.nombre} ${emp.apellido}`.toLowerCase(); // nombre completo
        return (
          emp.nombre.toLowerCase().includes(term) ||
          emp.apellido.toLowerCase().includes(term) ||
          fullName.includes(term) || // busca "nombre apellido"
          emp.email.toLowerCase().includes(term) ||
          emp.id.toString().toLowerCase().includes(term)
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

    setFilteredEmployees(filtered);
  }, [searchTerm, selectedRole, selectedShift, employees]);

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
        horario: '',
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

  const handleSave = () => {

if (!formData.nombre || formData.nombre.trim() === '') {
    setFormError('El nombre es obligatorio');
    return;
  }

  if (!formData.apellido || formData.apellido.trim() === '') {
    setFormError('El apellido es obligatorio');
    return;
  }

  if (!formData.legajo || isNaN(Number(formData.legajo))) {
    setFormError('El legajo es obligatorio');
    return;
  }

const legajoExistente = employees.find(emp => 
    emp.legajo === formData.legajo && emp.id !== selectedEmployee?.id
  );

  if (legajoExistente) {
    setFormError('El legajo ya está asignado a otro empleado');
    return;
  }

  // Si pasa las validaciones, limpiar error
  setFormError('');

  if (modalMode === 'create') {
    const confirmCreate = window.confirm('¿Seguro que quiere crear un nuevo empleado?');
    if (!confirmCreate) return;
    // ...código para crear...
    const newEmployee: Inspector = {
      ...formData as Inspector,
      id: `USR${String(employees.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ultimoLogin: null,
      fotoPerfil: null,
      fechaNacimiento: formData.fechaNacimiento || null,
      estado: 'ACTIVO',
      turnosEsteMes: 0,
      horasAcumuladas: 0,
      intercambiosPendientes: 0
    };
    setEmployees([...employees, newEmployee]);
  } else if (modalMode === 'edit' && selectedEmployee) {
    const confirmEdit = window.confirm('¿Seguro quiere modificar los datos del empleado?');
    if (!confirmEdit) return;
    // ...código para editar...
    const updatedEmployees = employees.map(emp =>
      emp.id === selectedEmployee.id
        ? { ...emp, ...formData, updatedAt: new Date().toISOString() }
        : emp
    );
    setEmployees(updatedEmployees);
  }
  closeModal();
};

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      setEmployees(employees.filter(emp => emp.id !== id));
    }
  };




  // Stats calculation
  const stats = {
    total: employees.length,
    activos: employees.filter(e => e.activo && e.estado === 'ACTIVO').length,
    enLicencia: employees.filter(e => e.estado === 'LICENCIA').length,
    ausentes: employees.filter(e => e.estado === 'AUSENTE').length
  };

  // Role styles
  const getRoleColor = (rol: Rol) => {
    const colors = {
      Supervisor: 'bg-purple-100 text-purple-800',
      JEFE: 'bg-red-100 text-red-800',
      SUPERVISOR: 'bg-orange-100 text-orange-800',
      INSPECTOR: 'bg-blue-100 text-blue-800',
      Inspector: 'bg-gray-100 text-gray-800'
    };
    return colors[rol];
  };

  // Shift styles
  const getShiftColor = (shift: GrupoTurno) => {
    const colors = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-blue-100 text-blue-800',
      C: 'bg-yellow-100 text-yellow-800',
      D: 'bg-red-100 text-red-800'
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Empleados</h1>
        <p className="text-gray-600 mt-1">Administra los empleados, turnos y permisos del sistema WorkShift</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Empleados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Licencia</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.enLicencia}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ausentes</p>
              <p className="text-2xl font-bold text-red-600">{stats.ausentes}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex-1 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        <div className="flex flex-col md:flex-row gap-4">
          

          <select
            className="px-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white text-gray-800 hover:border-blue-400"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Rol | 'TODOS')}
          >
            <option value="TODOS">Todos los Roles</option>
            <option value="JEFE">Jefe</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="INSPECTOR">Inspector</option>
          </select>


          <select
            className="px-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value as GrupoTurno | 'TODOS')}
          >
            <option value="TODOS">Todos los Turnos</option>
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
          </select>

          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </button>

          <button
            onClick={() => openModal('create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turnos/Mes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Acceso
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {employee.nombre[0]}{employee.apellido[0]}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {employee.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(employee.rol)}`}>
                      {employee.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getShiftColor(employee.grupoTurno)}`}>
                      {employee.grupoTurno}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(employee.estado || 'ACTIVO')}`}>
                      {employee.estado || 'ACTIVO'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {employee.turnosEsteMes}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastLogin(employee.ultimoLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal('view', employee)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal('edit', employee)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-900"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {modalMode === 'create' ? 'Nuevo Empleado' :
                    modalMode === 'edit' ? 'Editar Empleado' : 'Detalles del Empleado'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">

              {/* Error message */}
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              {modalMode === 'view' && selectedEmployee ? (
                // View mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">ID</p>
                      <p className="font-semibold">{selectedEmployee.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Legajo</p>
                      <p className="font-semibold">{selectedEmployee.legajo || 'No asignado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado</p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedEmployee.estado || 'ACTIVO')}`}>
                        {selectedEmployee.estado || 'ACTIVO'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nombre Completo</p>
                      <p className="font-semibold">{selectedEmployee.nombre} {selectedEmployee.apellido}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{selectedEmployee.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Rol</p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(selectedEmployee.rol)}`}>
                        {selectedEmployee.rol}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Grupo de Turno</p>
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getShiftColor(selectedEmployee.grupoTurno)}`}>
                        {selectedEmployee.grupoTurno}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-semibold">{selectedEmployee.telefono || 'No registrado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                      <p className="font-semibold">{formatDate(selectedEmployee.fechaNacimiento)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Dirección</p>
                    <p className="font-semibold">{selectedEmployee.direccion || 'No registrada'}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="font-semibold mb-2">Estadísticas del Mes</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Turnos</p>
                        <p className="text-xl font-bold">{selectedEmployee.turnosEsteMes}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Horas</p>
                        <p className="text-xl font-bold">{selectedEmployee.horasAcumuladas}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Intercambios</p>
                        <p className="text-xl font-bold">{selectedEmployee.intercambiosPendientes}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Último acceso</p>
                        <p className="font-semibold">{formatLastLogin(selectedEmployee.ultimoLogin)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cuenta creada</p>
                        <p className="font-semibold">{formatDate(selectedEmployee.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Edit/Create form
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formError && (!formData.nombre || formData.nombre.trim() === '')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                        }`}
                        value={formData.nombre || ''}
                          onChange={(e) => {
                          setFormData({...formData, nombre: e.target.value});
                          if (formError) setFormError('');
                        }}
/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formError && (!formData.apellido || formData.apellido.trim() === '')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                        }`}
                        value={formData.apellido || ''}
                        onChange={(e) => {
                        setFormData({...formData, apellido: e.target.value});
                        if (formError) setFormError('');
                        }}
                      />
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-4">

<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Legajo <span className="text-red-500">*</span>
    </label>
    <input
      type="text"
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        formError && (!formData.legajo || isNaN(Number(formData.legajo)))
          ? 'border-red-300 bg-red-50'
          : 'border-gray-300'
      }`}
      value={formData.legajo || ''}
      onChange={(e) => {
        setFormData({...formData, legajo: e.target.value ? Number(e.target.value) : undefined});
        if (formError) setFormError('');
      }}
      placeholder="Ej: LEG001"
    />
  </div>



  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Email
    </label>
    <input
      type="email"
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        formError && (!formData.email || formData.email.trim() === '')
          ? 'border-red-300 bg-red-50'
          : 'border-gray-300'
      }`}
      value={formData.email || ''}
      onChange={(e) => {
        setFormData({...formData, email: e.target.value});
        if (formError) setFormError('');
      }}
    />
  </div>
  
  
</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rol
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.rol || 'INSPECTOR'}
                        onChange={(e) => setFormData({ ...formData, rol: e.target.value as Rol })}
                      >
                        <option value="INSPECTOR">Inspector</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="JEFE">Jefe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grupo de Turno
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.grupoTurno || 'A'}
                        onChange={(e) => setFormData({ ...formData, grupoTurno: e.target.value as GrupoTurno })}
                      >
                        <option value="A">Turno A</option>
                        <option value="B">Turno B</option>

                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.telefono || ''}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.fechaNacimiento ? formData.fechaNacimiento.split('T')[0] : ''}
                        onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.direccion || ''}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horario
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 9:00 - 18:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"  ></input>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData.activo || false}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Cuenta activa
                      </span>
                    </label>
                  </div>
                </form>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              {modalMode !== 'view' && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Marca de agua */}
      {/* <div className="flex items-center justify-center mt-8 gap-x-0">
              <span className="text-sm text-gray-700 flex items-center">Powered by
              <WSMSLogo className="h-20 w-20 ml-3" />
              </span>
            </div> */}
    </div>
  );
}