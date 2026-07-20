'use client';

import { Search } from 'lucide-react';
import { ToastContainer } from 'react-toastify';


import Can from '../components/Can';
import { ModalSolicitudDirecta } from '../components/cambios/ModalSolicitudDirecta';
import { ModalNuevaOferta } from '../components/cambios/ModalNuevaOferta';
import ModalConsultarSolicitudes from '../components/ModalConsultarSolicitudes';
import { ModalSeleccionarTurno } from '../components/ModalSeleccionarTurno';
import { MisSolicitudesTab } from '../components/cambios/MisSolicitudesTab';
import { OfertasDisponiblesTab } from '../components/cambios/OfertasDisponiblesTab';
import { RecibidasTab } from '../components/cambios/RecibidasTab';
import { HistoricoTab } from '../components/cambios/HistoricoTab';
import { SeccionMensajes } from '../components/mensajes/SeccionMensajes';
import { StatsBar } from '../components/cambios/StatsBar';
import { AccionesPrincipales } from '../components/cambios/AccionesPrincipales';
import { useCambiosPage } from '@/hooks/useCambiosPage';
import { ModalSeleccionarFechaRango } from '../components/mensajes/ModalSeleccionarFechaRango';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CambiosTurnosPage() {
  const {
    user,
    ofertas,
    ofertasDisponibles,
    ofertasUrgentes,
    misOfertas,
    solicitudesDirectas,
    solicitudesEnviadas,
    solicitudesRecibidas,
    totalSinLeer,
    enNegociacionComoOfertante,
    enNegociacionComoInteresado,
    activeModal, setActiveModal,
    activeTab, setActiveTab,
    isConsultarOpen, setIsConsultarOpen,
    modalSeleccionarTurno, setModalSeleccionarTurno,
    ofertaParaSeleccionar, setOfertaParaSeleccionar,
    turnoSeleccionadoChatRef,
    ofertaChatId, setOfertaChatId,
    solicitudEditando, setSolicitudEditando,
    ofertaEditando, setOfertaEditando,
    modalSeleccionarFechaRango, setModalSeleccionarFechaRango,
    fechasRangoDisponibles,
    handleConfirmarFechaRango,
    handleSubmitSolicitud,
    handleEditarSolicitud,
    handleSubmitOferta,
    handleEditarOferta,
    handleTomarOferta,
    handleConfirmarSeleccion,
    handleMeInteresa,
    handleCancelarAutorizacion,
    actualizarEstadoOferta,
    actualizarEstado,
    recargarConversaciones,
  } = useCambiosPage();

  const searchParams = useSearchParams();

    useEffect(() => {
    const tab = searchParams.get('tab');

    if (
      tab === 'mis-solicitudes' ||
      tab === 'historico' ||
      tab === 'recibidas' ||
      tab === 'ofertas-disponibles'
    ) {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  const tabs = [
    {
      id: 'mis-solicitudes' as const,
      label: 'Mis solicitudes',
      badge: misOfertas.filter(o => o.estado === 'DISPONIBLE').length + solicitudesEnviadas.filter(s => ['SOLICITADO', 'APROBADO'].includes(s.estado)).length || undefined,
    },
    { id: 'historico' as const, label: 'Histórico' },
    { id: 'recibidas' as const, label: 'Recibidas', badge: solicitudesRecibidas.length || undefined },
    { id: 'ofertas-disponibles' as const, label: 'Disponibles', badge: ofertasDisponibles.length || undefined },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ToastContainer theme="colored" position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cambios de guardia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestioná tus intercambios y solicitudes</p>
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
      <StatsBar
        totalSinLeer={totalSinLeer}
        enNegociacionComoOfertante={enNegociacionComoOfertante}
        enNegociacionComoInteresado={enNegociacionComoInteresado}
        solicitudesRecibidas={solicitudesRecibidas.length}
        misOfertas={misOfertas.length}
        ofertasDisponibles={ofertasDisponibles.length}
        ofertasUrgentes={ofertasUrgentes}
      />

      {/* Acciones principales */}
      <AccionesPrincipales
        onNuevaOferta={() => { setOfertaEditando(null); setActiveModal('nueva-oferta'); }}
        onNuevaSolicitud={() => { setSolicitudEditando(null); setActiveModal('solicitud-directa'); }}
      />

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
              onCancelarAutorizacion={handleCancelarAutorizacion}
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
                onMeInteresa={handleMeInteresa}
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
        key={ofertaEditando?.id ?? 'new'}
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
        onClose={() => { setModalSeleccionarTurno(false); }}
        onConfirmar={handleConfirmarSeleccion}
        oferta={ofertaParaSeleccionar}
      />

      <ModalSeleccionarFechaRango
        isOpen={modalSeleccionarFechaRango}
        ofertanteNombre={ofertaParaSeleccionar ? `${ofertaParaSeleccionar.ofertante.nombre} ${ofertaParaSeleccionar.ofertante.apellido}` : ''}
        fechasDisponibles={fechasRangoDisponibles}
        horarioUsuario={user?.horario || ''}
        onConfirmar={handleConfirmarFechaRango}
        onCerrar={() => { setModalSeleccionarFechaRango(false); setOfertaParaSeleccionar(null); }}
      />

      {/* Mensajes */}
      <SeccionMensajes
        onNuevoMensaje={recargarConversaciones}
        ofertaAbrirId={ofertaChatId}
        onChatAbierto={() => setOfertaChatId(null)}
        onMensajesLeidos={recargarConversaciones}
      />
    </div>
  );
}