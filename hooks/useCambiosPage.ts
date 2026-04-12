'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/app/context/AuthContext';
import { useOfertas, NuevaOfertaForm, Oferta } from '@/hooks/useOfertas';
import { useSolicitudesDirectas, SolicitudDirectaForm } from '@/hooks/useSolicitudesDirectas';
import { useConversaciones } from '@/hooks/useConversaciones';
import type { SolicitudDirecta } from '@/app/api/types';
import { useFormatters } from '@/hooks/useFormatters';

type ModalTipo = 'solicitud-directa' | 'nueva-oferta' | null;
export type MainTab = 'mis-solicitudes' | 'historico' | 'recibidas' | 'ofertas-disponibles';

export function useCambiosPage() {
    const { user } = useAuth();
    const { formatDate } = useFormatters();

    const {
        ofertas,
        stats,
        agregarOferta,
        actualizarEstado: actualizarEstadoOferta,
        refetch,
    } = useOfertas();

    const {
        solicitudes: solicitudesDirectas,
        agregarSolicitud,
        actualizarEstado,
        actualizarSolicitud,
    } = useSolicitudesDirectas();

    const { conversaciones } = useConversaciones();

    // Estados UI
    const [activeModal, setActiveModal] = useState<ModalTipo>(null);
    const [activeTab, setActiveTab] = useState<MainTab>('mis-solicitudes');
    const [isConsultarOpen, setIsConsultarOpen] = useState(false);
    const [modalSeleccionarTurno, setModalSeleccionarTurno] = useState(false);
    const [ofertaParaSeleccionar, setOfertaParaSeleccionar] = useState<Oferta | null>(null);
    const [ofertaChatId, setOfertaChatId] = useState<string | null>(null);
    const turnoSeleccionadoChatRef = useRef<{ fecha: string; horario: string } | null>(null);
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
            o => o.ofertante?.id !== user.id && o.estado === 'DISPONIBLE' && o.ofertante?.rol === user.rol
        );
    }, [ofertas, user]);

    const ofertasUrgentes = ofertasDisponibles.filter(o => o.prioridad === 'URGENTE').length;

    const solicitudesEnviadas = useMemo(
        () => solicitudesDirectas.filter(s => s.solicitante.id === user?.id),
        [solicitudesDirectas, user?.id]
    );

    const solicitudesRecibidas = useMemo(
        () => solicitudesDirectas.filter(s => s.destinatario.id === user?.id && s.estado === 'SOLICITADO'),
        [solicitudesDirectas, user?.id]
    );

    const totalSinLeer = conversaciones.reduce((acc, c) => acc + c.sinLeer, 0);
    const enNegociacionComoOfertante = conversaciones.filter(
        c => c.ofertanteId === user?.id && ['DISPONIBLE', 'SOLICITADO'].includes(c.ofertaEstado)
    ).length;
    const enNegociacionComoInteresado = conversaciones.filter(
        c => c.ofertanteId !== user?.id && ['DISPONIBLE', 'SOLICITADO'].includes(c.ofertaEstado)
    ).length;

    // Handlers solicitud directa
    const handleSubmitSolicitud = useCallback(async (form: SolicitudDirectaForm) => {
        if (solicitudEditando) {
            await actualizarSolicitud(solicitudEditando.id, form);
            toast.success('Solicitud actualizada');
        } else {
            await agregarSolicitud(form);
            toast.success('Solicitud enviada');
        }
        setSolicitudEditando(null);
    }, [solicitudEditando, actualizarSolicitud, agregarSolicitud]);

    const handleEditarSolicitud = useCallback((solicitud: SolicitudDirecta) => {
        setSolicitudEditando({
            id: solicitud.id,
            nombreDestinatario: `${solicitud.destinatario.nombre} ${solicitud.destinatario.apellido}`,
            form: {
                solicitanteId: solicitud.solicitante.id,
                destinatarioId: solicitud.destinatario.id,
                fechaSolicitante: solicitud.turnoSolicitante.fecha,
                horarioSolicitante: solicitud.turnoSolicitante.horario,
                grupoSolicitante: solicitud.turnoSolicitante.grupoTurno,
                fechaDestinatario: solicitud.turnoDestinatario?.fecha,
                horarioDestinatario: solicitud.turnoDestinatario?.horario,
                grupoDestinatario: solicitud.turnoDestinatario?.grupoTurno,
                motivo: solicitud.motivo,
                prioridad: solicitud.prioridad,
            },
        });
        setActiveModal('solicitud-directa');
    }, []);

    // Handlers oferta
    const handleSubmitOferta = useCallback(async (form: NuevaOfertaForm) => {
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
    }, [ofertaEditando, agregarOferta, refetch]);

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
                fechasBusca: oferta.turnosBusca?.length ? oferta.turnosBusca : [{ fecha: '', horario: '' }],
                fechasDisponibles: oferta.fechasDisponibles?.length ? oferta.fechasDisponibles : [{ fecha: '', horario: '' }],
            },
        });
        setActiveModal('nueva-oferta');
    }, []);

    const handleTomarOferta = useCallback(async (ofertaId: string) => {
        const oferta = ofertas.find(o => o.id === ofertaId);
        if (!oferta || !user?.id) return;

        if (oferta.turnosBusca && Array.isArray(oferta.turnosBusca) && oferta.turnosBusca.length > 1) {
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
    }, [ofertas, user?.id, refetch]);

    const handleConfirmarSeleccion = useCallback(
        async (turnoSeleccionado: { fecha: string; horario: string }) => {
            if (!ofertaParaSeleccionar || !user) return;

            setModalSeleccionarTurno(false);

            const esCobertura = ofertaParaSeleccionar.modalidadBusqueda === 'ABIERTO';

            if (esCobertura) {
                turnoSeleccionadoChatRef.current = turnoSeleccionado;
                setOfertaChatId(null);
                await fetch('/api/mensajes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        ofertaId: ofertaParaSeleccionar.id,
                        receptorId: ofertaParaSeleccionar.ofertante.id,
                        contenido: `Hola, me interesa cubrir tu turno del ${formatDate(turnoSeleccionado.fecha)}`,
                    }),
                });
                setOfertaChatId(ofertaParaSeleccionar.id);
            } else {
                // Para intercambio, tomar directamente
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
                await refetch();
            }

            setOfertaParaSeleccionar(null);
        },
        [ofertaParaSeleccionar, user, refetch]
    );

    const handleMeInteresa = useCallback(async (id: string) => {
        const oferta = ofertas.find(o => o.id === id);
        if (!oferta || !user) return;

        const esCobertura = oferta.modalidadBusqueda === 'ABIERTO';
        const tieneMultiples = esCobertura
            ? (oferta.fechasDisponibles?.length ?? 0) > 1
            : (oferta.turnosBusca?.length ?? 0) > 1;

        if (tieneMultiples) {
            turnoSeleccionadoChatRef.current = null;
            setOfertaParaSeleccionar(oferta);
            setModalSeleccionarTurno(true);
            return;
        }

        // Si hay una sola fecha, usarla directamente
        const fechaDirecta = esCobertura
            ? oferta.fechasDisponibles?.[0]?.fecha
            : oferta.turnoOfrece?.fecha;

        turnoSeleccionadoChatRef.current = null;
        setOfertaChatId(null);
        await fetch('/api/mensajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ofertaId: id,
                receptorId: oferta.ofertante.id,
                contenido: `Hola, me interesa tu oferta del ${formatDate(fechaDirecta || '')}`,
            }),
        });
        setOfertaChatId(id);
    }, [ofertas, user]);


    return {
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
        ofertaParaSeleccionar,
        ofertaChatId, setOfertaChatId,
        turnoSeleccionadoChatRef,
        solicitudEditando, setSolicitudEditando,
        ofertaEditando, setOfertaEditando,
        handleSubmitSolicitud,
        handleEditarSolicitud,
        handleSubmitOferta,
        handleEditarOferta,
        handleTomarOferta,
        handleConfirmarSeleccion,
        handleMeInteresa,
        actualizarEstadoOferta,
        actualizarEstado,
    };
}