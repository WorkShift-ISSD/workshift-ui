'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import Can from '../components/Can';
import { calcularGrupoTrabaja, esFechaValidaParaGrupo } from '../lib/turnosUtils';

// Constantes
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
  solicitanteId: '',
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
  // Auth y permisos
  const { user } = useAuth();
  const { can } = usePermissions();

  // Hooks personalizados
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
    solicitudes: solicitudesDirectas,
    agregarSolicitud,
    actualizarEstado,
    isLoading: isLoadingSolicitudes,
    error: errorSolicitudes
  } = useSolicitudesDirectas();

  const { modalType, isModalOpen, openModal, closeModal } = useModal();
  const { activeTab: solicitudesTab, setActiveTab: setSolicitudesTab } = useTabs<SolicitudesTabType>('estado');
  const { formatTimeAgo, formatDate } = useFormatters();

  // Estados locales
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [nuevaOfertaForm, setNuevaOfertaForm] = useState<NuevaOfertaForm>(INITIAL_OFERTA_FORM);
  const [solicitudDirectaForm, setSolicitudDirectaForm] = useState<SolicitudDirectaForm>(INITIAL_SOLICITUD_FORM);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar usuarios una sola vez
  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsuarios(data);
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      } finally {
        setLoadingUsuarios(false);
      }
    };

    fetchUsuarios();
  }, []);

  // Filtrar usuarios (excluir al usuario actual y mismo rol)
  const usuariosFiltrados = useMemo(() => {
    if (!user) return [];
    return usuarios.filter(
      (u) => u.rol === user.rol && u.id !== user.id
    );
  }, [usuarios, user]);

  // Obtener compañero seleccionado
  const companeroSeleccionado = useMemo(() => {
    if (!solicitudDirectaForm.destinatarioId) return null;
    return usuarios.find(u => u.id === solicitudDirectaForm.destinatarioId);
  }, [solicitudDirectaForm.destinatarioId, usuarios]);

  // Auto-completar horario y grupo del destinatario
  useEffect(() => {
    if (companeroSeleccionado) {
      setSolicitudDirectaForm(prev => ({
        ...prev,
        horarioDestinatario: companeroSeleccionado.horario || '04:00-14:00',
        grupoDestinatario: companeroSeleccionado.grupoTurno || 'A'
      }));
    }
  }, [companeroSeleccionado]);

  // Filtrar ofertas
  const misOfertas = useMemo(() => {
    return ofertas.filter(
      o => o.ofertante?.id === user?.id && o.estado === 'DISPONIBLE'
    );
  }, [ofertas, user?.id]);

  const ofertasDisponibles = useMemo(() => {
    return ofertas.filter(
      o => o.ofertante?.id !== user?.id && o.estado === 'DISPONIBLE'
    );
  }, [ofertas, user?.id]);

  // Filtrar solicitudes directas
  const solicitudesEnviadas = useMemo(() => {
    return solicitudesDirectas.filter(
      s => s.solicitante.id === user?.id
    );
  }, [solicitudesDirectas, user?.id]);

  const solicitudesRecibidas = useMemo(() => {
    return solicitudesDirectas.filter(
      s => s.destinatario.id === user?.id && s.estado === 'SOLICITADO'
    );
  }, [solicitudesDirectas, user?.id]);

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
      await agregarOferta(nuevaOfertaForm);
      closeModal();
      setNuevaOfertaForm(INITIAL_OFERTA_FORM);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al publicar la oferta. Intenta nuevamente.');
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
      setFormError(error instanceof Error ? error.message : 'Error al enviar la solicitud. Intenta nuevamente.');
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

  // Handlers para acciones de ofertas
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

  const handleTomarOferta = useCallback(async (ofertaId: string) => {
    try {
      if (!confirm('¿Estás seguro de que quieres tomar esta oferta?')) {
        return;
      }

      const res = await fetch(`/api/ofertas/${ofertaId}/tomar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tomadorId: user?.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al tomar la oferta');
      }

      alert('¡Oferta tomada exitosamente! Pendiente de autorización.');
    } catch (error) {
      console.error('Error al tomar oferta:', error);
      alert('Error al tomar la oferta. Intenta nuevamente.');
    }
  }, [user?.id]);

  // Handlers para solicitudes
  const handleAceptarSolicitud = useCallback(async (id: string) => {
    try {
      await actualizarEstado(id, 'APROBADO');
    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
      setFormError('Error al aceptar la solicitud');
    }
  }, [actualizarEstado]);

  const handleRechazarSolicitud = useCallback(async (id: string) => {
    try {
      await actualizarEstado(id, 'CANCELADO');
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      setFormError('Error al rechazar la solicitud');
    }
  }, [actualizarEstado]);

  const handleEliminarSolicitud = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta solicitud de la base de datos?')) return;

    try {
      const res = await fetch(`/api/solicitudes-directas/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        console.log('✅ Solicitud eliminada');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  // Utilidades
  const formatearFecha = useCallback((fecha: string | null | undefined) => {
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
  }, []);

  const validarFechaGrupo = useCallback((fecha: string): boolean => {
    if (!fecha || !user) return false;
    const fechaObj = new Date(fecha + 'T00:00:00');
    return esFechaValidaParaGrupo(fechaObj, user.grupoTurno);
  }, [user]);

  const getFechasDeshabilitadas = useCallback((fechaInicio: string, fechaFin: string) => {
    if (!user) return '';

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    const fechasInvalidas: string[] = [];

    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      if (!esFechaValidaParaGrupo(d, user.grupoTurno)) {
        fechasInvalidas.push(d.toISOString().split('T')[0]);
      }
    }

    return fechasInvalidas;
  }, [user]);

  // Componente helper
  const GrupoDelDia = ({ fecha }: { fecha: string }) => {
    if (!fecha) return null;

    const fechaObj = new Date(fecha + 'T00:00:00');
    const grupo = calcularGrupoTrabaja(fechaObj);
    const esValido = user && grupo === user.grupoTurno;

    return (
      <span className={`text-xs ml-2 px-2 py-1 rounded ${
        esValido
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        Grupo {grupo} {esValido ? '✓' : '✗'}
      </span>
    );
  };

  // Loading y error states
  const isLoading = isLoadingOfertas || isLoadingSolicitudes;
  const error = errorOfertas || errorSolicitudes;

  // ... resto del componente (render)

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
        {/* Nueva oferta */}
        <Can do="ofertar_turno">
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
        </Can>

        {/* Solicitud directa */}
        <Can do="enviar_solicitud_directa">
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
        </Can>
      </div>

      {/* Mis Ofertas y Solicitudes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
        {/* Header con tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-6" role="tablist">
            <button
              onClick={() => setSolicitudesTab('estado')}
              role="tab"
              aria-selected={solicitudesTab === 'estado'}
              className={`font-semibold text-base pb-1 transition-colors ${solicitudesTab === 'estado'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
              Mis Solicitudes Activas
            </button>
            <button
              onClick={() => setSolicitudesTab('historico')}
              role="tab"
              aria-selected={solicitudesTab === 'historico'}
              className={`font-semibold text-base pb-1 transition-colors ${solicitudesTab === 'historico'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Tab: Estado */}
        {solicitudesTab === 'estado' && (
          <div className="p-6" role="tabpanel">
            <div className="space-y-6">
              {/* {misOfertas.length === 0 && solicitudesEnviadas.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No tienes solicitudes u ofertas activas.
                </p>
              ) : ( */}
              <>
                {/* MIS OFERTAS */}
                {misOfertas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Mis Ofertas Publicadas
                    </h3>
                    <div className="space-y-3">
                      {misOfertas.map((oferta) => {
                        const fechaFormateada = new Date(oferta.publicado).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });

                        return (
                          <div
                            key={oferta.id}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 rounded-lg transition-colors gap-2"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${oferta.prioridad === "URGENTE" ? "bg-red-500" : "bg-blue-500"
                                    }`}
                                ></div>
                                <div>
                                  <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                    {oferta.tipo === "INTERCAMBIO" ? "Intercambio de turno" : "Oferta abierta"}
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    📅 {oferta.turnoOfrece?.fecha} • {oferta.turnoOfrece?.horario}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {fechaFormateada}
                              </div>
                              <button
                                onClick={() => handleCancelarOferta(oferta.id)}
                                className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MIS SOLICITUDES DIRECTAS */}
                {solicitudesEnviadas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Solicitudes Directas Enviadas
                    </h3>
                    <div className="space-y-3">
                      {solicitudesEnviadas
                        .filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado))
                        .map((solicitud) => (
                          <div
                            key={solicitud.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${solicitud.prioridad === "URGENTE" ? "bg-red-500" : "bg-blue-500"}`}></div>
                                <div>
                                  <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                    Enviada a: {solicitud.destinatario.nombre} {solicitud.destinatario.apellido}
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatearFecha(solicitud.fechaSolicitud)}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${solicitud.estado === 'SOLICITADO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                }`}>
                                {solicitud.estado}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-200 dark:border-blue-800">
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Ofrezco:</p>
                                <p className="text-xs text-gray-900 dark:text-gray-100">
                                  📅 {new Date(solicitud.turnoSolicitante.fecha).toLocaleDateString('es-AR')}
                                </p>
                                <p className="text-xs text-gray-700 dark:text-gray-300">
                                  🕐 {solicitud.turnoSolicitante.horario} - Grupo {solicitud.turnoSolicitante.grupoTurno}
                                </p>
                              </div>

                              <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800">
                                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Por su turno:</p>
                                <p className="text-xs text-gray-900 dark:text-gray-100">
                                  📅 {new Date(solicitud.turnoDestinatario.fecha).toLocaleDateString('es-AR')}
                                </p>
                                <p className="text-xs text-gray-700 dark:text-gray-300">
                                  🕐 {solicitud.turnoDestinatario.horario} - Grupo {solicitud.turnoDestinatario.grupoTurno}
                                </p>
                              </div>
                            </div>

                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
                              Motivo: "{solicitud.motivo}"
                            </p>

                            {solicitud.estado === 'SOLICITADO' && (
                              <button
                                onClick={() => handleRechazarSolicitud(solicitud.id)}
                                className="w-full px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                              >
                                ✗ Cancelar solicitud
                              </button>
                            )}

                            {solicitud.estado === 'APROBADO' && (
                              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                                <p className="text-xs text-green-700 dark:text-green-300">
                                  ✓ Solicitud aceptada. Pendiente de autorización del jefe.
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>

            </div>
          </div>
        )}

        {/* Content Area - Histórico */}
        {solicitudesTab === 'historico' && (
          <div className="p-6" role="tabpanel">
            {(() => {
              // Combinar ofertas completadas/canceladas
              const ofertasHistorico = ofertas.filter(
                o => (o.ofertante?.id === user?.id || o.tomador?.id === user?.id) &&
                  (o.estado === 'COMPLETADO' || o.estado === 'CANCELADO')
              );

              // Combinar solicitudes directas completadas/canceladas
              const solicitudesHistorico = solicitudesDirectas.filter(
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
                          {oferta.publicado ? formatTimeAgo(oferta.publicado) : 'Fecha no disponible'}
                        </time>
                      </div>
                    ))}

                  {/* Solicitudes directas completadas/canceladas */}
                  {solicitudesHistorico
                    .sort((a, b) => (b.fechaSolicitud ? new Date(b.fechaSolicitud).getTime() : 0) - (a.fechaSolicitud ? new Date(a.fechaSolicitud).getTime() : 0))
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
                            Tu turno: {solicitud.turnoSolicitante ? (
                              <>
                                {formatDate(solicitud.turnoSolicitante.fecha)} ({solicitud.turnoSolicitante.horario})
                              </>
                            ) : (
                              'Información no disponible'
                            )}
                            {' - '}
                            Turno recibido: {solicitud.turnoDestinatario ? (
                              <>
                                {formatDate(solicitud.turnoDestinatario.fecha)} ({solicitud.turnoDestinatario.horario})
                              </>
                            ) : (
                              'Información no disponible'
                            )}
                          </p>
                        </div>
                        <time
                          className="text-xs text-gray-500 dark:text-gray-400 md:ml-5"
                          dateTime={solicitud.fechaSolicitud}
                        >
                          {solicitud.fechaSolicitud ? formatTimeAgo(solicitud.fechaSolicitud) : 'Fecha no disponible'}
                        </time>
                      </div>
                    ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* SOLICITUDES RECIBIDAS */}
      <Can do="recibir_solicitud_directa">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Solicitudes Recibidas
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Cambios que otros compañeros te han solicitado
            </p>
          </div>

          <div className="p-6">
            {solicitudesRecibidas.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No tienes solicitudes pendientes
              </p>
            ) : (
              <div className="space-y-4">
                {solicitudesRecibidas.map(solicitud => (
                  <div key={solicitud.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {solicitud.solicitante.nombre} {solicitud.solicitante.apellido}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatearFecha(solicitud.fechaSolicitud)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${solicitud.prioridad === 'URGENTE'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                        {solicitud.prioridad}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Te ofrece:</p>
                        <p className="text-xs text-gray-900 dark:text-gray-100">
                          📅 {new Date(solicitud.turnoSolicitante.fecha).toLocaleDateString('es-AR')}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          🕐 {solicitud.turnoSolicitante.horario} - Grupo {solicitud.turnoSolicitante.grupoTurno}
                        </p>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Por tu turno:</p>
                        <p className="text-xs text-gray-900 dark:text-gray-100">
                          📅 {new Date(solicitud.turnoDestinatario.fecha).toLocaleDateString('es-AR')}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          🕐 {solicitud.turnoDestinatario.horario} - Grupo {solicitud.turnoDestinatario.grupoTurno}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
                      Motivo: "{solicitud.motivo}"
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAceptarSolicitud(solicitud.id)}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        ✓ Aceptar
                      </button>
                      <button
                        onClick={() => handleRechazarSolicitud(solicitud.id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        ✗ Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Can>
      {/* MIS OFERTAS PUBLICADAS */}

      {/* MIS OFERTAS PUBLICADAS */}
      <Can do="ofertar_turno">
        {misOfertas.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Mis Ofertas Publicadas
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {misOfertas.length} {misOfertas.length === 1 ? 'oferta activa' : 'ofertas activas'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {misOfertas.map(oferta => (
                <div key={oferta.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {oferta.tipo === "INTERCAMBIO" ? "Intercambio de turno" : "Oferta abierta"}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Publicado: {formatearFecha(oferta.publicado)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${oferta.prioridad === 'URGENTE'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                      {oferta.prioridad}
                    </span>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-200 dark:border-blue-800 mb-3">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                      Turno ofrecido:
                    </p>
                    <p className="text-xs text-gray-900 dark:text-gray-100">
                      📅 {oferta.turnoOfrecido?.fecha} • {oferta.turnoOfrecido?.horario}
                      {oferta.turnoOfrecido?.grupoTurno && ` • Grupo ${oferta.turnoOfrecido.grupoTurno}`}
                    </p>
                  </div>

                  {oferta.tipo === 'INTERCAMBIO' && oferta.turnoSolicitado && (
                    <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800 mb-3">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                        A cambio de:
                      </p>
                      <p className="text-xs text-gray-900 dark:text-gray-100">
                        📅 {oferta.turnoSolicitado.fecha} • {oferta.turnoSolicitado.horario}
                      </p>
                    </div>
                  )}

                  {oferta.motivo && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
                      Motivo: "{oferta.motivo}"
                    </p>
                  )}

                  {/* ✅ Solo botón CANCELAR para mis propias ofertas */}
                  {oferta.ofertante?.id === user?.id && (
                    <button
                      onClick={() => handleCancelarOferta(oferta.id)}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ✗ Cancelar Oferta
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Can>


      {/* OFERTAS DISPONIBLES DE OTROS USUARIOS */}
      <Can do="pedir_turno">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Ofertas Disponibles
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {ofertasDisponibles.filter(o => o.ofertante?.id !== user?.id).length} {ofertasDisponibles.filter(o => o.ofertante?.id !== user?.id).length === 1 ? 'oferta disponible' : 'ofertas disponibles'}
                </p>
              </div>
              <Gift className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="p-6">
            {ofertasDisponibles.filter(o => o.ofertante?.id !== user?.id).length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No hay ofertas disponibles
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cuando alguien publique una oferta, aparecerá aquí
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {ofertasDisponibles
                  .filter(oferta => oferta.ofertante?.id !== user?.id) // ✅ solo las de otros
                  .map(oferta => (
                    <div key={oferta.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {oferta.ofertante?.nombre} {oferta.ofertante?.apellido}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Publicado: {formatearFecha(oferta.publicado)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${oferta.prioridad === 'URGENTE'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                          {oferta.prioridad}
                        </span>
                      </div>

                      {/* Detalles del turno */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-4 border border-blue-200 dark:border-blue-800 mb-3">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                          Turno disponible:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                              {oferta.turnoOfrecido?.fecha}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Horario:</span>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                              {oferta.turnoOfrecido?.horario}
                            </p>
                          </div>
                          {oferta.turnoOfrecido?.grupoTurno && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Grupo:</span>
                              <p className="text-gray-900 dark:text-gray-100 font-medium">
                                {oferta.turnoOfrecido.grupoTurno}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                              {oferta.tipo === 'INTERCAMBIO' ? 'Intercambio' : 'Oferta abierta'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Si es intercambio, mostrar el turno solicitado */}
                      {oferta.tipo === 'INTERCAMBIO' && oferta.turnoSolicitado && (
                        <div className="bg-green-50 dark:bg-green-900/10 rounded p-4 border border-green-200 dark:border-green-800 mb-3">
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                            A cambio de:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                              <p className="text-gray-900 dark:text-gray-100 font-medium">
                                {oferta.turnoSolicitado.fecha}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Horario:</span>
                              <p className="text-gray-900 dark:text-gray-100 font-medium">
                                {oferta.turnoSolicitado.horario}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {oferta.motivo && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
                          Motivo: "{oferta.motivo}"
                        </p>
                      )}

                      {/* ✅ Botones TOMAR e IGNORAR solo para ofertas de otros */}
                      {oferta.ofertante?.id !== user?.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTomarOferta(oferta.id)}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            ✓ Tomar Oferta
                          </button>
                          <button
                            onClick={() => handleCancelarOferta(oferta.id)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </Can>



      {/* Modales - Nueva Oferta y Solicitud Directa sin cambios */}
      {/* ... mantén los modales tal como están ... */}
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
                          Fecha que ofreces
                          {nuevaOfertaForm.fechaOfrece && (
                            <span className={`text-xs ml-2 px-2 py-1 rounded ${nuevaOfertaForm.fechaOfrece && user &&
                              esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno)
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              Grupo {calcularGrupoTrabaja(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'))}
                              {user && esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno) ? ' ✓' : ' ✗'}
                            </span>
                          )}
                        </label>
                        <input
                          id="fecha-ofrece"
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={nuevaOfertaForm.fechaOfrece}
                          onChange={(e) => {
                            const fecha = e.target.value;
                            setNuevaOfertaForm(prev => ({ ...prev, fechaOfrece: fecha }));

                            // Validar que la fecha ofrecida sea del grupo del usuario
                            if (fecha && user) {
                              const fechaObj = new Date(fecha + 'T00:00:00');

                              if (!esFechaValidaParaGrupo(fechaObj, user.grupoTurno)) {
                                setFormError(`La fecha seleccionada no corresponde al Grupo ${user.grupoTurno}. Solo puedes ofrecer turnos de tu grupo.`);
                              } else {
                                // Limpiar error solo si no hay otros errores
                                if (formError.includes('no corresponde al Grupo')) {
                                  setFormError('');
                                }
                              }
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${nuevaOfertaForm.fechaOfrece && user &&
                            !esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno)
                            ? 'border-red-500 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                            }`}
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
                      {/* <div>
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
                      </div> */}
                    </div>
                                            {nuevaOfertaForm.fechaOfrece && user &&
                          !esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno) && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Esta fecha corresponde al Grupo {calcularGrupoTrabaja(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'))}, pero tú eres del Grupo {user.grupoTurno}. Solo puedes ofrecer tus propios turnos.
                            </p>
                          )}
                        {nuevaOfertaForm.fechaOfrece && user &&
                          esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno) && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Fecha válida (tu turno del Grupo {user.grupoTurno})
                            </p>
                          )}
                  </div>

                  {/* Turno que busca */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Turno que Buscas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 display: inline-flex">
                      <div>
                        <label htmlFor="fecha-busca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fecha
                        </label>
                        <input
                          id="fecha-busca"
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
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
                      {/* <div>
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
                      </div> */}
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
                  disabled={loadingUsuarios}
                  value={solicitudDirectaForm.destinatarioId}
                  onChange={(e) => setSolicitudDirectaForm(prev => ({
                    ...prev,
                    destinatarioId: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingUsuarios ? 'Cargando usuarios...' : 'Selecciona un compañero...'}
                  </option>
                  {usuariosFiltrados?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} ({u.rol}) - Grupo {u.grupoTurno}
                    </option>
                  ))}
                </select>

                {/* Info del compañero seleccionado */}
                {companeroSeleccionado && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Horario:</strong> {companeroSeleccionado.horario} |
                      <strong> Grupo:</strong> {companeroSeleccionado.grupoTurno}
                    </p>
                  </div>
                )}
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
                      min={new Date().toISOString().split('T')[0]}
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
                      min={new Date().toISOString().split('T')[0]}
                      value={solicitudDirectaForm.fechaDestinatario}
                      onChange={(e) => setSolicitudDirectaForm(prev => ({ ...prev, fechaDestinatario: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="horario-destinatario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Horario
                    </label>
                    <input
                      id="horario-destinatario"
                      type="text"
                      disabled
                      value={solicitudDirectaForm.horarioDestinatario || 'Selecciona un compañero'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      placeholder="Se asigna automáticamente"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Horario del compañero seleccionado
                    </p>
                  </div>
                  <div>
                    <label htmlFor="grupo-destinatario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grupo
                    </label>
                    <input
                      id="grupo-destinatario"
                      type="text"
                      disabled
                      value={solicitudDirectaForm.grupoDestinatario ? `Grupo ${solicitudDirectaForm.grupoDestinatario}` : 'Selecciona un compañero'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      placeholder="Se asigna automáticamente"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Grupo del compañero seleccionado
                    </p>
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
                  disabled={isSubmitting || !solicitudDirectaForm.destinatarioId}
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
