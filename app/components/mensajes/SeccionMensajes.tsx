'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useConversaciones } from '@/hooks/useConversaciones';
import { useAuth } from '@/app/context/AuthContext';
import Pusher from 'pusher-js';
import { ChatCard } from './ChatCards';
import { ModalConfirmarFechas } from './ModalConfirmarFechas';
import { apiClient } from '@/app/lib/apiclient';

interface Mensaje {
    id: string;
    contenido: string;
    leido: boolean;
    created_at: string;
    emisor: {
        id: string;
        nombre: string;
        apellido: string;
    };
}

type TabMensajes = 'activos' | 'cerrados';

const ITEMS_POR_PAGINA = 5;

interface Props {
    ofertaAbrirId?: string | null;
    onChatAbierto?: () => void;
    onMensajesLeidos?: () => void;
    onNuevoMensaje?: () => void;
}

export function SeccionMensajes({ ofertaAbrirId, onChatAbierto, onMensajesLeidos, onNuevoMensaje }: Props) {
    const { user } = useAuth();
    const { conversaciones, isLoading, recargar } = useConversaciones();

    const [tabActivo, setTabActivo] = useState<TabMensajes>('activos');
    const [pagina, setPagina] = useState(1);
    const [chatAbierto, setChatAbierto] = useState<string | null>(null);
    const [chatAbiertoOfertaId, setChatAbiertoOfertaId] = useState<string | null>(null);
    const [chatAbiertoOtroId, setChatAbiertoOtroId] = useState<string | null>(null);
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [loadingMensajes, setLoadingMensajes] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const mensajesEndRef = useRef<HTMLDivElement>(null);
    const recargarRef = useRef(recargar);
    const conversacionesRef = useRef(conversaciones);
    const pendingOfertaAbrirRef = useRef<string | null>(null);

    const [modalConfirmarFechas, setModalConfirmarFechas] = useState(false);
    const [pendienteAceptar, setPendienteAceptar] = useState<{
        turnoParaEnviar: { fecha: string; horario: string } | null;
        conv: any;
    } | null>(null);

    useEffect(() => { conversacionesRef.current = conversaciones; }, [conversaciones]);
    useEffect(() => { recargarRef.current = recargar; }, [recargar]);

    const conversacionesFiltradas = conversaciones
    .filter(c =>
        tabActivo === 'activos'
            ? c.conversacionEstado === 'ACTIVA'
            : c.conversacionEstado !== 'ACTIVA'
    )
    .sort((a, b) => new Date(b.ultimoMensajeAt).getTime() - new Date(a.ultimoMensajeAt).getTime());

    const totalPaginas = Math.ceil(conversacionesFiltradas.length / ITEMS_POR_PAGINA);
    const conversacionesPaginadas = conversacionesFiltradas.slice(
        (pagina - 1) * ITEMS_POR_PAGINA,
        pagina * ITEMS_POR_PAGINA
    );

    const totalSinLeer = conversaciones.reduce((acc, c) => acc + c.sinLeer, 0);

    const cargarMensajes = useCallback(async (ofertaId: string, otroId: string) => {
        setLoadingMensajes(true);
        try {
            const res = await apiClient.get<any>(`/mensajes?ofertaId=${ofertaId}&otroId=${otroId}`);
            setMensajes(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error('Error cargando mensajes:', err);
        } finally {
            setLoadingMensajes(false);
        }
    }, []);

    const toggleChat = useCallback((convId: string, ofertaId: string, otroId: string) => {
        if (chatAbierto === convId) {
            setChatAbierto(null);
            setChatAbiertoOfertaId(null);
            setChatAbiertoOtroId(null);
            setMensajes([]);
        } else {
            setChatAbierto(convId);
            setChatAbiertoOfertaId(ofertaId);
            setChatAbiertoOtroId(otroId);
            cargarMensajes(ofertaId, otroId);
        }
    }, [chatAbierto, cargarMensajes]);

    useEffect(() => {
        if (ofertaAbrirId) {
            pendingOfertaAbrirRef.current = ofertaAbrirId;
            setTabActivo('activos');
            recargar();
            onChatAbierto?.();
            document.getElementById('seccion-mensajes')?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [ofertaAbrirId]);

    useEffect(() => {
        if (!pendingOfertaAbrirRef.current) return;
        const conv = conversaciones.find(c => c.ofertaId === pendingOfertaAbrirRef.current);
        if (conv) {
            setChatAbierto(conv.id);
            setChatAbiertoOfertaId(conv.ofertaId);
            setChatAbiertoOtroId(conv.otroParticipante.id);
            cargarMensajes(conv.ofertaId, conv.otroParticipante.id);
            pendingOfertaAbrirRef.current = null;
        }
    }, [conversaciones]);

    useEffect(() => {
        if (!chatAbiertoOfertaId || !chatAbiertoOtroId || !user?.id) return;

        const participantes = [user.id, chatAbiertoOtroId].sort().join('-');
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe(`conv-${chatAbiertoOfertaId}-${participantes}`);
        channel.bind('nuevo-mensaje', (data: Mensaje) => {
            setMensajes(prev => [...prev, data]);
            recargarRef.current();
            onNuevoMensaje?.();
        });
        channel.bind('mensajes-leidos', () => {
            setMensajes(prev => prev.map(m => ({ ...m, leido: true })));
            recargarRef.current();
            onMensajesLeidos?.();
        });

        return () => {
            try { channel.unbind_all(); } catch (e) { }
            try { pusher.unsubscribe(`conv-${chatAbiertoOfertaId}-${participantes}`); } catch (e) { }
            try { pusher.disconnect(); } catch (e) { }
        };
    }, [chatAbiertoOfertaId, chatAbiertoOtroId, user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe(`usuario-${user.id}`);
        channel.bind('nuevo-mensaje', () => {
            recargarRef.current();
            onNuevoMensaje?.();
        });
        channel.bind('oferta-completada', () => recargarRef.current());
        channel.bind('conversacion-actualizada', () => recargarRef.current());

        return () => {
            try { channel.unbind_all(); } catch (e) { }
            try { pusher.unsubscribe(`usuario-${user.id}`); } catch (e) { }
            try { pusher.disconnect(); } catch (e) { }
        };
    }, [user?.id]);

    useEffect(() => {
        mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    const handleEnviar = async () => {
        if (!texto.trim() || !chatAbierto || !chatAbiertoOfertaId || !user) return;
        const conversacion = conversaciones.find(c => c.id === chatAbierto);
        if (!conversacion) return;

        setEnviando(true);
        try {
            await apiClient.post('/mensajes', {
                ofertaId: chatAbiertoOfertaId,
                receptorId: conversacion.otroParticipante.id,
                contenido: texto.trim(),
            });
            setTexto('');
        } catch (err) {
            console.error('Error enviando mensaje:', err);
        } finally {
            setEnviando(false);
        }
    };

    const aceptarPropuesta = async (conv: any, turnoParaEnviar: any, cancelarOferta: boolean) => {
        const res = await apiClient.post<any>(`/ofertas/${conv.ofertaId}/tomar`, {
            tomadorId: conv.otroParticipante.id,
            turnoSeleccionado: turnoParaEnviar,
            cancelarOferta,
        });
        if (res.ok) {
            await recargar();
        } else {
            const data = await res.json();
            alert(data.error || 'Error al aceptar');
        }
    };

    const handleAceptar = (conv: any, turnoParaEnviar: { fecha: string; horario: string } | null) => {
        const tieneMultiplesFechas = (conv.fechasDisponibles?.length ?? 0) > 1;
        const esRango = conv.fechaDesde && conv.fechaHasta;
        const esOfrezcoCoberturaConMas = conv.ofertaTipo === 'OFREZCO' && conv.modalidadBusqueda === 'ABIERTO';

        if ((tieneMultiplesFechas || esRango) && esOfrezcoCoberturaConMas) {
            setPendienteAceptar({ turnoParaEnviar, conv });
            setModalConfirmarFechas(true);
        } else {
            aceptarPropuesta(conv, turnoParaEnviar, true);
        }
    };

    const handleRechazar = async (conv: any) => {
        const res = await apiClient.patch<any>(`/ofertas/${conv.ofertaId}`, { estado: 'CANCELADO' });
        if (res.ok) await recargar();
    };

    return (
        <div id="seccion-mensajes" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Mensajes</h2>
                    {totalSinLeer > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs font-medium">
                            {totalSinLeer}
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 flex">
                {(['activos', 'cerrados'] as TabMensajes[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setTabActivo(tab);
                            setPagina(1);
                            setChatAbierto(null);
                            setChatAbiertoOfertaId(null);
                            if (tab === 'cerrados') {
                                apiClient.patch('/mensajes/conversaciones', {
                                    credentials: 'include',
                                }).then(async () => await recargar());
                            }
                        }}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${tabActivo === tab
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        {tab === 'activos' ? 'Activos' : (
                            <span className="flex items-center gap-1 justify-center">
                                Cerrados
                                {conversaciones.filter(c => c.conversacionEstado !== 'ACTIVA' && !c.visto).length > 0 && (
                                    <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                                )}
                            </span>
                        )}
                        {tabActivo === tab && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                        )}
                    </button>
                ))}
            </div>

            <div className="p-4 space-y-3">
                {isLoading ? (
                    <p className="text-center text-sm text-gray-400 py-6">Cargando...</p>
                ) : conversacionesPaginadas.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {tabActivo === 'activos' ? 'No tenés conversaciones activas' : 'No tenés conversaciones cerradas'}
                        </p>
                    </div>
                ) : (
                    conversacionesPaginadas.map(conv => (
                        <ChatCard
                            key={conv.id}
                            conv={conv}
                            isOpen={chatAbierto === conv.id}
                            userId={user?.id ?? ''}
                            mensajes={chatAbierto === conv.id ? mensajes : []}
                            loadingMensajes={chatAbierto === conv.id ? loadingMensajes : false}
                            texto={chatAbierto === conv.id ? texto : ''}
                            enviando={enviando}
                            onToggle={() => toggleChat(conv.id, conv.ofertaId, conv.otroParticipante.id)}
                            onTextoChange={setTexto}
                            onEnviar={handleEnviar}
                            onAceptar={(turno) => handleAceptar(conv, turno)}
                            onRechazar={() => handleRechazar(conv)}
                            mensajesEndRef={mensajesEndRef}
                        />
                    ))
                )}

                {totalPaginas > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{pagina} / {totalPaginas}</span>
                        <button
                            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                            disabled={pagina === totalPaginas}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                )}

                {modalConfirmarFechas && pendienteAceptar && (
                    <ModalConfirmarFechas
                        onMantener={async () => {
                            setModalConfirmarFechas(false);
                            await aceptarPropuesta(pendienteAceptar.conv, pendienteAceptar.turnoParaEnviar, false);
                            setPendienteAceptar(null);
                        }}
                        onCerrar={async () => {
                            setModalConfirmarFechas(false);
                            await aceptarPropuesta(pendienteAceptar.conv, pendienteAceptar.turnoParaEnviar, true);
                            setPendienteAceptar(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}