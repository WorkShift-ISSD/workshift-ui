'use client';

import { useState, useCallback, useEffect, useMemo, Key } from 'react';
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
  CheckCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useModal } from '@/hooks/useModal';
import { SolicitudesTabType, useTabs } from '@/hooks/useTabs';
import { useFormatters } from '@/hooks/useFormatters';
import { NuevaOfertaForm, useOfertas } from '@/hooks/useOfertas';
import { SolicitudDirectaForm, useSolicitudesDirectas } from '@/hooks/useSolicitudesDirectas';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import Can from '../components/Can';
import { calcularGrupoTrabaja, esFechaValidaParaGrupo } from '../lib/turnosUtils';
import ModalConsultarSolicitudes from '../components/ModalConsultarSolicitudes';
import { formatFechaHoraLocal, formatFechaLocal } from '../lib/utils';
import { CustomDatePicker } from '../components/CustomDatePicker';
import {
  EstadoSolicitud,
  EstadoOferta,
  RolUsuario,
  GrupoTurno,
  TipoTurno,
  TipoOferta,
  Prioridad,
  EstadoCambio,
  getEnumSqlString,
  TipoSolicitud
} from '../lib/enum';

// Constantes que NO dependen del usuario
const GRUPOS: string[] = ['A', 'B'];

const INITIAL_OFERTA_FORM: NuevaOfertaForm = {
  tipo: TipoOferta.OFREZCO,
  modalidadBusqueda: TipoSolicitud.INTERCAMBIO,
  fechaOfrece: '',
  horarioOfrece: '04:00-14:00',
  grupoOfrece: 'A',
  descripcion: '',
  prioridad: 'NORMAL',
  fechasBusca: [{ fecha: '', horario: '04:00-14:00' }],
  fechasDisponibles: [{ fecha: '', horario: '04:00-14:00' }],
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

const parseFechaLocal = (fechaString: string) => {
  // fechaString: "2025-11-29"
  const [y, m, d] = fechaString.split('-').map(Number);
  return new Date(y, m - 1, d); // <-- LOCAL sin UTC
};


export default function CambiosTurnosPage() {
  // ✅ Auth y permisos (DENTRO del componente)
  const { user } = useAuth();
  const { can } = usePermissions();

  // ✅ Horarios dinámicos según el rol del usuario (DENTRO del componente)
  const HORARIOS = useMemo(() => {
    if (!user) return ['04:00-14:00', '06:00-16:00', '10:00-20:00', '13:00-23:00', '14:00-23:00'];

    if (user.rol === 'INSPECTOR') {
      return ['04:00-14:00', '06:00-16:00', '10:00-20:00', '13:00-23:00', '14:00-23:00'];
    } else if (user.rol === 'SUPERVISOR') {
      return ['05:00-14:00', '14:00-23:00', '23:00-05:00'];
    }

    // Fallback
    return ['04:00-14:00', '06:00-16:00', '10:00-20:00', '13:00-23:00', '14:00-23:00'];
  }, [user]);

  const FORM_INICIAL = useMemo(() => ({
    tipo: TipoOferta.OFREZCO,
    modalidadBusqueda: TipoSolicitud.INTERCAMBIO,
    fechaOfrece: '',
    horarioOfrece: user?.horario || '04:00-14:00',
    grupoOfrece: user?.grupoTurno || 'A',
    descripcion: '',
    prioridad: 'NORMAL' as Prioridad,
    fechasBusca: [{ fecha: '', horario: user?.horario || '04:00-14:00' }],
    fechasDisponibles: [{ fecha: '', horario: user?.horario || '04:00-14:00' }],
  }), [user?.horario, user?.grupoTurno]);

  // Estado para modal de consulta
  const [isConsultarModalOpen, setIsConsultarModalOpen] = useState(false);

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
    actualizarSolicitud,
    isLoading: isLoadingSolicitudes,
    error: errorSolicitudes
  } = useSolicitudesDirectas();

  const { modalType, isModalOpen, openModal, closeModal } = useModal();
  const { activeTab: solicitudesTab, setActiveTab: setSolicitudesTab } = useTabs<SolicitudesTabType>('estado');
  const { formatTimeAgo, formatDate } = useFormatters();

  // Estados locales
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [nuevaOfertaForm, setNuevaOfertaForm] = useState<NuevaOfertaForm>(FORM_INICIAL);
  const [solicitudDirectaForm, setSolicitudDirectaForm] = useState<SolicitudDirectaForm>(INITIAL_SOLICITUD_FORM);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solicitudEditandoId, setSolicitudEditandoId] = useState<string | null>(null);
  const [ofertaEditandoId, setOfertaEditandoId] = useState<string | null>(null);

  type MainTab = 'mis-solicitudes' | 'historico' | 'recibidas' | 'ofertas-disponibles';
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('mis-solicitudes');

  useEffect(() => {
  if (user?.horario) {
    setNuevaOfertaForm(prev => ({
      ...prev,
      horarioOfrece: user.horario,
      grupoOfrece: user.grupoTurno,
      fechasBusca: prev.fechasBusca.map(f => ({ ...f, horario: user.horario })),
      fechasDisponibles: prev.fechasDisponibles.map(f => ({ ...f, horario: user.horario })),
    }));
  }
}, [user?.horario, user?.grupoTurno]);

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
    if (!user) return [];

    return ofertas.filter(
      o => o.ofertante?.id !== user.id &&
        o.estado === 'DISPONIBLE' &&
        o.ofertante?.rol === user.rol  // ✅ Solo ver ofertas del mismo rol
    );
  }, [ofertas, user]);

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
    console.log('🔍 Validando formulario:', form);
    console.log('📅 fechaOfrece:', form.fechaOfrece);
    console.log('📅 fechasBusca:', form.fechasBusca);

    console.log('🔍 Validando formulario de oferta:', form);

    if (form.modalidadBusqueda === TipoSolicitud.INTERCAMBIO) {
      // ✅ Validar fecha que ofrece (siempre requerida en INTERCAMBIO)
      if (!form.fechaOfrece || form.fechaOfrece.trim() === '') {
        return 'Debes completar la fecha que ofreces';
      }

      // ✅ Validar que la fecha ofrecida sea del grupo del usuario
      if (user && form.fechaOfrece) {
        const fechaObj = new Date(form.fechaOfrece + 'T00:00:00');
        if (!esFechaValidaParaGrupo(fechaObj, user.grupoTurno)) {
          return `La fecha que ofreces no corresponde a tu Grupo ${user.grupoTurno}. Solo puedes ofrecer turnos de tu grupo.`;
        }
      }

      // ✅ Validar que al menos haya una fecha de búsqueda
      const fechasValidas = form.fechasBusca.filter((f: { fecha: string; }) => f.fecha.trim() !== '');
      if (fechasValidas.length === 0) {
        return 'Debes agregar al menos una fecha que buscas';
      }

      // ✅ Validar que no sean exactamente iguales (misma fecha Y mismo horario)
      const ofreceMismo = form.fechasBusca.some(
        (busca: { fecha: any; horario: any; }) => busca.fecha === form.fechaOfrece &&
          busca.horario === (user?.horario || form.horarioOfrece)
      );

      if (ofreceMismo) {
        return 'No puedes ofrecer y buscar exactamente el mismo turno (misma fecha y horario)';
      }
    }

    // Validación para modalidad ABIERTO
    if (form.modalidadBusqueda === TipoSolicitud.ABIERTO) {
      const fechasValidas = form.fechasDisponibles.filter((f: { fecha: string; }) => f.fecha.trim() !== '');

      if (fechasValidas.length === 0) {
        return 'Debes agregar al menos una fecha disponible';
      }

      // Validar que las fechas sean futuras
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const hayFechaPasada = fechasValidas.some((f: { fecha: string; }) => {
        const fecha = new Date(f.fecha + 'T00:00:00');
        return fecha < hoy;
      });

      if (hayFechaPasada) {
        return 'No puedes agregar fechas pasadas';
      }
    }

    // Validación general de descripción
    if (!form.descripcion || form.descripcion.trim() === '') {
      return 'Debes agregar una descripción';
    }

    if (form.descripcion.trim().length < 10) {
      return 'La descripción debe tener al menos 10 caracteres';
    }

    return '';
  }, [user]);

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
      if (ofertaEditandoId) {
        // ✅ EDITAR oferta existente
        const res = await fetch(`/api/ofertas/${ofertaEditandoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: nuevaOfertaForm.tipo,
            modalidadBusqueda: nuevaOfertaForm.modalidadBusqueda,
            fechaOfrece: nuevaOfertaForm.fechaOfrece,
            horarioOfrece: nuevaOfertaForm.horarioOfrece, // ✅ Dentro del body
            grupoOfrece: nuevaOfertaForm.grupoOfrece,
            fechasBusca: nuevaOfertaForm.fechasBusca,
            fechasDisponibles: nuevaOfertaForm.fechasDisponibles,
            descripcion: nuevaOfertaForm.descripcion,
            prioridad: nuevaOfertaForm.prioridad,
          }),
        });

        console.log('📤 ENVIANDO AL BACKEND:', {
          horarioOfrece: nuevaOfertaForm.horarioOfrece,
          userHorario: user?.horario,
          formCompleto: nuevaOfertaForm
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al actualizar la oferta');
        }

        console.log('✅ Oferta actualizada');
      } else {
        // ✅ CREAR nueva oferta
        await agregarOferta(nuevaOfertaForm);
        console.log('✅ Oferta publicada exitosamente');
      }

      closeModal();
      setNuevaOfertaForm(FORM_INICIAL);
      setOfertaEditandoId(null);
      setFormError('');

    } catch (error) {
      console.error('❌ Error:', error);
      setFormError(error instanceof Error ? error.message : 'Error al procesar la oferta');
    } finally {
      setIsSubmitting(false);
    }
  }, [nuevaOfertaForm, ofertaEditandoId, validateOfertaForm, agregarOferta, closeModal]);

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
      if (solicitudEditandoId) {
        // ✅ EDITAR solicitud existente usando el hook
        await actualizarSolicitud(solicitudEditandoId, solicitudDirectaForm);
        console.log('✅ Solicitud actualizada');
      } else {
        // ✅ CREAR nueva solicitud usando el hook
        await agregarSolicitud(solicitudDirectaForm);
        console.log('✅ Solicitud creada');
      }

      // Limpiar y cerrar
      closeModal();
      setSolicitudDirectaForm(INITIAL_SOLICITUD_FORM);
      setSolicitudEditandoId(null); // ⚠️ IMPORTANTE: Limpiar el ID de edición
      setFormError('');
    } catch (error) {
      console.error('Error:', error);
      setFormError(error instanceof Error ? error.message : 'Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  }, [solicitudDirectaForm, solicitudEditandoId, validateSolicitudForm, agregarSolicitud, actualizarSolicitud, closeModal]);


  // Handler para cerrar modal y limpiar errores
  const handleCloseModal = useCallback(() => {
    closeModal();
    setFormError('');
    setIsSubmitting(false);
    setSolicitudEditandoId(null);
    setOfertaEditandoId(null); // ✅ AGREGAR ESTO
    setSolicitudDirectaForm(INITIAL_SOLICITUD_FORM);
    setNuevaOfertaForm(FORM_INICIAL);
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
      if (!user?.id) {
        alert('Debes estar autenticado para tomar una oferta');
        return;
      }

      if (!confirm('¿Estás seguro de que quieres tomar esta oferta?')) {
        return;
      }

      console.log('🔵 Tomando oferta:', { ofertaId, tomadorId: user.id });

      const res = await fetch(`/api/ofertas/${ofertaId}/tomar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tomadorId: user.id }),
      });

      console.log('📤 ENVIANDO AL BACKEND:', {
        horarioOfrece: nuevaOfertaForm.horarioOfrece,
        userHorario: user?.horario,
        formCompleto: nuevaOfertaForm
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('❌ Error del servidor:', data);
        throw new Error(data.error || 'Error al tomar la oferta');
      }

      const data = await res.json();
      console.log('✅ Respuesta exitosa:', data);

      alert('¡Oferta tomada exitosamente! Pendiente de autorización del jefe.');

      // ✅ Recargar la página para ver los cambios


    } catch (error) {
      console.error('❌ Error al tomar oferta:', error);
      alert(error instanceof Error ? error.message : 'Error al tomar la oferta. Intenta nuevamente.');
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

      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  // Utilidades
const formatearFecha = useCallback((fecha: string | null | undefined) => {
  if (!fecha) return 'Fecha no disponible';

  try {
    // Si viene un ISO completo: 2025-12-02T15:48:13.000Z
    if (fecha.includes('T')) {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';

      return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    // Si viene YYYY-MM-DD (tu caso para los turnos)
    const date = parseFechaLocal(fecha);
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
      <span className={`text-xs ml-2 px-2 py-1 rounded ${esValido
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Ofertas de Turnos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona tus intercambios y solicitudes de cambio de turno
            </p>
          </div>

          {/* BOTÓN AQUÍ */}
          <button
            onClick={() => setIsConsultarModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Search className="h-5 w-5" />
            Consultar Solicitudes
          </button>
        </div>
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
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.busco}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ofrezco</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.ofrezco}</p>
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {solicitudEditandoId ? 'Editar Solicitud Directa' : 'Solicitud Directa'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
                Envía una solicitud directa de cambio a un compañero específico
              </p>
            </div>
          </button>
        </Can>
      </div>

      {/* Sistema de Tabs Principal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-400 dark:border-gray-700">
        {/* Tabs Header - Fijo */}
        <div className="border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex overflow-x-auto">
            {/* Tab: Mis Solicitudes Activas */}
            <button
              onClick={() => setActiveMainTab('mis-solicitudes')}
              className={`flex-1 min-w-[160px] px-6 py-4 font-semibold text-sm transition-colors relative ${activeMainTab === 'mis-solicitudes'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Mis Solicitudes</span>
                {(misOfertas.length + solicitudesEnviadas.filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado)).length) > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    {misOfertas.length + solicitudesEnviadas.filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado)).length}
                  </span>
                )}
              </div>
              {activeMainTab === 'mis-solicitudes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>

            {/* Tab: Histórico */}
            {/* Tab: Histórico */}
            {/* Tab: Histórico */}
            <button
              onClick={() => setActiveMainTab('historico')}
              className={`flex-1 min-w-[160px] px-6 py-4 font-semibold text-sm transition-colors relative ${activeMainTab === 'historico'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="h-4 w-4" />
                <span>Histórico</span>
                {(() => {
                  // ✅ MISMO FILTRO que en el contenido del tab
                  const ofertasHistorico = ofertas.filter(o => {
                    const soyOfertante = o.ofertante?.id === user?.id;
                    const soyTomador = o.tomador?.id === user?.id;

                    // COMPLETADO: mostrar si participé
                    if (o.estado === 'COMPLETADO') {
                      return soyOfertante || soyTomador;
                    }

                    // CANCELADO: SOLO mostrar si YO soy el ofertante
                    if (o.estado === 'CANCELADO') {
                      return soyOfertante;
                    }

                    return false;
                  });

                  // ✅ MISMO FILTRO que en el contenido del tab
                  const solicitudesHistorico = solicitudesDirectas.filter(s => {
                    const soyElSolicitante = s.solicitante?.id === user?.id;
                    const soyElDestinatario = s.destinatario?.id === user?.id;

                    // COMPLETADO: mostrar si participé
                    if (s.estado === 'COMPLETADO') {
                      return soyElSolicitante || soyElDestinatario;
                    }

                    // CANCELADO: SOLO mostrar si YO soy el solicitante
                    if (s.estado === 'CANCELADO') {
                      return soyElSolicitante;
                    }

                    return false;
                  });

                  const total = ofertasHistorico.length + solicitudesHistorico.length;

                  return total > 0 ? (
                    <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                      {total}
                    </span>
                  ) : null;
                })()}
              </div>
              {activeMainTab === 'historico' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>

            {/* Tab: Solicitudes Recibidas */}
            <Can do="recibir_solicitud_directa">
              <button
                onClick={() => setActiveMainTab('recibidas')}
                className={`flex-1 min-w-[160px] px-6 py-4 font-semibold text-sm transition-colors relative ${activeMainTab === 'recibidas'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Recibidas</span>
                  {solicitudesRecibidas.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                      {solicitudesRecibidas.length}
                    </span>
                  )}
                </div>
                {activeMainTab === 'recibidas' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            </Can>

            {/* Tab: Ofertas Disponibles */}
            <Can do="pedir_turno">
              <button
                onClick={() => setActiveMainTab('ofertas-disponibles')}
                className={`flex-1 min-w-[160px] px-6 py-4 font-semibold text-sm transition-colors relative ${activeMainTab === 'ofertas-disponibles'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Gift className="h-4 w-4" />
                  <span>Disponibles</span>
                  {ofertasDisponibles.filter(o => o.ofertante?.id !== user?.id).length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                      {ofertasDisponibles.filter(o => o.ofertante?.id !== user?.id).length}
                    </span>
                  )}
                </div>
                {activeMainTab === 'ofertas-disponibles' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            </Can>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Tab Content: Mis Solicitudes Activas */}
          {activeMainTab === 'mis-solicitudes' && (
            <div className="space-y-6">
              {misOfertas.length === 0 && solicitudesEnviadas.filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado)).length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Sin Solicitudes Activas
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No tienes solicitudes u ofertas activas en este momento
                  </p>
                </div>
              ) : (
                <>
                  {/* MIS OFERTAS - Con mejor distinción entre Abierta e Intercambio */}
                  {misOfertas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Mis Ofertas Publicadas
                      </h3>
                      <div className="space-y-3">
                        {misOfertas.map((oferta) => {
                          const fechaFormateada = new Intl.DateTimeFormat('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }).format(new Date(oferta.publicado));

                          const esIntercambio = oferta.modalidadBusqueda === TipoSolicitud.INTERCAMBIO;
                          const esAbierto = oferta.modalidadBusqueda === TipoSolicitud.ABIERTO;

                          return (
                            <div
                              key={oferta.id}
                              className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 py-4 rounded-lg transition-colors"
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${oferta.prioridad === "URGENTE" ? "bg-red-500" : "bg-blue-500"
                                      }`}
                                  ></div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                        {oferta.tipo === "OFREZCO" ? "Ofrezco guardia" : "Busco guardia"}
                                      </span>
                                      {/* Badge de modalidad */}
                                      {esIntercambio && (
                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                                          <RefreshCw className="h-3 w-3 inline mr-1" />
                                          Intercambio
                                        </span>
                                      )}
                                      {esAbierto && (
                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                                          <Gift className="h-3 w-3 inline mr-1" />
                                          Abierto
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Publicado: {fechaFormateada}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Detalles según tipo */}
                              <div className="space-y-2 mb-3">
                                {/* Turno que ofrece */}
                                <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                    {oferta.tipo === "OFREZCO" ? "Turno disponible:" : "Turno que busco:"}
                                  </p>
                                  <p className="text-xs text-gray-900 dark:text-gray-100">
                                    📅 {oferta.turnoOfrece?.fecha
                                      ? parseFechaLocal(oferta.turnoOfrece.fecha).toLocaleDateString("es-AR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })
                                      : 'N/A'
                                    } •
                                    🕐 {oferta.turnoOfrece?.horario || user?.horario || 'N/A'} •
                                    Grupo {oferta.turnoOfrece?.grupoTurno || user?.grupoTurno || 'N/A'}
                                  </p>
                                </div>

                                {/* Si es intercambio, mostrar lo que busca */}
                                {esIntercambio && oferta.turnosBusca && Array.isArray(oferta.turnosBusca) && oferta.turnosBusca.length > 0 && (
                                  <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800">
                                    <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                                      {oferta.tipo === "OFREZCO" ? "A cambio de:" : "Ofrezco a cambio:"}
                                    </p>
                                    <div className="space-y-1">
                                      {oferta.turnosBusca.map((turno: any, idx: number) => (
                                        <p key={idx} className="text-xs text-gray-900 dark:text-gray-100">
                                          📅 {formatearFecha(turno.fecha)} • 🕐 {turno.horario}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Si es abierto, mostrar fechas disponibles */}
                                {esAbierto && oferta.fechasDisponibles && Array.isArray(oferta.fechasDisponibles) && oferta.fechasDisponibles.length > 0 && (
                                  <div className="bg-purple-50 dark:bg-purple-900/10 rounded p-3 border border-purple-200 dark:border-purple-800">
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                                      Fechas disponibles:
                                    </p>
                                    <div className="space-y-1">
                                      {oferta.fechasDisponibles.map((fecha: any, idx: number) => (
                                        <p key={idx} className="text-xs text-gray-900 dark:text-gray-100">
                                          📅 {formatearFecha(fecha.fecha)} • 🕐 {fecha.horario}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Descripción */}
                              {oferta.descripcion && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
                                  "{oferta.descripcion}"
                                </p>
                              )}

                              {/* Botones de acción */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setNuevaOfertaForm({
                                      tipo: oferta.tipo,
                                      modalidadBusqueda: oferta.modalidadBusqueda as TipoSolicitud,
                                      fechaOfrece: oferta.turnoOfrece?.fecha || '',
                                      horarioOfrece: oferta.turnoOfrece?.horario || user?.horario || '04:00-14:00',
                                      grupoOfrece: oferta.turnoOfrece?.grupoTurno || 'A',
                                      descripcion: oferta.descripcion || '',
                                      prioridad: oferta.prioridad,
                                      fechasBusca: oferta.turnosBusca && Array.isArray(oferta.turnosBusca) && oferta.turnosBusca.length > 0
                                        ? oferta.turnosBusca.map((t: any) => ({ fecha: t.fecha, horario: t.horario }))
                                        : [{ fecha: '', horario: '04:00-14:00' }],
                                      fechasDisponibles: oferta.fechasDisponibles && Array.isArray(oferta.fechasDisponibles) && oferta.fechasDisponibles.length > 0
                                        ? oferta.fechasDisponibles.map((f: any) => ({ fecha: f.fecha, horario: f.horario }))
                                        : [{ fecha: '', horario: '04:00-14:00' }],
                                    });
                                    setOfertaEditandoId(oferta.id);
                                    openModal('nueva-oferta');
                                  }}
                                  className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition flex items-center justify-center gap-1"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleCancelarOferta(oferta.id)}
                                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  ✗ Cancelar Oferta
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* MIS SOLICITUDES DIRECTAS */}
                  {solicitudesEnviadas.filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado)).length > 0 && (
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
                                      {formatFechaHoraLocal(solicitud.fechaSolicitud)}
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${solicitud.estado === 'SOLICITADO'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  }`}>
                                  {solicitud.estado}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Ofrezco:</p>
                                  <p className="text-xs text-gray-900 dark:text-gray-100">
                                    📅 {formatFechaLocal(solicitud.turnoSolicitante.fecha)}
                                  </p>
                                  <p className="text-xs text-gray-700 dark:text-gray-300">
                                    🕐 {solicitud.turnoSolicitante.horario} - Grupo {solicitud.turnoSolicitante.grupoTurno}
                                  </p>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800">
                                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Por su turno:</p>
                                  <p className="text-xs text-gray-900 dark:text-gray-100">
                                    📅 {formatFechaLocal(solicitud.turnoDestinatario.fecha)}
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
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setSolicitudDirectaForm({
                                        solicitanteId: user?.id || '',
                                        destinatarioId: solicitud.destinatario.id,
                                        fechaSolicitante: solicitud.turnoSolicitante.fecha,
                                        horarioSolicitante: solicitud.turnoSolicitante.horario,
                                        grupoSolicitante: solicitud.turnoSolicitante.grupoTurno,
                                        fechaDestinatario: solicitud.turnoDestinatario.fecha,
                                        horarioDestinatario: solicitud.turnoDestinatario.horario,
                                        grupoDestinatario: solicitud.turnoDestinatario.grupoTurno,
                                        motivo: solicitud.motivo,
                                        prioridad: solicitud.prioridad,
                                      });
                                      setSolicitudEditandoId(solicitud.id);
                                      openModal('solicitud-directa');
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition flex items-center justify-center gap-1"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleRechazarSolicitud(solicitud.id)}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center justify-center gap-1"
                                  >
                                    <X className="h-3 w-3" />
                                    Cancelar
                                  </button>
                                </div>
                              )}

                              {solicitud.estado === 'APROBADO' as any && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                                  <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Solicitud aceptada. Pendiente de autorización del jefe.
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab Content: Histórico */}
          {activeMainTab === 'historico' && (
            <div>
              {(() => {
                // ✅ NUEVO FILTRO: Solo mostrar lo que YO cancelé o completé
                const ofertasHistorico = ofertas.filter(o => {
                  const soyOfertante = o.ofertante?.id === user?.id;
                  const soyTomador = o.tomador?.id === user?.id;

                  // Para COMPLETADO: mostrar si participé (ambas partes lo ven)
                  if (o.estado === 'COMPLETADO') {
                    return soyOfertante || soyTomador;
                  }

                  // Para CANCELADO: SOLO mostrar si YO soy el ofertante (quien creó la oferta puede cancelar)
                  if (o.estado === 'CANCELADO') {
                    return soyOfertante; // ✅ Solo quien creó la oferta ve las canceladas
                  }

                  return false;
                });

                // ✅ NUEVO FILTRO: Solo mostrar solicitudes que YO cancelé o completé
                const solicitudesHistorico = solicitudesDirectas.filter(s => {
                  const soyElSolicitante = s.solicitante?.id === user?.id;
                  const soyElDestinatario = s.destinatario?.id === user?.id;

                  // Para COMPLETADO: mostrar si participé (ambas partes lo ven)
                  if (s.estado === 'COMPLETADO') {
                    return soyElSolicitante || soyElDestinatario;
                  }

                  // Para CANCELADO: SOLO mostrar si YO soy el solicitante
                  // (asumimos que solo el solicitante puede cancelar su propia solicitud)
                  if (s.estado === 'CANCELADO') {
                    return soyElSolicitante; // ✅ Solo quien envió la solicitud ve las canceladas
                  }

                  return false;
                });

                const totalHistorico = ofertasHistorico.length + solicitudesHistorico.length;

                // 🔍 Debug
                console.log('📊 MI Histórico:', {
                  userId: user?.id,
                  ofertas: {
                    todas: ofertas.length,
                    completadas: ofertas.filter(o => o.estado === 'COMPLETADO' && (o.ofertante?.id === user?.id || o.tomador?.id === user?.id)).length,
                    canceladasMias: ofertas.filter(o => o.estado === 'CANCELADO' && o.ofertante?.id === user?.id).length,
                    enHistorico: ofertasHistorico.length
                  },
                  solicitudes: {
                    todas: solicitudesDirectas.length,
                    completadas: solicitudesDirectas.filter(s => s.estado === 'COMPLETADO' && (s.solicitante?.id === user?.id || s.destinatario?.id === user?.id)).length,
                    canceladasMias: solicitudesDirectas.filter(s => s.estado === 'CANCELADO' && s.solicitante?.id === user?.id).length,
                    enHistorico: solicitudesHistorico.length
                  },
                  totalHistorico
                });

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
                        Mi Historial de Cambios
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {totalHistorico} {totalHistorico === 1 ? 'cambio realizado' : 'cambios realizados'}
                      </p>
                    </div>

                    {/* OFERTAS en histórico */}
                    {ofertasHistorico
                      .sort((a, b) => new Date(b.publicado).getTime() - new Date(a.publicado).getTime())
                      .map((oferta) => {
                        const esIntercambio = oferta.modalidadBusqueda === TipoSolicitud.INTERCAMBIO;
                        const soyOfertante = oferta.ofertante?.id === user?.id;
                        const nombreOtraParte = soyOfertante
                          ? `${oferta.tomador?.nombre || 'Usuario'} ${oferta.tomador?.apellido || ''}`
                          : `${oferta.ofertante?.nombre} ${oferta.ofertante?.apellido}`;

                        return (
                          <div
                            key={oferta.id}
                            className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 py-4 rounded-lg transition-colors"
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${oferta.estado === 'COMPLETADO'
                                    ? 'bg-green-500'
                                    : 'bg-red-500'
                                    }`}
                                ></div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                      {esIntercambio ? 'Intercambio' : 'Oferta abierta'} con {nombreOtraParte}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded ${oferta.estado === 'COMPLETADO'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        }`}
                                    >
                                      {oferta.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado por ti'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {esIntercambio && oferta.turnoOfrece && oferta.turnosBusca && Array.isArray(oferta.turnosBusca) && oferta.turnosBusca.length > 0 ? (
                                      <>
                                        Turno del {formatDate(oferta.turnoOfrece.fecha)} ({oferta.turnoOfrece.horario})
                                        {' '}por {oferta.turnosBusca.length === 1 ? 'turno del' : 'turnos:'}{' '}
                                        {oferta.turnosBusca.map((t: any, i: number) => (
                                          <span key={i}>
                                            {i > 0 && ', '}
                                            {formatDate(t.fecha)} ({t.horario})
                                          </span>
                                        ))}
                                      </>
                                    ) : oferta.fechasDisponibles && Array.isArray(oferta.fechasDisponibles) && oferta.fechasDisponibles.length > 0 ? (
                                      <>
                                        Fechas disponibles: {oferta.fechasDisponibles.map((f: any, i: number) => (
                                          <span key={i}>
                                            {i > 0 && ', '}
                                            {formatDate(f.fecha)} ({f.horario})
                                          </span>
                                        ))}
                                      </>
                                    ) : (
                                      'Información no disponible'
                                    )}
                                  </p>
                                </div>
                              </div>
                              <time className="text-xs text-gray-500 dark:text-gray-400 md:ml-5">
                                {formatTimeAgo(oferta.publicado)}
                              </time>
                            </div>

                            {oferta.descripcion && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 ml-5 italic">
                                "{oferta.descripcion}"
                              </p>
                            )}
                          </div>
                        );
                      })}

                    {/* SOLICITUDES DIRECTAS en histórico */}
                    {solicitudesHistorico
                      .sort((a, b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime())
                      .map((solicitud) => {
                        const soyElSolicitante = solicitud.solicitante?.id === user?.id;
                        const nombreOtraParte = soyElSolicitante
                          ? `${solicitud.destinatario.nombre} ${solicitud.destinatario.apellido}`
                          : `${solicitud.solicitante.nombre} ${solicitud.solicitante.apellido}`;

                        return (
                          <div
                            key={solicitud.id}
                            className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-4 py-4 rounded-lg transition-colors"
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${solicitud.estado === 'COMPLETADO' ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                ></div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                      Solicitud directa con {nombreOtraParte}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded ${solicitud.estado === 'COMPLETADO'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        }`}
                                    >
                                      {solicitud.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado por ti'}
                                    </span>
                                    {solicitud.prioridad === 'URGENTE' && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                        URGENTE
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {soyElSolicitante ? (
                                      <>
                                        Tu turno: {formatDate(solicitud.turnoSolicitante.fecha)} ({solicitud.turnoSolicitante.horario})
                                        {' - '}
                                        Turno recibido: {formatDate(solicitud.turnoDestinatario.fecha)} ({solicitud.turnoDestinatario.horario})
                                      </>
                                    ) : (
                                      <>
                                        Turno ofrecido: {formatDate(solicitud.turnoDestinatario.fecha)} ({solicitud.turnoDestinatario.horario})
                                        {' - '}
                                        Turno recibido: {formatDate(solicitud.turnoSolicitante.fecha)} ({solicitud.turnoSolicitante.horario})
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <time className="text-xs text-gray-500 dark:text-gray-400 md:ml-5">
                                {formatTimeAgo(solicitud.fechaSolicitud)}
                              </time>
                            </div>

                            {solicitud.motivo && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 ml-5 mt-2 italic">
                                "{solicitud.motivo}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tab Content: Solicitudes Recibidas */}
          {activeMainTab === 'recibidas' && (
            <Can do="recibir_solicitud_directa">
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Solicitudes Recibidas
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cambios que otros compañeros te han solicitado
                  </p>
                </div>

                {solicitudesRecibidas.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Sin Solicitudes Pendientes
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No tienes solicitudes pendientes en este momento
                    </p>
                  </div>
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
                              📅 {parseFechaLocal(solicitud.turnoSolicitante.fecha).toLocaleDateString("es-AR")}
                            </p>
                            <p className="text-xs text-gray-700 dark:text-gray-300">
                              🕐 {solicitud.turnoSolicitante.horario} - Grupo {solicitud.turnoSolicitante.grupoTurno}
                            </p>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Por tu turno:</p>
                            <p className="text-xs text-gray-900 dark:text-gray-100">
                              📅 {parseFechaLocal(solicitud.turnoDestinatario.fecha).toLocaleDateString("es-AR")}

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
            </Can>
          )}

          {/* Tab Content: Ofertas Disponibles */}
          {activeMainTab === 'ofertas-disponibles' && (
            <Can do="pedir_turno">
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Ofertas Disponibles
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ofertasDisponibles.filter(o => o.ofertante?.id !== user?.id).length}{' '}
                    {ofertasDisponibles.filter(o => o.ofertante?.id !== user?.id).length === 1
                      ? 'oferta disponible'
                      : 'ofertas disponibles'}
                  </p>
                </div>

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
                      .filter(oferta => oferta.ofertante?.id !== user?.id)
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

                          <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-4 border border-blue-200 dark:border-blue-800 mb-3">
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                              Turno disponible:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  {oferta.turnoOfrece?.fecha}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Horario:</span>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  {oferta.turnoOfrece?.horario}
                                </p>
                              </div>
                              {oferta.turnoOfrece?.grupoTurno && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Grupo:</span>
                                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                                    {oferta.turnoOfrece.grupoTurno}
                                  </p>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  {oferta.modalidadBusqueda === TipoSolicitud.INTERCAMBIO ? 'Intercambio' : 'Oferta abierta'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {oferta.modalidadBusqueda === TipoSolicitud.INTERCAMBIO && oferta.turnosBusca && Array.isArray(oferta.turnosBusca) && oferta.turnosBusca.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-900/10 rounded p-4 border border-green-200 dark:border-green-800 mb-3">
                              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                                A cambio de:
                              </p>
                              <div className="space-y-2">
                                {oferta.turnosBusca.map((turno: any, idx: number) => (
                                  <div key={idx} className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                                        {turno.fecha}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Horario:</span>
                                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                                        {turno.horario}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {oferta.modalidadBusqueda === TipoSolicitud.ABIERTO && oferta.fechasDisponibles && Array.isArray(oferta.fechasDisponibles) && oferta.fechasDisponibles.length > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-900/10 rounded p-4 border border-purple-200 dark:border-purple-800 mb-3">
                              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">
                                Fechas disponibles:
                              </p>
                              <div className="space-y-2">
                                {oferta.fechasDisponibles.map((fecha: any, idx: number) => (
                                  <div key={idx} className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                                        {fecha.fecha}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Horario:</span>
                                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                                        {fecha.horario}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {oferta.descripcion && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
                              Motivo: "{oferta.descripcion}"
                            </p>
                          )}

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
                              Ignorar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Can>
          )}
        </div>
      </div>
      {/* Modal Nueva Oferta */}
      {/* TODO: Implementar modal nuevo desde  */}
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
                {ofertaEditandoId ? 'Editar Oferta de Cambio' : 'Nueva Oferta de Cambio'}
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
                    onClick={() => setNuevaOfertaForm((prev: any) => ({
                      ...prev,
                      tipo: 'OFREZCO',
                      modalidadBusqueda: TipoSolicitud.INTERCAMBIO
                    }))}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${nuevaOfertaForm.tipo === 'OFREZCO'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={nuevaOfertaForm.tipo === 'OFREZCO'}
                  >
                    Ofrezco Guardia
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaOfertaForm((prev: any) => ({
                      ...prev,
                      tipo: 'BUSCO',
                      modalidadBusqueda: TipoSolicitud.INTERCAMBIO
                    }))}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${nuevaOfertaForm.tipo === 'BUSCO'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    aria-pressed={nuevaOfertaForm.tipo === 'BUSCO'}
                  >
                    Busco Guardia
                  </button>
                </div>
              </div>

              {/* Modalidad de búsqueda */}
              <div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="modalidadBusqueda"
                      value={TipoSolicitud.INTERCAMBIO}
                      checked={nuevaOfertaForm.modalidadBusqueda === TipoSolicitud.INTERCAMBIO}
                      onChange={(e) => setNuevaOfertaForm((prev: any) => ({ ...prev, modalidadBusqueda: TipoSolicitud.INTERCAMBIO }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Intercambio</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="modalidadBusqueda"
                      value={TipoSolicitud.ABIERTO}
                      checked={nuevaOfertaForm.modalidadBusqueda === TipoSolicitud.ABIERTO}
                      onChange={(e) => setNuevaOfertaForm((prev: any) => ({ ...prev, modalidadBusqueda: TipoSolicitud.ABIERTO }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Abierto</span>
                  </label>
                </div>
              </div>

              {/* Formulario según tipo */}
              {nuevaOfertaForm.tipo === 'BUSCO' && nuevaOfertaForm.modalidadBusqueda === TipoSolicitud.INTERCAMBIO && (
                <>
                  {/* Turno que Busca */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Turno que Buscas
                    </h3>
                    {nuevaOfertaForm.fechasBusca.map((item, index: number) => {
                      return (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 mb-3">
                          <div>
                            <label htmlFor={`fecha-busca-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Fecha
                            </label>
                            <input
                              id={`fecha-busca-${index}`}
                              type="date"
                              required
                              min={new Date().toISOString().split('T')[0]}
                              value={item.fecha}
                              onChange={(e) => {
                                const newFechas = [...nuevaOfertaForm.fechasBusca];
                                newFechas[index].fecha = e.target.value;
                                setNuevaOfertaForm((prev: any) => ({ ...prev, fechasBusca: newFechas }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                          </div>
                          <div>
                            <label htmlFor={`horario-busca-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Horario
                            </label>
                            <select
                              id={`horario-busca-${index}`}
                              value={item.horario}
                              onChange={(e) => {
                                const newFechas = [...nuevaOfertaForm.fechasBusca];
                                newFechas[index].horario = e.target.value;
                                setNuevaOfertaForm((prev: any) => ({ ...prev, fechasBusca: newFechas }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            {index === nuevaOfertaForm.fechasBusca.length - 1 && nuevaOfertaForm.fechasBusca.length < 4 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNuevaOfertaForm((prev) => ({
                                    ...prev,
                                    fechasBusca: [...prev.fechasBusca, { fecha: '', horario: HORARIOS[0] }]
                                  }))
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Agregar fecha"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            )}
                            {nuevaOfertaForm.fechasBusca.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newFechas = nuevaOfertaForm.fechasBusca.filter((_, i) => i !== index);
                                  setNuevaOfertaForm((prev: any) => ({ ...prev, fechasBusca: newFechas }));
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Eliminar fecha"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Turno que Ofrece */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Turno que Ofreces
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="fecha-ofrece" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {nuevaOfertaForm.fechaOfrece && (
                            <span className={`text-xs ml-2 px-2 py-1 rounded ${nuevaOfertaForm.fechaOfrece && user &&
                              esFechaValidaParaGrupo(parseFechaLocal(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno)
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              Grupo {calcularGrupoTrabaja(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'))}
                              {user && esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno) ? ' ✓' : ' ✗'}
                            </span>
                          )}
                          Fecha
                        </label>
                        <CustomDatePicker
                          id="fecha-ofrece"
                          value={nuevaOfertaForm.fechaOfrece}
                          onChange={(fechaStr) => {
                            setNuevaOfertaForm((prev: any) => ({ ...prev, fechaOfrece: fechaStr }));

                            if (formError) {
                              setFormError('');
                            }
                          }}
                          onValidate={(fechaObj) => {
                            if (nuevaOfertaForm.fechaOfrece && user) {
                              if (!esFechaValidaParaGrupo(fechaObj, user.grupoTurno)) {
                                setFormError(`La fecha seleccionada no corresponde al Grupo ${user.grupoTurno}. Solo puedes ofrecer turnos de tu grupo.`);
                              } else {
                                if (formError.includes('no corresponde al Grupo')) {
                                  setFormError('');
                                }
                              }
                            }
                          }}
                          minDate={new Date()}
                          companeroSeleccionado={user}
                          esFechaValidaParaGrupo={esFechaValidaParaGrupo}
                          setFormError={setFormError}
                          formError={formError}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${nuevaOfertaForm.fechaOfrece && user &&
                            !esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno)
                            ? 'border-red-500 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {nuevaOfertaForm.fechaOfrece && user && (
                          <>
                            {/* Si es ADMIN → mensaje especial */}
                            {user.rol === "ADMINISTRADOR" ? (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Los administradores no pueden realizar ofertas ni solicitar cambios de turno.
                                Esta función está habilitada solo para inspectores y supervisores.
                              </p>
                            ) : (
                              /* Si NO es admin, validar normalmente el grupo */
                              !esFechaValidaParaGrupo(
                                new Date(nuevaOfertaForm.fechaOfrece + "T00:00:00"),
                                user.grupoTurno
                              ) && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Esta fecha corresponde al Grupo{" "}
                                  {calcularGrupoTrabaja(
                                    new Date(nuevaOfertaForm.fechaOfrece + "T00:00:00")
                                  )}
                                  , pero tú eres del Grupo {user.grupoTurno}. Solo puedes ofrecer tus propios turnos.
                                </p>
                              )
                            )}
                          </>
                        )}
                        {nuevaOfertaForm.fechaOfrece && user &&
                          esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno) && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Fecha válida (tu turno del Grupo {user.grupoTurno})
                            </p>
                          )}
                      </div>
                      <div>
                        <label htmlFor="horario-ofrece" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Horario
                        </label>
                        <input
                          id="horario-ofrece"
                          type="text"
                          disabled
                          value={user?.horario || 'Cargando...'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {nuevaOfertaForm.tipo === 'OFREZCO' && nuevaOfertaForm.modalidadBusqueda === TipoSolicitud.INTERCAMBIO && (
                <>
                  {/* Turno que Ofrece */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Turno que Ofreces
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="fecha-ofrece" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          Fecha
                        </label>
                        <CustomDatePicker
                          id="fecha-ofrece"
                          value={nuevaOfertaForm.fechaOfrece}
                          onChange={(fechaStr) => {
                            setNuevaOfertaForm((prev: any) => ({ ...prev, fechaOfrece: fechaStr }));
                          }}
                          onValidate={(fechaObj) => {
                            if (nuevaOfertaForm.fechaOfrece && user) {
                              if (!esFechaValidaParaGrupo(fechaObj, user.grupoTurno)) {
                                setFormError(`La fecha seleccionada no corresponde al Grupo ${user.grupoTurno}. Solo puedes ofrecer turnos de tu grupo.`);
                              } else {
                                if (formError.includes('no corresponde al Grupo')) {
                                  setFormError('');
                                }
                              }
                            }
                          }}
                          minDate={new Date()}
                          companeroSeleccionado={user}
                          esFechaValidaParaGrupo={esFechaValidaParaGrupo}
                          setFormError={setFormError}
                          formError={formError}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${nuevaOfertaForm.fechaOfrece && user &&
                            !esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno)
                            ? 'border-red-500 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {nuevaOfertaForm.fechaOfrece && user && (
                          <>
                            {/* Caso especial: ADMIN */}
                            {user.rol === "ADMINISTRADOR" ? (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Los administradores no pueden realizar ofertas ni solicitar cambios de turno.
                                Esta funcionalidad está habilitada únicamente para inspectores y supervisores.
                              </p>
                            ) : (
                              /* Validación normal cuando NO es admin */
                              !esFechaValidaParaGrupo(
                                new Date(nuevaOfertaForm.fechaOfrece + "T00:00:00"),
                                user.grupoTurno
                              ) && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Esta fecha corresponde al Grupo{" "}
                                  {calcularGrupoTrabaja(
                                    new Date(nuevaOfertaForm.fechaOfrece + "T00:00:00")
                                  )}
                                  , pero tú eres del Grupo {user.grupoTurno}. Solo puedes ofrecer tus propios turnos.
                                </p>
                              )
                            )}
                          </>
                        )}

                        {nuevaOfertaForm.fechaOfrece && user &&
                          esFechaValidaParaGrupo(new Date(nuevaOfertaForm.fechaOfrece + 'T00:00:00'), user.grupoTurno) && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Fecha válida (tu turno del Grupo {user.grupoTurno})
                            </p>
                          )}
                      </div>
                      <div>
                        <label htmlFor="horario-ofrece" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Horario
                        </label>
                        <input
                          id="horario-ofrece"
                          type="text"
                          disabled
                          value={user?.horario || 'Cargando...'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Turno que Busca */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Turno que Buscas
                    </h3>
                    {nuevaOfertaForm.fechasBusca.map((item, index: number) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 mb-3">
                        <div>
                          <label htmlFor={`fecha-busca-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fecha
                          </label>
                          <input
                            id={`fecha-busca-${index}`}
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            value={item.fecha}
                            onChange={(e) => {
                              const newFechas = [...nuevaOfertaForm.fechasBusca];
                              newFechas[index].fecha = e.target.value;
                              setNuevaOfertaForm((prev: any) => ({ ...prev, fechasBusca: newFechas }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label htmlFor={`horario-busca-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Horario
                          </label>
                          <select
                            id={`horario-busca-${index}`}
                            value={item.horario}
                            onChange={(e) => {
                              const newFechas = [...nuevaOfertaForm.fechasBusca];
                              newFechas[index].horario = e.target.value;
                              setNuevaOfertaForm(prev => ({ ...prev, fechasBusca: newFechas }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          {index === nuevaOfertaForm.fechasBusca.length - 1 && nuevaOfertaForm.fechasBusca.length < 4 && (
                            <button
                              type="button"
                              onClick={() => {
                                setNuevaOfertaForm(prev => ({
                                  ...prev,
                                  fechasBusca: [...prev.fechasBusca, { fecha: '', horario: HORARIOS[0] }]
                                }));
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Agregar fecha"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          )}
                          {nuevaOfertaForm.fechasBusca.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newFechas = nuevaOfertaForm.fechasBusca.filter((_, i) => i !== index);
                                setNuevaOfertaForm((prev: any) => ({ ...prev, fechasBusca: newFechas }));
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar fecha"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Modalidad Abierta */}
              {nuevaOfertaForm.modalidadBusqueda === TipoSolicitud.ABIERTO && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Fechas Disponibles
                  </h3>
                  {nuevaOfertaForm.fechasDisponibles.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 mb-3">
                      <div>
                        <label htmlFor={`fecha-disp-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fecha
                        </label>
                        <input
                          id={`fecha-disp-${index}`}
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={item.fecha}
                          onChange={(e) => {
                            const newFechas = [...nuevaOfertaForm.fechasDisponibles];
                            newFechas[index].fecha = e.target.value;
                            setNuevaOfertaForm(prev => ({ ...prev, fechasDisponibles: newFechas }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label htmlFor={`horario-disp-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Horario
                        </label>
                        <select
                          id={`horario-disp-${index}`}
                          value={item.horario}
                          onChange={(e) => {
                            const newFechas = [...nuevaOfertaForm.fechasDisponibles];
                            newFechas[index].horario = e.target.value;
                            setNuevaOfertaForm(prev => ({ ...prev, fechasDisponibles: newFechas }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        {index === nuevaOfertaForm.fechasDisponibles.length - 1 && nuevaOfertaForm.fechasDisponibles.length < 4 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNuevaOfertaForm(prev => ({
                                ...prev,
                                fechasDisponibles: [...prev.fechasDisponibles, { fecha: '', horario: HORARIOS[0] }]
                              }));
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Agregar fecha"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        )}
                        {nuevaOfertaForm.fechasDisponibles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newFechas = nuevaOfertaForm.fechasDisponibles.filter((_, i) => i !== index);
                              setNuevaOfertaForm(prev => ({ ...prev, fechasDisponibles: newFechas }));
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar fecha"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {ofertaEditandoId ? 'Actualizando...' : 'Publicando...'}
                    </>
                  ) : (
                    ofertaEditandoId ? 'Actualizar Oferta' : 'Publicar Oferta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TODO: Hasta aca */}

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
                {solicitudEditandoId ? `Editar Solicitud Directa de Cambio` : 'Nueva Solicitud Directa de Cambio'}
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
                      {solicitudDirectaForm.fechaSolicitante && (
                        <span className={`text-xs ml-2 px-2 py-1 rounded ${solicitudDirectaForm.fechaSolicitante && user &&
                          esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaSolicitante + 'T00:00:00'), user.grupoTurno)
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          Grupo {calcularGrupoTrabaja(new Date(solicitudDirectaForm.fechaSolicitante + 'T00:00:00'))}
                          {user && esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaSolicitante + 'T00:00:00'), user.grupoTurno) ? ' ✓' : ' ✗'}
                        </span>
                      )}
                    </label>
                    <CustomDatePicker
                      id="fecha-solicitante"
                      value={solicitudDirectaForm.fechaSolicitante}
                      onChange={(fechaStr) => {
                        setSolicitudDirectaForm(prev => ({ ...prev, fechaSolicitante: fechaStr }));
                      }}
                      onValidate={(fechaObj) => {
                        // Validar que la fecha ofrecida sea del grupo del usuario
                        if (solicitudDirectaForm.fechaSolicitante && user) {
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
                      minDate={new Date()}
                      companeroSeleccionado={user}
                      esFechaValidaParaGrupo={esFechaValidaParaGrupo}
                      setFormError={setFormError}
                      formError={formError}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${solicitudDirectaForm.fechaSolicitante && user &&
                        !esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaSolicitante + 'T00:00:00'), user.grupoTurno)
                        ? 'border-red-500 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    {solicitudDirectaForm.fechaSolicitante && user && (
                      <>
                        {/* Caso especial: si es ADMIN */}
                        {user.rol === "ADMINISTRADOR" ? (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Los administradores no pueden realizar ofertas ni solicitar cambios de turno.
                            Solo los inspectores y supervisores tienen acceso a esta función.
                          </p>
                        ) : (
                          /* Caso normal: validación de grupo incorrecto */
                          !esFechaValidaParaGrupo(
                            new Date(solicitudDirectaForm.fechaSolicitante + "T00:00:00"),
                            user.grupoTurno
                          ) && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Esta fecha corresponde al Grupo{" "}
                              {calcularGrupoTrabaja(
                                new Date(solicitudDirectaForm.fechaSolicitante + "T00:00:00")
                              )}
                              , pero tú eres del Grupo {user.grupoTurno}. Solo puedes ofrecer tus propios turnos.
                            </p>
                          )
                        )}
                      </>
                    )}
                    {solicitudDirectaForm.fechaSolicitante && user &&
                      esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaSolicitante + 'T00:00:00'), user.grupoTurno) && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Fecha válida (tu turno del Grupo {user.grupoTurno})
                        </p>
                      )}
                  </div>
                  <div>
                    <label htmlFor="horario-solicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Horario
                    </label>
                    <input
                      id="horario-solicitante"
                      type="text"
                      disabled
                      value={user?.horario || 'Cargando...'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tu horario actual asignado
                    </p>
                  </div>
                  <div>
                    <label htmlFor="grupo-solicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grupo
                    </label>
                    <input
                      id="grupo-solicitante"
                      type="text"
                      disabled
                      value={user?.grupoTurno ? `Grupo ${user.grupoTurno}` : 'Cargando...'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      placeholder="Se asigna automáticamente"
                    />
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
                      {solicitudDirectaForm.fechaDestinatario && companeroSeleccionado && (
                        <span className={`text-xs ml-2 px-2 py-1 rounded ${solicitudDirectaForm.fechaDestinatario && companeroSeleccionado &&
                          esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaDestinatario + 'T00:00:00'), companeroSeleccionado.grupoTurno)
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          Grupo {calcularGrupoTrabaja(new Date(solicitudDirectaForm.fechaDestinatario + 'T00:00:00'))}
                          {companeroSeleccionado && esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaDestinatario + 'T00:00:00'), companeroSeleccionado.grupoTurno) ? ' ✓' : ' ✗'}
                        </span>
                      )}
                    </label>
                    <CustomDatePicker
                      id="fecha-destinatario"
                      value={solicitudDirectaForm.fechaDestinatario}
                      onChange={(fechaStr) => {
                        setSolicitudDirectaForm(prev => ({ ...prev, fechaDestinatario: fechaStr }));
                      }}
                      onValidate={(fechaObj) => {
                        // Validar que la fecha corresponda al grupo del compañero destinatario
                        if (solicitudDirectaForm.fechaDestinatario && companeroSeleccionado) {
                          if (!esFechaValidaParaGrupo(fechaObj, companeroSeleccionado.grupoTurno)) {
                            setFormError(`La fecha seleccionada no corresponde al Grupo ${companeroSeleccionado.grupoTurno} de ${companeroSeleccionado.nombre}. Solo puedes solicitar turnos de su grupo.`);
                          } else {
                            // Limpiar error solo si no hay otros errores
                            if (formError.includes('no corresponde al Grupo')) {
                              setFormError('');
                            }
                          }
                        }
                      }}
                      minDate={new Date()}
                      companeroSeleccionado={companeroSeleccionado}
                      esFechaValidaParaGrupo={esFechaValidaParaGrupo}
                      setFormError={setFormError}
                      formError={formError}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${solicitudDirectaForm.fechaDestinatario && companeroSeleccionado &&
                        !esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaDestinatario + 'T00:00:00'), companeroSeleccionado.grupoTurno)
                        ? 'border-red-500 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    {solicitudDirectaForm.fechaDestinatario && companeroSeleccionado &&
                      !esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaDestinatario + 'T00:00:00'), companeroSeleccionado.grupoTurno) && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Esta fecha corresponde al Grupo {calcularGrupoTrabaja(new Date(solicitudDirectaForm.fechaDestinatario + 'T00:00:00'))}, pero {companeroSeleccionado.nombre} es del Grupo {companeroSeleccionado.grupoTurno}. Solo puedes solicitar turnos de su grupo.
                        </p>
                      )}
                    {solicitudDirectaForm.fechaDestinatario && companeroSeleccionado &&
                      esFechaValidaParaGrupo(new Date(solicitudDirectaForm.fechaDestinatario + 'T00:00:00'), companeroSeleccionado.grupoTurno) && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Fecha válida (turno del Grupo {companeroSeleccionado.grupoTurno} de {companeroSeleccionado.nombre})
                        </p>
                      )}
                  </div>
                  <div>
                    <label htmlFor="horario-destinatario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Horario
                    </label>
                    <input       /* TODO: revisar logica de horario ofertante */
                      id="horario-destinatario"
                      type="text"
                      disabled
                      value={solicitudDirectaForm.horarioDestinatario || 'Selecciona un compañero'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      placeholder="Se asigna automáticamente"
                    />
                    {companeroSeleccionado && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Horario habitual: {companeroSeleccionado.horario}
                      </p>
                    )}
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
                {!solicitudEditandoId &&
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                }
                <button
                  type="submit"
                  disabled={isSubmitting || !solicitudDirectaForm.destinatarioId}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {solicitudEditandoId ? 'Actualizando...' : 'Publicando...'}
                    </>
                  ) : (
                    solicitudEditandoId ? 'Actualizar solicitud' : 'Publicar solicitud'
                  )}
                </button>
              </div>

            </form>

          </div>


        </div>
      )}
      <ModalConsultarSolicitudes
        isOpen={isConsultarModalOpen}
        onClose={() => setIsConsultarModalOpen(false)}
      />

    </div>

  );

}
