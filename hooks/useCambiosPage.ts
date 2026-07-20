'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/app/context/AuthContext';
import { useOfertas, NuevaOfertaForm, Oferta } from '@/hooks/useOfertas';
import { useSolicitudesDirectas, SolicitudDirectaForm } from '@/hooks/useSolicitudesDirectas';
import { useConversaciones } from '@/hooks/useConversaciones';
import type { SolicitudDirecta } from '@/app/api/types';
import { calcularGrupoTrabaja } from '@/app/lib/turnosUtils';
import { useTurnosEfectivos } from '@/hooks/useTurnosEfectivos';
import { endpoints } from '@/app/api/endpoints';

type ModalTipo = 'solicitud-directa' | 'nueva-oferta' | null;
export type MainTab = 'mis-solicitudes' | 'historico' | 'recibidas' | 'ofertas-disponibles';

export function useCambiosPage() {
    const { user } = useAuth();

    const {
        ofertas,
        agregarOferta,
        actualizarEstado: actualizarEstadoOferta,
        refetch,
    } = useOfertas();

    const [modalSeleccionarFechaRango, setModalSeleccionarFechaRango] = useState(false);
    const [fechasRangoDisponibles, setFechasRangoDisponibles] = useState<{ fecha: string; grupoTurno: string }[]>([]);

    const {
        solicitudes: solicitudesDirectas,
        agregarSolicitud,
        actualizarEstado,
        actualizarSolicitud,
    } = useSolicitudesDirectas();

    const { conversaciones, recargar: recargarConversaciones } = useConversaciones();

    // Estados UI
    const [activeModal, setActiveModal] = useState<ModalTipo>(null);
    const [activeTab, setActiveTab] = useState<MainTab>('mis-solicitudes');
    const [isConsultarOpen, setIsConsultarOpen] = useState(false);
    const [modalSeleccionarTurno, setModalSeleccionarTurno] = useState(false);
    const [ofertaParaSeleccionar, setOfertaParaSeleccionar] = useState<Oferta | null>(null);
    const [ofertaChatId, setOfertaChatId] = useState<string | null>(null);
    const turnoSeleccionadoChatRef = useRef<{ fecha: string; horario: string } | null>(null);
    const { turnosEfectivos, fechasCedidas } = useTurnosEfectivos();
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
        () => {
            const resultado = ofertas.filter(o => o.ofertante?.id === user?.id && ['DISPONIBLE', 'EXPIRADO'].includes(o.estado));
            console.log('misOfertas:', resultado, 'user?.id:', user?.id, 'ofertas total:', ofertas.length);
            return resultado;
        },
        [ofertas, user?.id]
    );

    // Un día cedido ya no es "tuyo": no contás como trabajando ese día
    const trabajaEnFecha = useCallback((fecha: string): boolean => {
        if (fechasCedidas.includes(fecha)) return false;
        const grupo = calcularGrupoTrabaja(new Date(fecha + 'T00:00:00'));
        return grupo === user?.grupoTurno || !!turnosEfectivos?.find((te: any) => te.fecha === fecha);
    }, [user?.grupoTurno, turnosEfectivos, fechasCedidas]);

    const ofertasDisponibles = useMemo(() => {
        if (!user) return [];
        return ofertas.filter(o => {
            if (o.ofertante?.id === user.id) return false;
            if (o.estado !== 'DISPONIBLE') return false;
            if (o.ofertante?.rol !== user.rol) return false;

            if (o.modalidadBusqueda === 'ABIERTO') {
                if (o.fechaDesde && o.fechaHasta) {
                    const desde = new Date((o.fechaDesde as string).split('T')[0] + 'T00:00:00');
                    const hasta = new Date((o.fechaHasta as string).split('T')[0] + 'T00:00:00');
                    for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
                        const fecha = d.toISOString().split('T')[0];
                        const trabaja = trabajaEnFecha(fecha);
                        if (o.tipo === 'OFREZCO') {
                            if (trabaja) return true;
                        } else {
                            if (!trabaja) return true;
                        }
                    }
                    return false;
                }
                if ((o.fechasDisponibles?.length ?? 0) > 0) {
                    return o.fechasDisponibles!.some((f: any) => {
                        const trabaja = trabajaEnFecha(f.fecha);
                        const turnoEfectivo = turnosEfectivos?.find((te: any) => te.fecha === f.fecha);
                        const horarioUsuario = turnoEfectivo?.horario_efectivo || user.horario;
                        if (o.tipo === 'OFREZCO') {
                            const horarioOk = !f.horario || f.horario === 'A convenir' || f.horario === horarioUsuario;
                            return trabaja && horarioOk;
                        } else {
                            return !trabaja;
                        }
                    });
                }
            }

            if (o.modalidadBusqueda === 'INTERCAMBIO') {
                if (o.tipo === 'OFREZCO') {
                    if (o.fechaDesde && o.fechaHasta) {
                        const desde = new Date((o.fechaDesde as string).split('T')[0] + 'T00:00:00');
                        const hasta = new Date((o.fechaHasta as string).split('T')[0] + 'T00:00:00');
                        for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
                            const fecha = d.toISOString().split('T')[0];
                            const trabaja = trabajaEnFecha(fecha);
                            const turnoEfectivo = turnosEfectivos?.find((te: any) => te.fecha === fecha);
                            const horarioOferta = o.horarioRango || 'A convenir';
                            const horarioUsuario = turnoEfectivo?.horario_efectivo || user.horario;
                            if (trabaja && (horarioOferta === 'A convenir' || horarioOferta === horarioUsuario)) return true;
                        }
                        return false;
                    }
                    const fechaQueOfrece = o.turnosBusca?.[0]?.fecha;
                    if (!fechaQueOfrece) return true;
                    const turnoEfectivoFecha = turnosEfectivos?.find((te: any) => te.fecha === fechaQueOfrece);
                    const horarioFecha = o.turnosBusca?.[0]?.horario;
                    const horarioUsuarioFecha = turnoEfectivoFecha?.horario_efectivo || user.horario;
                    const horarioFechaOk = !horarioFecha || horarioFecha === 'A convenir' || horarioFecha === horarioUsuarioFecha;
                    return trabajaEnFecha(fechaQueOfrece) && horarioFechaOk;
                } else {
                    const fechaNecesita = o.turnosBusca?.[0]?.fecha;
                    if (!fechaNecesita) return true;
                    const fechaACambio = o.fechasDisponibles?.[0]?.fecha;
                    // Mismo día = intercambio de horario: el usuario tiene que trabajar ese día
                    // Distinto día = intercambio normal: el usuario NO tiene que trabajar fechaNecesita
                    const mismoDia = fechaACambio && fechaNecesita === fechaACambio;
                    const condicionDia = mismoDia
                        ? trabajaEnFecha(fechaNecesita)
                        : !trabajaEnFecha(fechaNecesita);
                    if (!fechaACambio) return condicionDia;
                    const turnoEfectivoACambio = turnosEfectivos?.find((te: any) => te.fecha === fechaACambio);
                    const horarioACambio = o.fechasDisponibles?.[0]?.horario;
                    const horarioUsuarioACambio = turnoEfectivoACambio?.horario_efectivo || user.horario;
                    const horarioACambioOk = !horarioACambio || horarioACambio === 'A convenir' || horarioACambio === horarioUsuarioACambio;
                    return condicionDia && horarioACambioOk;
                }
            }

            return true;
        });
    }, [ofertas, user, turnosEfectivos, fechasCedidas, trabajaEnFecha]);

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
        const modalidadBusqueda = oferta.modalidadBusqueda ?? 'INTERCAMBIO';
        const tieneRango = !!(oferta.fechaDesde && oferta.fechaHasta);
        const fechaDesdeStr = tieneRango ? (oferta.fechaDesde as string).split('T')[0] : '';
        const fechaHastaStr = tieneRango ? (oferta.fechaHasta as string).split('T')[0] : '';
        const horarioRango = oferta.horarioRango || 'A convenir';

        // OFREZCO_INTERCAMBIO con rango → rangoBusca ("turno que me ofrezco a hacer")
        // Resto con rango → rangoDisponibles
        const usaRangoBusca = tieneRango && oferta.tipo === 'OFREZCO' && modalidadBusqueda === 'INTERCAMBIO';
        const usaRangoDisponibles = tieneRango && !usaRangoBusca;

        setOfertaEditando({
            id: oferta.id,
            form: {
                tipo: oferta.tipo,
                modalidadBusqueda,
                fechaOfrece: oferta.turnoOfrece?.fecha || '',
                horarioOfrece: oferta.turnoOfrece?.horario || '',
                grupoOfrece: oferta.turnoOfrece?.grupoTurno ?? 'A',
                descripcion: oferta.descripcion || '',
                prioridad: oferta.prioridad,
                fechasBusca: oferta.turnosBusca?.length ? oferta.turnosBusca : [{ fecha: '', horario: '' }],
                fechasDisponibles: oferta.fechasDisponibles?.length ? oferta.fechasDisponibles : [{ fecha: '', horario: '' }],
                usaRangoDisponibles,
                rangoDisponibles: usaRangoDisponibles
                    ? { desde: fechaDesdeStr, hasta: fechaHastaStr, horario: horarioRango }
                    : { desde: '', hasta: '', horario: 'A convenir' },
                usaRangoBusca,
                rangoBusca: usaRangoBusca
                    ? { desde: fechaDesdeStr, hasta: fechaHastaStr, horario: horarioRango }
                    : { desde: '', hasta: '', horario: 'A convenir' },
                fechaDesde: fechaDesdeStr,
                fechaHasta: fechaHastaStr,
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
                        contenido: esCobertura
                            ? `Hola, me interesa cubrir tu turno del ${turnoSeleccionado.fecha || ''}`
                            : `Hola, me interesa tu oferta de intercambio del ${turnoSeleccionado.fecha || ''}`,
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
        const tieneRango = oferta.fechaDesde && oferta.fechaHasta;

        // Si tiene rango, calcular días válidos y abrir modal
        if (tieneRango) {
            const desde = new Date((oferta.fechaDesde as string).split('T')[0] + 'T00:00:00');
            const hasta = new Date((oferta.fechaHasta as string).split('T')[0] + 'T00:00:00');
            const diasValidos: { fecha: string; grupoTurno: string }[] = [];
            const fechasYaAcordadas = oferta.fechasAcordadas?.map((fa: any) => fa.fecha.split('T')[0]) || [];

            for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
                const fecha = d.toISOString().split('T')[0];

                // Excluir fechas ya acordadas
                if (fechasYaAcordadas.includes(fecha)) continue;
                const grupo = calcularGrupoTrabaja(new Date(fecha + 'T00:00:00'));
                const trabajaEseDia = trabajaEnFecha(fecha);

                if (esCobertura && oferta.tipo === 'OFREZCO') {
                    // OFREZCO_COBERTURA: interesado elige día suyo que quiere que le cubran (cedido = ya no es suyo)
                    if (trabajaEseDia) diasValidos.push({ fecha, grupoTurno: grupo });
                } else if (!esCobertura && oferta.tipo === 'OFREZCO') {
                    // OFREZCO_INTERCAMBIO: interesado elige día suyo para que el ofertante lo cubra
                    if (trabajaEseDia) diasValidos.push({ fecha, grupoTurno: grupo });
                } else if (!esCobertura && oferta.tipo === 'BUSCO') {
                    // BUSCO_INTERCAMBIO: interesado elige un día suyo para dárselo al ofertante
                    if (trabajaEseDia) diasValidos.push({ fecha, grupoTurno: grupo });
                }
            }

            setFechasRangoDisponibles(diasValidos);
            setOfertaParaSeleccionar(oferta);
            setModalSeleccionarFechaRango(true);
            return;
        }

        // Sin rango • lógica existente
        const tieneMultiples = esCobertura
            ? (oferta.fechasDisponibles?.length ?? 0) > 1
            : (oferta.turnosBusca?.length ?? 0) > 1;

        if (tieneMultiples) {
            turnoSeleccionadoChatRef.current = null;
            setOfertaParaSeleccionar(oferta);
            setModalSeleccionarTurno(true);
            return;
        }

        const fechaDirecta = esCobertura
            ? oferta.fechasDisponibles?.[0]?.fecha
            : oferta.turnosBusca?.[0]?.fecha;

        turnoSeleccionadoChatRef.current = null;
        setOfertaChatId(null);
        await fetch('/api/mensajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ofertaId: id,
                receptorId: oferta.ofertante.id,
                contenido: `Hola, me interesa tu oferta del ${fechaDirecta || ''}`,
            }),
        });
        setOfertaChatId(id);
    }, [ofertas, user, turnosEfectivos]);


    const handleCancelarAutorizacion = useCallback(async (autorizacionId: string) => {
        const res = await fetch(endpoints.autorizaciones.cancelar(autorizacionId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Error al cancelar');
        }
        toast.success('Solicitud cancelada');
        await refetch();
    }, [refetch]);

    const handleConfirmarFechaRango = useCallback(async (fecha: string, horario: string) => {
        if (!ofertaParaSeleccionar || !user) return;
        setModalSeleccionarFechaRango(false);
        const ofertaId = ofertaParaSeleccionar.id;
        const receptorId = ofertaParaSeleccionar.ofertante.id;
        setOfertaParaSeleccionar(null);
        await fetch('/api/mensajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ofertaId: ofertaId,
                receptorId: receptorId,
                contenido: `Hola, me interesa tu oferta. Me gustaría ir el ${fecha} en horario ${horario}`,
            }),
        });
        setOfertaChatId(ofertaId);
    }, [ofertaParaSeleccionar, user]);

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
        modalSeleccionarFechaRango, setModalSeleccionarFechaRango,
        fechasRangoDisponibles,
        ofertaParaSeleccionar, setOfertaParaSeleccionar,
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
        handleConfirmarFechaRango,
        handleCancelarAutorizacion,
        actualizarEstadoOferta,
        actualizarEstado,
        recargarConversaciones,
    };
}