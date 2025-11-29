import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, Clock, User, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';

// Tipos
type EstadoSolicitud = 'SOLICITADO' | 'APROBADO' | 'COMPLETADO' | 'CANCELADO';

interface SolicitudCambio {
  id: string;
  solicitante: {
    nombre: string;
    apellido: string;
    rol: string;
  };
  destinatario: {
    nombre: string;
    apellido: string;
    rol: string;
  };
  turnoSolicitante: {
    fecha: string;
    horario: string;
    grupoTurno: string;
  };
  turnoDestinatario: {
    fecha: string;
    horario: string;
    grupoTurno: string;
  };
  motivo: string;
  prioridad: 'NORMAL' | 'URGENTE';
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaRespuesta?: string;
}

interface ModalConsultarSolicitudesProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalConsultarSolicitudes: React.FC<ModalConsultarSolicitudesProps> = ({ isOpen, onClose }) => {
  const [solicitudes, setSolicitudes] = useState<SolicitudCambio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Cargar solicitudes
  useEffect(() => {
    if (isOpen) {
      fetchSolicitudes();
    }
  }, [isOpen]);

  const fetchSolicitudes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/solicitudes-directas');
      if (res.ok) {
        const data = await res.json();
        setSolicitudes(data);
      } else {
        throw new Error('Error al cargar las solicitudes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar solicitudes
  const solicitudesFiltradas = solicitudes.filter(solicitud => {
    const coincideBusqueda = busqueda === '' ||
      solicitud.solicitante.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      solicitud.solicitante.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      solicitud.destinatario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      solicitud.destinatario.apellido.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstado = filtroEstado === 'TODOS' || solicitud.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  // Utilidades
  const formatearFecha = (fecha: string) => {
    if (!fecha) return "Fecha inválida";

    // Fecha esperada: "2025-12-01"
    const partes = fecha.split("-");
    if (partes.length !== 3) return "Fecha inválida";

    const [year, month, day] = partes;
    return `${day}/${month}/${year}`;
  };

  const getEstadoColor = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'SOLICITADO':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'APROBADO':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'COMPLETADO':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getEstadoIcon = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'COMPLETADO':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELADO':
        return <XCircle className="h-4 w-4" />;
      case 'APROBADO':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-consultar-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-400 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 id="modal-consultar-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Consultar Solicitudes de Cambio
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {solicitudesFiltradas.length} {solicitudesFiltradas.length === 1 ? 'solicitud encontrada' : 'solicitudes encontradas'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Filtro por estado */}
            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as EstadoSolicitud | 'TODOS')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="SOLICITADO">Solicitado</option>
                <option value="APROBADO">Aprobado</option>
                <option value="COMPLETADO">Completado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="VENCIDO">Vencido</option>

              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Cargando solicitudes...</p>
            </div>
          ) : solicitudesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                No se encontraron solicitudes
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {busqueda || filtroEstado !== 'TODOS'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Aún no hay solicitudes registradas'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudesFiltradas.map((solicitud) => (
                <div
                  key={solicitud.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  {/* Header de la solicitud */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {solicitud.solicitante.nombre} {solicitud.solicitante.apellido}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          → {solicitud.destinatario.nombre} {solicitud.destinatario.apellido}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getEstadoColor(solicitud.estado)}`}>
                        {getEstadoIcon(solicitud.estado)}
                        {solicitud.estado}
                      </span>
                      {solicitud.prioridad === 'URGENTE' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          URGENTE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalles del intercambio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Turno del solicitante */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">
                        Turno ofrecido:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatearFecha(solicitud.turnoSolicitante.fecha)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-gray-900 dark:text-gray-100">
                            {solicitud.turnoSolicitante.horario}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Grupo {solicitud.turnoSolicitante.grupoTurno}
                        </div>
                      </div>
                    </div>

                    {/* Turno del destinatario */}
                    <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-3">
                        Turno solicitado:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatearFecha(solicitud.turnoDestinatario.fecha)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-gray-900 dark:text-gray-100">
                            {solicitud.turnoDestinatario.horario}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Grupo {solicitud.turnoDestinatario.grupoTurno}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Motivo */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Motivo:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{solicitud.motivo}"
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span>Solicitado: {formatearFecha(solicitud.fechaSolicitud)}</span>
                    {solicitud.fechaRespuesta && (
                      <span>Respondido: {formatearFecha(solicitud.fechaRespuesta)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConsultarSolicitudes;