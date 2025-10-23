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

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700 mb-6">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('buscar')}
            className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'buscar'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Search className="h-4 w-4 inline-block mr-2" />
            Buscar Turno
          </button>
          <button
            onClick={() => setActiveTab('ofrecer')}
            className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'ofrecer'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Plus className="h-4 w-4 inline-block mr-2" />
            Ofrecer Turno
          </button>
          <button
            onClick={() => setActiveTab('mis-ofertas')}
            className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'mis-ofertas'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <User className="h-4 w-4 inline-block mr-2" />
            Mis Ofertas
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'historial'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Clock className="h-4 w-4 inline-block mr-2" />
            Historial
          </button>
        </div>
      </div>

      {/* Content - Buscar Turno */}
      {activeTab === 'buscar' && (
        <>
          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            {/* Search bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre del ofertante..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-3"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value as TipoOferta | 'TODOS')}
                >
                  <option value="TODOS">Todos los tipos</option>
                  <option value="INTERCAMBIO">🔄 Intercambio</option>
                  <option value="ABIERTO">💬 Abierto</option>
                </select>

                <select
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  value={selectedTurno}
                  onChange={(e) => setSelectedTurno(e.target.value as GrupoTurno | 'TODOS')}
                >
                  <option value="TODOS">Todos los turnos</option>
                  <option value="A">Turno A</option>
                  <option value="B">Turno B</option>
                </select>

                <select
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  value={selectedPrioridad}
                  onChange={(e) => setSelectedPrioridad(e.target.value as Prioridad | 'TODOS')}
                >
                  <option value="TODOS">Todas las prioridades</option>
                  <option value="URGENTE">🔥 Urgente</option>
                  <option value="NORMAL">📅 Normal</option>
                </select>

                <select
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  value={minCalificacion}
                  onChange={(e) => setMinCalificacion(Number(e.target.value))}
                >
                  <option value="0">Cualquier calificación</option>
                  <option value="4.5">⭐ 4.5+</option>
                  <option value="4.0">⭐ 4.0+</option>
                  <option value="3.5">⭐ 3.5+</option>
                </select>
              </div>
            )}
          </div>

          {/* Ofertas List */}
          <div className="space-y-4">
            {filteredOfertas.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No se encontraron ofertas con estos filtros</p>
              </div>
            ) : (
              filteredOfertas.map((oferta) => (
                <div
                  key={oferta.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-4 md:p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {oferta.ofertante.nombre[0]}{oferta.ofertante.apellido[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {oferta.ofertante.nombre} {oferta.ofertante.apellido}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>{oferta.ofertante.rol}</span>
                            <span>•</span>
                            {renderStars(oferta.ofertante.calificacion)}
                            <span className="text-xs">({oferta.ofertante.totalIntercambios})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getTipoColor(oferta.tipo)}`}>
                          {getTipoIcon(oferta.tipo)}
                          {oferta.tipo === 'INTERCAMBIO' ? 'Intercambio' : 'Abierto'}
                        </span>
                        {oferta.prioridad === 'URGENTE' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            Urgente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Turno Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Ofrece */}
                      {oferta.tipo !== 'ABIERTO' && oferta.turnoOfrece && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">📅 OFRECE</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {formatDate(oferta.turnoOfrece.fecha)}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              🕐 {oferta.turnoOfrece.horario}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTurnoColor(oferta.turnoOfrece.grupoTurno)}`}>
                              {oferta.turnoOfrece.grupoTurno}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Busca */}
                      {oferta.tipo === 'INTERCAMBIO' && oferta.turnoBusca && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">🔍 BUSCA</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {formatDate(oferta.turnoBusca.fecha)}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              🕐 {oferta.turnoBusca.horario}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTurnoColor(oferta.turnoBusca.grupoTurno)}`}>
                              {oferta.turnoBusca.grupoTurno}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Rango Abierto */}
                      {oferta.tipo === 'ABIERTO' && oferta.rangoFechas && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 md:col-span-2">
                          <p className="text-xs text-purple-600 dark:text-purple-400 mb-2 font-medium">📆 DISPONIBILIDAD</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatDate(oferta.rangoFechas.desde)} - {formatDate(oferta.rangoFechas.hasta)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {oferta.descripcion && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          💬 {oferta.descripcion}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Válido hasta {formatDate(oferta.validoHasta)}
                        </span>
                      </div>
                      <button className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                        <Check className="h-4 w-4" />
                        Solicitar Cambio
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Content - Ofrecer Turno */}
      {activeTab === 'ofrecer' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Crear Nueva Oferta
          </h2>
          
          <form className="space-y-6">
            {/* Tipo de Oferta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tipo de Oferta <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input type="radio" name="tipo" value="INTERCAMBIO" className="mr-3" defaultChecked />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                      Intercambio específico
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Ofreces un turno específico y buscas otro turno específico a cambio
                    </p>
                  </div>
                </label>
                <label className="flex items-center p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input type="radio" name="tipo" value="ABIERTO" className="mr-3" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      Abierto a negociar
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Anuncias disponibilidad para coordinar intercambios flexibles
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Mi Turno (para INTERCAMBIO y GRATIS) */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Mi Turno</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horario <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option>04:00-14:00</option>
                    <option>06:00-16:00</option>
                    <option>10:00-20:00</option>
                    <option>13:00-23:00</option>
                    <option>19:00-05:00</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Turno <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="A">Turno A</option>
                    <option value="B">Turno B</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Turno que Necesito (solo para INTERCAMBIO) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Turno que Necesito</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horario <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option>04:00-14:00</option>
                    <option>06:00-16:00</option>
                    <option>10:00-20:00</option>
                    <option>13:00-23:00</option>
                    <option>19:00-05:00</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Turno <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="A">Turno A</option>
                    <option value="B">Turno B</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Disponibilidad (solo para ABIERTO) */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 hidden">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Disponibilidad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Desde <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hasta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Detalles Adicionales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detalles Adicionales (opcional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                rows={4}
                maxLength={500}
                placeholder="Ej: Prefiero horarios de tarde, puedo coordinar en varios días..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Máximo 500 caracteres</p>
            </div>

            {/* Configuración */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prioridad
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="NORMAL">📅 Normal</option>
                  <option value="URGENTE">🔥 Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Válido hasta
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Publicar Oferta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content - Mis Ofertas */}
      {activeTab === 'mis-ofertas' && (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Mis Ofertas Activas
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Aquí verás las ofertas que has publicado y su estado actual
          </p>
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Crear Primera Oferta
          </button>
        </div>
      )}

    /</div>)}