'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  RefreshCw,
  Gift,
  MessageSquare,
  Star,
  AlertCircle,
  TrendingUp,
  User,
  Plus,
  X,
  Check,
  ChevronDown,
  Flame,
  Zap,
} from 'lucide-react';

// Types
type Rol = 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
type GrupoTurno = 'A' | 'B';
type TipoOferta = 'INTERCAMBIO' | 'ABIERTO';
type Prioridad = 'NORMAL' | 'URGENTE';
type EstadoOferta = 'DISPONIBLE' | 'SOLICITADO' | 'APROBADO' | 'COMPLETADO' | 'CANCELADO';

interface Oferta {
  id: string;
  ofertante: {
    id: string;
    nombre: string;
    apellido: string;
    rol: Rol;
    calificacion: number;
    totalIntercambios: number;
  };
  tipo: TipoOferta;
  turnoOfrece: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  } | null;
  turnoBusca: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  } | null;
  rangoFechas?: {
    desde: string;
    hasta: string;
  };
  descripcion: string;
  prioridad: Prioridad;
  validoHasta: string;
  publicado: string;
  estado: EstadoOferta;
}

// Mock data
const generateMockOfertas = (): Oferta[] => {
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Patricia'];
  const apellidos = ['García', 'López', 'Martínez', 'Rodríguez', 'Fernández', 'González'];
  const horarios = ['04:00-14:00', '06:00-16:00', '10:00-20:00', '13:00-23:00', '14:00-23:00'];
  
  return Array.from({ length: 12 }, (_, i) => {
    const tipo: TipoOferta = ['INTERCAMBIO', 'ABIERTO'][Math.floor(Math.random() * 2)] as TipoOferta;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + Math.floor(Math.random() * 14) + 1);
    
    return {
      id: `OF${String(i + 1).padStart(3, '0')}`,
      ofertante: {
        id: `USR${i + 1}`,
        nombre: nombres[i % nombres.length],
        apellido: apellidos[i % apellidos.length],
        rol: ['INSPECTOR', 'SUPERVISOR'][Math.floor(Math.random() * 2)] as Rol,
        calificacion: 3.5 + Math.random() * 1.5,
        totalIntercambios: Math.floor(Math.random() * 50) + 5,
      },
      tipo,
      turnoOfrece: tipo !== 'ABIERTO' ? {
        fecha: fecha.toISOString().split('T')[0],
        horario: horarios[Math.floor(Math.random() * horarios.length)],
        grupoTurno: ['A', 'B'][Math.floor(Math.random() * 2)] as GrupoTurno,
      } : null,
      turnoBusca: tipo === 'INTERCAMBIO' ? {
        fecha: new Date(fecha.getTime() + 86400000 * 2).toISOString().split('T')[0],
        horario: horarios[Math.floor(Math.random() * horarios.length)],
        grupoTurno: ['A', 'B'][Math.floor(Math.random() * 2)] as GrupoTurno,
      } : null,
      rangoFechas: tipo === 'ABIERTO' ? {
        desde: fecha.toISOString().split('T')[0],
        hasta: new Date(fecha.getTime() + 86400000 * 7).toISOString().split('T')[0],
      } : undefined,
      descripcion: tipo === 'ABIERTO' 
        ? 'Disponible para negociar cambios. Preferiblemente horarios de tarde. Contactame para coordinar.'
        : 'Necesito ese día para un trámite médico importante.',
      prioridad: Math.random() > 0.7 ? 'URGENTE' : 'NORMAL',
      validoHasta: new Date(fecha.getTime() - 86400000).toISOString(),
      publicado: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
      estado: 'DISPONIBLE',
    };
  });
};

export default function CambiosTurnosPage() {
  const [activeTab, setActiveTab] = useState<'buscar' | 'ofrecer' | 'mis-ofertas' | 'historial'>('buscar');
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [filteredOfertas, setFilteredOfertas] = useState<Oferta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<TipoOferta | 'TODOS'>('TODOS');
  const [selectedTurno, setSelectedTurno] = useState<GrupoTurno | 'TODOS'>('TODOS');
  const [selectedPrioridad, setSelectedPrioridad] = useState<Prioridad | 'TODOS'>('TODOS');
  const [minCalificacion, setMinCalificacion] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [solicitudesTab, setSolicitudesTab] = useState<'estado' | 'historico'>('estado');

  // Initialize mock data
  useEffect(() => {
    const mockData = generateMockOfertas();
    setOfertas(mockData);
    setFilteredOfertas(mockData);
  }, []);

  // Filter ofertas
  useEffect(() => {
    let filtered = [...ofertas];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(oferta => 
        oferta.ofertante.nombre.toLowerCase().includes(term) ||
        oferta.ofertante.apellido.toLowerCase().includes(term) ||
        `${oferta.ofertante.nombre} ${oferta.ofertante.apellido}`.toLowerCase().includes(term)
      );
    }

    // Tipo filter
    if (selectedTipo !== 'TODOS') {
      filtered = filtered.filter(oferta => oferta.tipo === selectedTipo);
    }

    // Turno filter
    if (selectedTurno !== 'TODOS') {
      filtered = filtered.filter(oferta => 
        oferta.turnoOfrece?.grupoTurno === selectedTurno
      );
    }

    // Prioridad filter
    if (selectedPrioridad !== 'TODOS') {
      filtered = filtered.filter(oferta => oferta.prioridad === selectedPrioridad);
    }

    // Calificación filter
    if (minCalificacion > 0) {
      filtered = filtered.filter(oferta => oferta.ofertante.calificacion >= minCalificacion);
    }

    setFilteredOfertas(filtered);
  }, [searchTerm, selectedTipo, selectedTurno, selectedPrioridad, minCalificacion, ofertas]);

  // Stats
  const stats = useMemo(() => ({
    total: ofertas.length,
    intercambios: ofertas.filter(o => o.tipo === 'INTERCAMBIO').length,
    abiertos: ofertas.filter(o => o.tipo === 'ABIERTO').length,
    urgentes: ofertas.filter(o => o.prioridad === 'URGENTE').length,
  }), [ofertas]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${Math.floor(diffHours / 24)}d`;
  };

  // Get tipo icon
  const getTipoIcon = (tipo: TipoOferta) => {
    switch (tipo) {
      case 'INTERCAMBIO': return <RefreshCw className="h-4 w-4" />;
      case 'ABIERTO': return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Get tipo color
  const getTipoColor = (tipo: TipoOferta) => {
    switch (tipo) {
      case 'INTERCAMBIO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'ABIERTO': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    }
  };

  // Get turno color
  const getTurnoColor = (turno: GrupoTurno) => {
    return turno === 'A' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Intercambio de Turnos
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
          Ofrece y busca cambios de turno con tus compañeros
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Ofertas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">Intercambios</p>
          <p className="text-2xl font-bold text-blue-600">{stats.intercambios}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">Abiertos</p>
          <p className="text-2xl font-bold text-purple-600">{stats.abiertos}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">Urgentes</p>
          <p className="text-2xl font-bold text-red-600">{stats.urgentes}</p>
        </div>
      </div>


      {/* Main Content - Dos Cards Superiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {/* Card 1: Ofertas comprar/vender */}
        <div 
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => setIsModalOpen(true)}
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[280px]">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <RefreshCw className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
              Ofertas comprar/vender
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
              Publica o busca ofertas de cambio de turnos con tus compañeros
            </p>
          </div>
        </div>

        {/* Card 2: Solicitud directa */}
        <div 
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => setIsModalOpen(true)}
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[280px]">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
              Solicitud directa
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
              Envía una solicitud directa de cambio a un compañero específico
            </p>
          </div>
        </div>
      </div>

      {/* Sección Inferior - Estado de solicitudes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
        {/* Header con tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setSolicitudesTab('estado')}
                className={`font-semibold text-base pb-1 transition-colors ${
                  solicitudesTab === 'estado'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-b-2 hover:border-gray-900 dark:hover:border-gray-100'
                }`}
              >
                Estado de solicitudes
              </button>
              <button 
                onClick={() => setSolicitudesTab('historico')}
                className={`font-semibold text-base pb-1 transition-colors ${
                  solicitudesTab === 'historico'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-b-2 hover:border-gray-900 dark:hover:border-gray-100'
                }`}
              >
                Histórico
              </button>
            </div>
            <button className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm">
              Detalles...
            </button>
          </div>
        </div>

        {/* Content Area - Estado de solicitudes */}
        {solicitudesTab === 'estado' && (
          <div className="p-6">
            <div className="space-y-3">
              {/* Solicitud Item 1 */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">Solicitud de cambio pendiente</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 md:ml-5">Hace 2 horas</div>
              </div>

              {/* Solicitud Item 2 */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">Nueva oferta disponible</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 md:ml-5">Hace 5 horas</div>
              </div>

              {/* Solicitud Item 3 */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">Cambio aprobado por supervisor</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 md:ml-5">Ayer</div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area - Histórico */}
        {solicitudesTab === 'historico' && (
          <div className="p-6">
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Historial de Cambios
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Aquí verás todos tus cambios de turno realizados anteriormente
              </p>
              <div className="space-y-3 max-w-2xl mx-auto">
                {/* Ejemplo de item histórico */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">Intercambio con Juan García</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">Turno del 15 Oct por turno del 20 Oct</p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 md:ml-5">Hace 2 semanas</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal de ejemplo (puedes personalizarlo según necesites) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-400 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Nueva Solicitud
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 text-center py-12">
                Contenido del formulario aquí...
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}