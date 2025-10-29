'use client';

import { useState, useCallback } from 'react';
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
import { useModal } from '@/hooks/useModal';
import { SolicitudesTabType, useTabs } from '@/hooks/useTabs';
import { useFormatters } from '@/hooks/useFormatters';
import { GrupoTurno, NuevaOfertaForm, useOfertas } from '@/hooks/useOfertas';
import { SolicitudDirectaForm, useSolicitudesDirectas } from '@/hooks/useSolicitudesDirectas';
import useSWR from 'swr';

// Constantes
const fetcher = (url: string) => fetch(url).then(res => res.json());
const HORARIOS = ['04:00-14:00', '06:00-16:00', '10:00-20:00', '13:00-23:00', '14:00-23:00'];
const GRUPOS: GrupoTurno[] = ['A', 'B'];



const INITIAL_OFERTA_FORM: NuevaOfertaForm = {
  tipo: 'INTERCAMBIO',
  fechaOfrece: '',
  horarioOfrece: '04:00-14:00',
  grupoOfrece: 'A',
  fechaBusca: '',
  horarioBusca: '04:00-14:00',
  grupoBusca: 'A',
  fechaDesde: '',
  fechaHasta: '',
  descripcion: '',
  prioridad: 'NORMAL',
};

const INITIAL_SOLICITUD_FORM: SolicitudDirectaForm = {
  solicitanteId: '410544b2-4001-4271-9855-fec4b6a6442a',
  destinatarioId: '',
  fechaSolicitante: '',
  horarioSolicitante: '04:00-14:00',
  grupoSolicitante: 'A',
  fechaDestinatario: '',
  horarioDestinatario: '04:00-14:00',
  grupoDestinatario: 'A',
  motivo: '',
  prioridad: 'NORMAL',
};

export default function CambiosTurnosPage() {

  // Cargar usuarios dinámicamente
  const { data: usuarios, error: errorUsuarios } = useSWR('/api/users', fetcher);

  // Transformar para compatibilidad (opcional)
  const COMPANEROS = usuarios?.map((u: any) => ({
    id: u.id,
    nombre: `${u.nombre} ${u.apellido}`,
    cargo: u.rol
  })) || [];

  // Hooks personalizados - SEPARADOS correctamente
  const {
    ofertas,
    stats,
    agregarOferta,
    actualizarEstado: actualizarEstadoOferta,
    eliminarOferta,
    isLoading: isLoadingOfertas,
    error: errorOfertas
  } = useOfertas();

  const {
    solicitudes,
    agregarSolicitud,
    actualizarEstado,
    isLoading: isLoadingSolicitudes,
    error: errorSolicitudes
  } = useSolicitudesDirectas();

  const { modalType, isModalOpen, openModal, closeModal } = useModal();
  const { activeTab: solicitudesTab, setActiveTab: setSolicitudesTab } = useTabs<SolicitudesTabType>('estado');
  const { formatTimeAgo, formatDate } = useFormatters();

  // Form states
  const [nuevaOfertaForm, setNuevaOfertaForm] = useState<NuevaOfertaForm>(INITIAL_OFERTA_FORM);
  const [solicitudDirectaForm, setSolicitudDirectaForm] = useState<SolicitudDirectaForm>(INITIAL_SOLICITUD_FORM);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validación de formularios
  const validateOfertaForm = useCallback((form: NuevaOfertaForm): string => {
    if (form.tipo === 'INTERCAMBIO') {
      if (!form.fechaOfrece || !form.fechaBusca) {
        return 'Debes completar ambas fechas para un intercambio';
      }
      if (form.fechaOfrece === form.fechaBusca &&
        form.horarioOfrece === form.horarioBusca &&
        form.grupoOfrece === form.grupoBusca) {
        return 'El turno que ofreces y el que buscas no pueden ser idénticos';
      }
    }

    if (form.tipo === 'ABIERTO') {
      if (!form.fechaDesde || !form.fechaHasta) {
        return 'Debes completar el rango de fechas';
      }
      if (new Date(form.fechaHasta) < new Date(form.fechaDesde)) {
        return 'La fecha "hasta" debe ser posterior a la fecha "desde"';
      }
    }

    if (!form.descripcion.trim()) {
      return 'Debes agregar una descripción';
    }

    return '';
  }, []);

  const validateSolicitudForm = useCallback((form: SolicitudDirectaForm): string => {
    if (!form.destinatarioId) {
      return 'Debes seleccionar un compañero';
    }

    if (!form.fechaSolicitante || !form.fechaDestinatario) {
      return 'Debes completar ambas fechas';
    }

    if (form.fechaSolicitante === form.fechaDestinatario &&
      form.horarioSolicitante === form.horarioDestinatario &&
      form.grupoSolicitante === form.grupoDestinatario) {
      return 'Los turnos no pueden ser idénticos';
    }

    if (!form.motivo.trim()) {
      return 'Debes explicar el motivo de tu solicitud';
    }

    return '';
  }, []);

  // Handlers para nueva oferta
  const handleNuevaOfertaSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const error = validateOfertaForm(nuevaOfertaForm);
    if (error) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const solicitudCompleta = {
        ...solicitudDirectaForm,
        solicitanteId: 'USR1' // 👈 Hardcodear aquí el ID del usuario
      };

      await agregarOferta(nuevaOfertaForm);
      closeModal();
      setNuevaOfertaForm(INITIAL_OFERTA_FORM);
      setFormError('');
    } catch (error) {
      setFormError('Error al publicar la oferta. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [nuevaOfertaForm, validateOfertaForm, agregarOferta, closeModal]);

  // Handlers para solicitud directa
  const handleSolicitudDirectaSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const error = validateSolicitudForm(solicitudDirectaForm);
    if (error) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);
    try {

      await agregarSolicitud(solicitudDirectaForm);
      closeModal();
      setSolicitudDirectaForm(INITIAL_SOLICITUD_FORM);
      setFormError('');
    } catch (error) {
      setFormError('Error al enviar la solicitud. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [solicitudDirectaForm, validateSolicitudForm, agregarSolicitud, closeModal]);

  // Handler para cerrar modal y limpiar errores
  const handleCloseModal = useCallback(() => {
    closeModal();
    setFormError('');
    setIsSubmitting(false);
  }, [closeModal]);

  // Handlers para acciones de ofertas y solicitudes
  const handleAceptarOferta = useCallback(async (ofertaId: string) => {
    try {
      await actualizarEstadoOferta(ofertaId, 'COMPLETADO');
    } catch (error) {
      console.error('Error al aceptar oferta:', error);
      alert('Error al aceptar la oferta');
    }
  }, [actualizarEstadoOferta]);

  const handleCancelarOferta = useCallback(async (ofertaId: string) => {
    try {
      await eliminarOferta(ofertaId);
    } catch (error) {
      console.error('Error al cancelar oferta:', error);
      alert('Error al cancelar la oferta');
    }
  }, [eliminarOferta]);

  const handleAceptarSolicitud = async (id: string) => {
    try {
      await actualizarEstado(id, 'APROBADO');
    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
      setFormError('Error al aceptar la solicitud');
    }
  };

  const handleRechazarSolicitud = async (id: string) => {
    try {
      await actualizarEstado(id, 'CANCELADO');
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      setFormError('Error al rechazar la solicitud');
    }
  };
  const handleEliminarSolicitud = async (id: string) => {
    if (!confirm('¿Eliminar esta solicitud de la base de datos?')) return;

    try {
      const res = await fetch(`/api/solicitudes-directas/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        console.log('✅ Solicitud eliminada');
        // Forzar recarga
        window.location.reload();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatearFecha = (fecha: string | null | undefined) => {
    if (!fecha) return 'Fecha no disponible';

    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';

      return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return 'Error en fecha';
    }
  };


  // Loading y error states
  const isLoading = isLoadingOfertas || isLoadingSolicitudes;
  const error = errorOfertas || errorSolicitudes;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Ofertas de Turnos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona tus intercambios y solicitudes de cambio de turno
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900 dark:text-red-100">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Ofertas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Intercambios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.intercambios}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Abiertos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.abiertos}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Urgentes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.urgentes}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <Flame className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Nueva oferta */}
        <button
          onClick={() => openModal('nueva-oferta')}
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group text-left"
          aria-label="Publicar nueva oferta"
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[280px]">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Plus className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
              Nueva oferta
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
              Publica o busca ofertas de cambio de turnos con tus compañeros
            </p>
          </div>
        </button>

        {/* Card 2: Solicitud directa */}
        <button
          onClick={() => openModal('solicitud-directa')}
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group text-left"
          aria-label="Enviar solicitud directa de cambio"
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
        </button>
      </div>

      {/* Sección Inferior - Estado de solicitudes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
        {/* Header con tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-6" role="tablist">
              <button
                onClick={() => setSolicitudesTab('estado')}
                role="tab"
                aria-selected={solicitudesTab === 'estado'}
                className={`font-semibold text-base pb-1 transition-colors ${solicitudesTab === 'estado'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-b-2 hover:border-gray-900 dark:hover:border-gray-100'
                  }`}
              >
                Estado de solicitudes
              </button>
              <button
                onClick={() => setSolicitudesTab('historico')}
                role="tab"
                aria-selected={solicitudesTab === 'historico'}
                className={`font-semibold text-base pb-1 transition-colors ${solicitudesTab === 'historico'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-b-2 hover:border-gray-900 dark:hover:border-gray-100'
                  }`}
              >
                Histórico
              </button>
            </div>
          </div>
        </div>



        {/* Content Area - Estado de solicitudes */}
        {solicitudesTab === 'estado' && (
          <div className="p-6" role="tabpanel">
            <div className="space-y-3">
              {ofertas.length === 0 && solicitudes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No hay solicitudes registradas.
                </p>
              ) : (
                <>
                  {/* Ofertas disponibles */}
                  {ofertas
                    .filter(o => o.estado === 'DISPONIBLE')
                    .map((oferta) => {
                      const fechaFormateada = new Date(oferta.publicado).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });

                      return (
                        <div
                          key={oferta.id}
                          className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${oferta.prioridad === "URGENTE" ? "bg-red-500" : "bg-blue-500"
                                  }`}
                                title={oferta.prioridad === "URGENTE" ? "Urgente" : "Normal"}
                              ></div>

                              <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                {oferta.tipo === "INTERCAMBIO"
                                  ? `Intercambio de turno (${oferta.estado})`
                                  : `Oferta abierta (${oferta.estado})`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {fechaFormateada}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-2">
                              {/* <button
                                onClick={() => handleAceptarOferta(oferta.id)}
                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                              >
                                Aceptar
                              </button> */}
                              <button
                                onClick={() => handleCancelarOferta(oferta.id)}
                                className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* Solicitudes directas disponibles */}
                  {/* Solicitudes directas */}
                  {solicitudes
                    .filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado))  // 👈 Filtro correcto
                    .map((solicitud) => {
                      console.log('🔍 Solicitud completa:', solicitud);
                      const fechaFormateada = solicitud.fechaSolicitud
                        ? formatearFecha(solicitud.fechaSolicitud)
                        : formatearFecha(new Date().toISOString());  // 👈 Fecha actual como fallback

                      return (
                        <div
                          key={solicitud.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${solicitud.prioridad === "URGENTE" ? "bg-red-500" : "bg-blue-500"
                                  }`}
                                title={solicitud.prioridad === "URGENTE" ? "Urgente" : "Normal"}
                              ></div>

                              <div>
                                <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                  {solicitud.solicitante.nombre} {solicitud.solicitante.apellido}
                                  <span className="text-gray-500 dark:text-gray-400 mx-2">→</span>
                                  {solicitud.destinatario.nombre} {solicitud.destinatario.apellido}
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {fechaFormateada}
                                </p>
                              </div>
                            </div>

                            {/* Badge de estado */}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${solicitud.estado === 'SOLICITADO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              solicitud.estado === 'APROBADO' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                solicitud.estado === 'COMPLETADO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                              {solicitud.estado}
                            </span>
                          </div>

                          {/* Turnos */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            {/* Turno ofrecido */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-200 dark:border-blue-800">
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                Ofrece:
                              </p>
                              <p className="text-xs text-gray-900 dark:text-gray-100">
                                📅 {new Date(solicitud.turnoSolicitante.fecha).toLocaleDateString('es-AR')}
                              </p>
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                🕐 {solicitud.turnoSolicitante.horario} - Grupo {solicitud.turnoSolicitante.grupoTurno}
                              </p>
                            </div>

                            {/* Turno solicitado */}
                            <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800">
                              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                                Solicita:
                              </p>
                              <p className="text-xs text-gray-900 dark:text-gray-100">
                                📅 {new Date(solicitud.turnoDestinatario.fecha).toLocaleDateString('es-AR')}
                              </p>
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                🕐 {solicitud.turnoDestinatario.horario} - Grupo {solicitud.turnoDestinatario.grupoTurno}
                              </p>
                            </div>
                          </div>

                          {/* Motivo */}
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
                            "{solicitud.motivo}"
                          </p>

                          {/* Botones (solo si está SOLICITADO) */}
                          {solicitud.estado === 'SOLICITADO' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAceptarSolicitud(solicitud.id)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                              >
                                ✓ Aceptar
                              </button>
                              <button
                                onClick={() => handleRechazarSolicitud(solicitud.id)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                              >
                                ✗ Rechazar
                              </button>
                              <button
                                onClick={() => handleEliminarSolicitud(solicitud.id)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        )}

        {/* Content Area - Histórico */}
        {solicitudesTab === 'historico' && (
          <div className="p-6" role="tabpanel">
            {(() => {
              // Combinar ofertas completadas/canceladas
              const ofertasHistorico = ofertas.filter(
                o => o.estado === 'COMPLETADO' || o.estado === 'CANCELADO'
              );

              // Combinar solicitudes directas completadas/canceladas
              const solicitudesHistorico = solicitudes.filter(
                s => s.estado === 'COMPLETADO' || s.estado === 'CANCELADO'
              );

              const totalHistorico = ofertasHistorico.length + solicitudesHistorico.length;

              if (totalHistorico === 0) {
                return (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Sin Historial
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Aún no tienes cambios de turno completados o cancelados
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-w-4xl mx-auto">
                  <div className="mb-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Historial de Cambios
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {totalHistorico} {totalHistorico === 1 ? 'cambio realizado' : 'cambios realizados'}
                    </p>
                  </div>

                  {/* Ofertas completadas/canceladas */}
                  {ofertasHistorico
                    .sort((a, b) => new Date(b.publicado).getTime() - new Date(a.publicado).getTime())
                    .map((oferta) => (
                      <div
                        key={oferta.id}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${oferta.estado === 'COMPLETADO' ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                              title={oferta.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado'}
                            ></div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                              {oferta.tipo === 'INTERCAMBIO' ? 'Intercambio' : 'Oferta abierta'}
                              {' con '}
                              {oferta.ofertante.nombre} {oferta.ofertante.apellido}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${oferta.estado === 'COMPLETADO'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}
                            >
                              {oferta.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                            {oferta.tipo === 'INTERCAMBIO' && oferta.turnoOfrece && oferta.turnoBusca ? (
                              <>
                                Turno del {formatDate(oferta.turnoOfrece.fecha)} ({oferta.turnoOfrece.horario})
                                {' '}por turno del {formatDate(oferta.turnoBusca.fecha)} ({oferta.turnoBusca.horario})
                              </>
                            ) : oferta.rangoFechas ? (
                              <>
                                Disponible desde {formatDate(oferta.rangoFechas.desde)}
                                {' '}hasta {formatDate(oferta.rangoFechas.hasta)}
                              </>
                            ) : (
                              'Información no disponible'
                            )}
                          </p>
                        </div>
                        <time
                          className="text-xs text-gray-500 dark:text-gray-400 md:ml-5"
                          dateTime={oferta.publicado}
                        >
                          {formatTimeAgo(oferta.publicado)}
                        </time>
                      </div>
                    ))}

                  {/* Solicitudes directas completadas/canceladas */}
                  {solicitudesHistorico
                    .sort((a, b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime())
                    .map((solicitud) => (
                      <div
                        key={solicitud.id}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${solicitud.estado === 'COMPLETADO' ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                              title={solicitud.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado'}
                            ></div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                              Solicitud directa con {solicitud.destinatario.nombre} {solicitud.destinatario.apellido}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${solicitud.estado === 'COMPLETADO'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}
                            >
                              {solicitud.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                            Tu turno: {formatDate(solicitud.turnoSolicitante.fecha)} ({solicitud.turnoSolicitante.horario})
                            {' - '}
                            Turno recibido: {formatDate(solicitud.turnoDestinatario.fecha)} ({solicitud.turnoDestinatario.horario})
                          </p>
                        </div>
                        <time
                          className="text-xs text-gray-500 dark:text-gray-400 md:ml-5"
                          dateTime={solicitud.fechaSolicitud}
                        >
                          {formatTimeAgo(solicitud.fechaSolicitud)}
                        </time>
                      </div>
                    ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Modal Nueva Oferta */}
      {isModalOpen && modalType === 'nueva-oferta' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-nueva-oferta-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-400 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 id="modal-nueva-oferta-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Nueva Oferta de Cambio
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleNuevaOfertaSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
                </div>
              )}

              {/* Tipo de Oferta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Oferta
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNuevaOfertaForm(prev => ({ ...prev, tipo: 'INTERCAMBIO' }))}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${nuevaOfertaForm.tipo === 'INTERCAMBIO'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={nuevaOfertaForm.tipo === 'INTERCAMBIO'}
                  >
                    <RefreshCw className="h-5 w-5 inline mr-2" />
                    Intercambio
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaOfertaForm(prev => ({ ...prev, tipo: 'ABIERTO' }))}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${nuevaOfertaForm.tipo === 'ABIERTO'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={nuevaOfertaForm.tipo === 'ABIERTO'}
                  >
                    <Gift className="h-5 w-5 inline mr-2" />
                    Abierto
                  </button>
                </div>
              </div>

              {/* Formulario para Intercambio */}
              {nuevaOfertaForm.tipo === 'INTERCAMBIO' && (
                <>
                  {/* Turno que ofrece */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Turno que Ofreces
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="fecha-ofrece" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fecha
                        </label>
                        <input
                          id="fecha-ofrece"
                          type="date"
                          required
                          value={nuevaOfertaForm.fechaOfrece}
                          onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, fechaOfrece: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="horario-ofrece" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Horario
                        </label>
                        <select
                          id="horario-ofrece"
                          value={nuevaOfertaForm.horarioOfrece}
                          onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, horarioOfrece: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="grupo-ofrece" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Grupo
                        </label>
                        <select
                          id="grupo-ofrece"
                          value={nuevaOfertaForm.grupoOfrece}
                          onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, grupoOfrece: e.target.value as GrupoTurno }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {GRUPOS.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Turno que busca */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Turno que Buscas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="fecha-busca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fecha
                        </label>
                        <input
                          id="fecha-busca"
                          type="date"
                          required
                          value={nuevaOfertaForm.fechaBusca}
                          onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, fechaBusca: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="horario-busca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Horario
                        </label>
                        <select
                          id="horario-busca"
                          value={nuevaOfertaForm.horarioBusca}
                          onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, horarioBusca: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="grupo-busca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Grupo
                        </label>
                        <select
                          id="grupo-busca"
                          value={nuevaOfertaForm.grupoBusca}
                          onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, grupoBusca: e.target.value as GrupoTurno }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {GRUPOS.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Formulario para Abierto */}
              {nuevaOfertaForm.tipo === 'ABIERTO' && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Rango de Fechas Disponibles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fecha-desde" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Desde
                      </label>
                      <input
                        id="fecha-desde"
                        type="date"
                        required
                        value={nuevaOfertaForm.fechaDesde}
                        onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, fechaDesde: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="fecha-hasta" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hasta
                      </label>
                      <input
                        id="fecha-hasta"
                        type="date"
                        required
                        value={nuevaOfertaForm.fechaHasta}
                        onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, fechaHasta: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  rows={3}
                  required
                  value={nuevaOfertaForm.descripcion}
                  onChange={(e) => setNuevaOfertaForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe los detalles de tu oferta..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prioridad
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNuevaOfertaForm(prev => ({ ...prev, prioridad: 'NORMAL' }))}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${nuevaOfertaForm.prioridad === 'NORMAL'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={nuevaOfertaForm.prioridad === 'NORMAL'}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaOfertaForm(prev => ({ ...prev, prioridad: 'URGENTE' }))}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${nuevaOfertaForm.prioridad === 'URGENTE'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={nuevaOfertaForm.prioridad === 'URGENTE'}
                  >
                    <Flame className="h-4 w-4 inline mr-1" />
                    Urgente
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Publicando...
                    </>
                  ) : (
                    'Publicar Oferta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Solicitud Directa */}
      {isModalOpen && modalType === 'solicitud-directa' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-solicitud-directa-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-400 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 id="modal-solicitud-directa-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Solicitud Directa de Cambio
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSolicitudDirectaSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
                </div>
              )}

              {/* Seleccionar Compañero */}
              <div>
                <label htmlFor="destinatario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Compañero
                </label>
                <select
                  id="destinatario"
                  required
                  value={solicitudDirectaForm.destinatarioId}
                  onChange={(e) => setSolicitudDirectaForm(prev => ({
                    ...prev,
                    destinatarioId: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Selecciona un compañero...</option>
                  {usuarios?.map((usuario: any) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} {usuario.apellido} - {usuario.rol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tu turno */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Tu Turno (que ofreces)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="fecha-solicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha
                    </label>
                    <input
                      id="fecha-solicitante"
                      type="date"
                      required
                      value={solicitudDirectaForm.fechaSolicitante}
                      onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, fechaSolicitante: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="horario-solicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Horario
                    </label>
                    <select
                      id="horario-solicitante"
                      value={solicitudDirectaForm.horarioSolicitante}
                      onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, horarioSolicitante: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="grupo-solicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grupo
                    </label>
                    <select
                      id="grupo-solicitante"
                      value={solicitudDirectaForm.grupoSolicitante}
                      onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, grupoSolicitante: e.target.value as GrupoTurno }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {GRUPOS.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Turno del compañero */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-green-600" />
                  Turno del Compañero (que solicitas)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="fecha-destinatario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha
                    </label>
                    <input
                      id="fecha-destinatario"
                      type="date"
                      required
                      value={solicitudDirectaForm.fechaDestinatario}
                      onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, fechaDestinatario: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="horario-destinatario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Horario
                    </label>
                    <select
                      id="horario-destinatario"
                      value={solicitudDirectaForm.horarioDestinatario}
                      onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, horarioDestinatario: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="grupo-destinatario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grupo
                    </label>
                    <select
                      id="grupo-destinatario"
                      value={solicitudDirectaForm.grupoDestinatario}
                      onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, grupoDestinatario: e.target.value as GrupoTurno }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {GRUPOS.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label htmlFor="motivo-solicitud" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo de la Solicitud
                </label>
                <textarea
                  id="motivo-solicitud"
                  rows={3}
                  required
                  value={solicitudDirectaForm.motivo}
                  onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Explica por qué necesitas este cambio..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prioridad
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSolicitudDirectaForm(prev => ({ ...prev, prioridad: 'NORMAL' }))}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${solicitudDirectaForm.prioridad === 'NORMAL'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={solicitudDirectaForm.prioridad === 'NORMAL'}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolicitudDirectaForm(prev => ({ ...prev, prioridad: 'URGENTE' }))}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${solicitudDirectaForm.prioridad === 'URGENTE'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={solicitudDirectaForm.prioridad === 'URGENTE'}
                  >
                    <Flame className="h-4 w-4 inline mr-1" />
                    Urgente
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando...
                    </>
                  ) : (
                    'Enviar Solicitud'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
