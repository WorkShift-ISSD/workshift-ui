'use client';

import { useState, useCallback, useMemo } from 'react';
import { TrendingUp, RefreshCw, Gift, Flame, Search } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth } from '../context/AuthContext';
import { useOfertas, NuevaOfertaForm } from '@/hooks/useOfertas';
import { useSolicitudesDirectas, SolicitudDirectaForm } from '@/hooks/useSolicitudesDirectas';

import Can from '../components/Can';
import { ModalSolicitudDirecta } from '../components/cambios/ModalSolicitudDirecta';
import { ModalNuevaOferta } from '../components/cambios/ModalNuevaOferta';
import ModalConsultarSolicitudes from '../components/ModalConsultarSolicitudes';
import { ModalSeleccionarTurno } from '../components/ModalSeleccionarTurno';

import { MisSolicitudesTab } from '../components/cambios/MisSolicitudesTab';
import { OfertasDisponiblesTab } from '../components/cambios/OfertasDisponiblesTab';
import { RecibidasTab } from '../components/cambios/RecibidasTab';
import { HistoricoTab } from '../components/cambios/HistoricoTab';
import { TipoSolicitud } from '../lib/enum';
import { SeccionMensajes } from '../components/mensajes/SeccionMensajes';


import type { SolicitudDirecta } from '@/app/api/types';
import type { Oferta } from '@/hooks/useOfertas';


type ModalTipo = 'solicitud-directa' | 'nueva-oferta' | null;
type MainTab = 'mis-solicitudes' | 'historico' | 'recibidas' | 'ofertas-disponibles';

export default function CambiosTurnosPage() {
  const { user } = useAuth();

  const {
    ofertas,
    //stats, NO LO UTILIZO
    agregarOferta,
    actualizarEstado: actualizarEstadoOferta,
    eliminarOferta,
    refetch,
    isLoading: isLoadingOfertas,
    error: errorOfertas,
  } = useOfertas();

  const {
    solicitudes: solicitudesDirectas,
    agregarSolicitud,
    actualizarEstado,
    actualizarSolicitud,
    isLoading: isLoadingSolicitudes,
    error: errorSolicitudes,
  } = useSolicitudesDirectas();

  const [activeModal, setActiveModal] = useState<ModalTipo>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('mis-solicitudes');
  const [isConsultarOpen, setIsConsultarOpen] = useState(false);
  const [modalSeleccionarTurno, setModalSeleccionarTurno] = useState(false);
  const [ofertaParaSeleccionar, setOfertaParaSeleccionar] = useState<Oferta | null>(null);
  const [ofertaChatId, setOfertaChatId] = useState<string | null>(null);


  // Estado de edición
  const [solicitudEditando, setSolicitudEditando] = useState<{
    id: string;
    form: SolicitudDirectaForm;
    nombreDestinatario: string;
  } | null>(null);
  const [ofertaEditando, setOfertaEditando] = useState<{
    id: string;
    form: NuevaOfertaForm;
  } | null>(null);

  // Derived data
  const misOfertas = useMemo(
    () => ofertas.filter(o => o.ofertante?.id === user?.id && o.estado === 'DISPONIBLE'),
    [ofertas, user?.id]
  );

  const ofertasDisponibles = useMemo(() => {
    if (!user) return [];
    return ofertas.filter(
      o =>
        o.ofertante?.id !== user.id &&
        o.estado === 'DISPONIBLE' &&
        o.ofertante?.rol === user.rol
    );
  }, [ofertas, user]);

  const statsLocales = useMemo(() => {
    if (!user) return { total: 0, busco: 0, ofrezco: 0, urgentes: 0 };
    const ofertasDelRol = ofertas.filter(
      o => o.ofertante?.rol === user.rol && o.estado === 'DISPONIBLE'
    );
    return {
      total: ofertasDelRol.length,
      busco: ofertasDelRol.filter(o => o.modalidadBusqueda === 'INTERCAMBIO').length,
      ofrezco: ofertasDelRol.filter(o => o.ofertante?.id === user.id).length,
      urgentes: ofertasDelRol.filter(o => o.prioridad === 'URGENTE').length,
    };
  }, [ofertas, user]);

  const solicitudesEnviadas = useMemo(
    () => solicitudesDirectas.filter(s => s.solicitante.id === user?.id),
    [solicitudesDirectas, user?.id]
  );

  const solicitudesRecibidas = useMemo(
    () =>
      solicitudesDirectas.filter(
        s => s.destinatario.id === user?.id && s.estado === 'SOLICITADO'
      ),
    [solicitudesDirectas, user?.id]
  );

  // Handlers solicitud directa
  const handleSubmitSolicitud = useCallback(
    async (form: SolicitudDirectaForm) => {
      if (solicitudEditando) {
        await actualizarSolicitud(solicitudEditando.id, form);
        toast.success('Solicitud actualizada');
      } else {
        await agregarSolicitud(form);
        toast.success('Solicitud enviada');
      }
      setSolicitudEditando(null);
    },
    [solicitudEditando, actualizarSolicitud, agregarSolicitud]
  );

  const handleEditarSolicitud = useCallback(
    (solicitud: SolicitudDirecta) => {
      setSolicitudEditando({
        id: solicitud.id,
        nombreDestinatario: `${solicitud.destinatario.nombre} ${solicitud.destinatario.apellido}`,
        form: {
          solicitanteId: solicitud.solicitante.id,  // ← este era el que faltaba
          destinatarioId: solicitud.destinatario.id,
          fechaSolicitante: solicitud.turnoSolicitante.fecha,
          horarioSolicitante: solicitud.turnoSolicitante.horario,
          grupoSolicitante: solicitud.turnoSolicitante.grupoTurno,
          fechaDestinatario: solicitud.turnoDestinatario.fecha,
          horarioDestinatario: solicitud.turnoDestinatario.horario,
          grupoDestinatario: solicitud.turnoDestinatario.grupoTurno,
          motivo: solicitud.motivo,
          prioridad: solicitud.prioridad,
        },
      });
      setActiveModal('solicitud-directa');
    },
    []
  );

  // Handlers oferta
  const handleSubmitOferta = useCallback(
    async (form: NuevaOfertaForm) => {
      if (ofertaEditando) {
        const res = await fetch(`/api/ofertas/${ofertaEditando.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al actualizar la oferta');
        }
        await refetch();
        toast.success('Oferta actualizada');
      } else {
        await agregarOferta(form);
        toast.success('Oferta publicada');
      }
      setOfertaEditando(null);
    },
    [ofertaEditando, agregarOferta, refetch]
  );

  const handleEditarOferta = useCallback((oferta: Oferta) => {
    setOfertaEditando({
      id: oferta.id,
      form: {
        tipo: oferta.tipo,
        modalidadBusqueda: oferta.modalidadBusqueda ?? 'INTERCAMBIO',
        fechaOfrece: oferta.turnoOfrece?.fecha || '',
        horarioOfrece: oferta.turnoOfrece?.horario || '',
        grupoOfrece: oferta.turnoOfrece?.grupoTurno ?? 'A',
        descripcion: oferta.descripcion || '',
        prioridad: oferta.prioridad,
        fechasBusca: oferta.turnosBusca?.length
          ? oferta.turnosBusca
          : [{ fecha: '', horario: '' }],
        fechasDisponibles: oferta.fechasDisponibles?.length
          ? oferta.fechasDisponibles
          : [{ fecha: '', horario: '' }],
      },
    });
    setActiveModal('nueva-oferta');
  }, []);

  const handleTomarOferta = useCallback(
    async (ofertaId: string) => {
      const oferta = ofertas.find(o => o.id === ofertaId);
      if (!oferta || !user?.id) return;

      if (
        oferta.turnosBusca &&
        Array.isArray(oferta.turnosBusca) &&
        oferta.turnosBusca.length > 1
      ) {
        setOfertaParaSeleccionar(oferta);
        setModalSeleccionarTurno(true);
        return;
      }

      const res = await fetch(`/api/ofertas/${ofertaId}/tomar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tomadorId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al tomar la oferta');
      }
      toast.success('¡Oferta tomada! Pendiente de autorización del jefe.');
      await refetch();
    },
    [ofertas, user?.id, refetch]
  );

  const handleConfirmarSeleccion = useCallback(
    async (turnoSeleccionado: { fecha: string; horario: string }) => {
      if (!ofertaParaSeleccionar || !user?.id) return;
      const res = await fetch(`/api/ofertas/${ofertaParaSeleccionar.id}/tomar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tomadorId: user.id, turnoSeleccionado }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('¡Oferta tomada! Pendiente de autorización del jefe.');
      setModalSeleccionarTurno(false);
      setOfertaParaSeleccionar(null);
      await refetch();
    },
    [ofertaParaSeleccionar, user?.id, refetch]
  );

  const tabs: { id: MainTab; label: string; badge?: number; can?: string }[] = [
    {
      id: 'mis-solicitudes',
      label: 'Mis solicitudes',
      badge: misOfertas.length + solicitudesEnviadas.filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado)).length || undefined,
    },
    { id: 'historico', label: 'Histórico' },
    { id: 'recibidas', label: 'Recibidas', badge: solicitudesRecibidas.length || undefined, can: 'recibir_solicitud_directa' },
    { id: 'ofertas-disponibles', label: 'Disponibles', badge: ofertasDisponibles.length || undefined, can: 'pedir_turno' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ToastContainer theme="colored" position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cambios de guardia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestioná tus intercambios y solicitudes
          </p>
        </div>
        <button
          onClick={() => setIsConsultarOpen(true)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Movimientos anteriores
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total ofertas', value: statsLocales.total, icon: TrendingUp, color: 'blue' },
          { label: 'Intercambios', value: statsLocales.busco, icon: RefreshCw, color: 'green' },
          { label: 'Ofrezco', value: statsLocales.ofrezco, icon: Gift, color: 'purple' },
          { label: 'Urgentes', value: statsLocales.urgentes, icon: Flame, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
            </div>
            <div className={`w-9 h-9 rounded-full bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
              <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
            </div>
          </div>
        ))}
      </div>

      {/* Acciones principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Can do="ofertar_turno">
          <button
            onClick={() => { setOfertaEditando(null); setActiveModal('nueva-oferta'); }}
            className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-6 text-center transition-all group"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Gift className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Nueva oferta</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Publicá en el tablero</p>
          </button>
        </Can>

        <Can do="enviar_solicitud_directa">
          <button
            onClick={() => { setSolicitudEditando(null); setActiveModal('solicitud-directa'); }}
            className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 rounded-xl p-6 text-center transition-all group"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Solicitud de cambio de turno</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A un compañero específico</p>
          </button>
        </Can>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-max px-5 py-3.5 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  {tab.badge}
                </span>
              ) : null}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'mis-solicitudes' && (
            <MisSolicitudesTab
              misOfertas={misOfertas}
              solicitudesEnviadas={solicitudesEnviadas}
              onEditarOferta={handleEditarOferta}
              onCancelarOferta={id => actualizarEstadoOferta(id, 'CANCELADO')}
              onEditarSolicitud={handleEditarSolicitud}
              onCancelarSolicitud={id => actualizarEstado(id, 'CANCELADO')}
            />
          )}
          {activeTab === 'historico' && (
            <HistoricoTab
              ofertas={ofertas}
              solicitudesDirectas={solicitudesDirectas}
              userId={user?.id}
              onTomarOferta={handleTomarOferta}
            />
          )}
          {activeTab === 'recibidas' && (
            <Can do="recibir_solicitud_directa">
              <RecibidasTab
                solicitudesRecibidas={solicitudesRecibidas}
                onAceptar={async (id) => {
                  try {
                    await actualizarEstado(id, 'APROBADO');
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Error al aceptar la solicitud');
                  }
                }}

                onRechazar={id => actualizarEstado(id, 'CANCELADO')}
              />
            </Can>
          )}
          {activeTab === 'ofertas-disponibles' && (
            <Can do="pedir_turno">
              <OfertasDisponiblesTab
                ofertas={ofertasDisponibles}
                onMeInteresa={async (id) => {
                  const oferta = ofertas.find(o => o.id === id);
                  if (!oferta || !user) return;

                  setOfertaChatId(null); // ← resetear primero

                  await fetch('/api/mensajes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      ofertaId: id,
                      receptorId: oferta.ofertante.id,
                      contenido: `Hola, me interesa tu oferta del ${oferta.turnoOfrece?.fecha || oferta.fechasDisponibles?.[0]?.fecha || ''}`,
                    }),
                  });

                  setOfertaChatId(id);
                }}
              />
            </Can>
          )}
        </div>
      </div>

      {/* Modales */}
      <ModalSolicitudDirecta
        isOpen={activeModal === 'solicitud-directa'}
        onClose={() => { setActiveModal(null); setSolicitudEditando(null); }}
        onSubmit={handleSubmitSolicitud}
        solicitudEditando={solicitudEditando}
      />

      <ModalNuevaOferta
        isOpen={activeModal === 'nueva-oferta'}
        onClose={() => { setActiveModal(null); setOfertaEditando(null); }}
        onSubmit={handleSubmitOferta}
        ofertaEditando={ofertaEditando}
      />

      <ModalConsultarSolicitudes
        isOpen={isConsultarOpen}
        onClose={() => setIsConsultarOpen(false)}
      />

      <ModalSeleccionarTurno
        isOpen={modalSeleccionarTurno}
        onClose={() => { setModalSeleccionarTurno(false); setOfertaParaSeleccionar(null); }}
        onConfirmar={handleConfirmarSeleccion}
        oferta={ofertaParaSeleccionar}
      />

      {/* Mensajes */}
      <SeccionMensajes
        ofertaAbrirId={ofertaChatId}
        onChatAbierto={() => setOfertaChatId(null)} />

    </div>
  );
}