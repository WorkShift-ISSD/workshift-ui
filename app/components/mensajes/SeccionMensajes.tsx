'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Send, Check, CheckCheck } from 'lucide-react';
import { useConversaciones, Conversacion } from '@/hooks/useConversaciones';
import { useAuth } from '@/app/context/AuthContext';
import { useFormatters } from '@/hooks/useFormatters';
import Pusher from 'pusher-js';

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
}

export function SeccionMensajes({ ofertaAbrirId, onChatAbierto }: Props) {
    const { user } = useAuth();
    const { conversaciones, isLoading, recargar } = useConversaciones();
    const { formatTimeAgo } = useFormatters();

    const [tabActivo, setTabActivo] = useState<TabMensajes>('activos');
    const [pagina, setPagina] = useState(1);
    const [chatAbierto, setChatAbierto] = useState<string | null>(null); // ofertaId
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [loadingMensajes, setLoadingMensajes] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const mensajesEndRef = useRef<HTMLDivElement>(null);
    const pusherRef = useRef<Pusher | null>(null);
    const recargarRef = useRef(recargar);

useEffect(() => { recargarRef.current = recargar; }, [recargar]);



    // Filtrar conversaciones por tab
    const estadosActivos = ['DISPONIBLE', 'SOLICITADO'];
    const conversacionesFiltradas = conversaciones.filter(c =>
        tabActivo === 'activos'
            ? estadosActivos.includes(c.ofertaEstado)
            : !estadosActivos.includes(c.ofertaEstado)
    );

    // Paginación
    const totalPaginas = Math.ceil(conversacionesFiltradas.length / ITEMS_POR_PAGINA);
    const conversacionesPaginadas = conversacionesFiltradas.slice(
        (pagina - 1) * ITEMS_POR_PAGINA,
        pagina * ITEMS_POR_PAGINA
    );

    const totalSinLeer = conversaciones.reduce((acc, c) => acc + c.sinLeer, 0);

    // Cargar mensajes del chat abierto
    const cargarMensajes = useCallback(async (ofertaId: string) => {
        setLoadingMensajes(true);
        try {
            const res = await fetch(`/api/mensajes?ofertaId=${ofertaId}`, {
                credentials: 'include',
            });
            const data = await res.json();
            setMensajes(data);
        } catch (err) {
            console.error('Error cargando mensajes:', err);
        } finally {
            setLoadingMensajes(false);
        }
    }, []);

    // Abrir/cerrar chat
    const toggleChat = useCallback((ofertaId: string) => {
        if (chatAbierto === ofertaId) {
            setChatAbierto(null);
            setMensajes([]);
        } else {
            setChatAbierto(ofertaId);
            cargarMensajes(ofertaId);
        }
    }, [chatAbierto, cargarMensajes]);

    useEffect(() => {
        if (ofertaAbrirId) {
            setTabActivo('activos');
            // Pequeño delay para que el mensaje inicial ya esté en la BD
            setTimeout(async () => {
                await recargar();
                setChatAbierto(ofertaAbrirId);
                await cargarMensajes(ofertaAbrirId);
                onChatAbierto?.();
                document.getElementById('seccion-mensajes')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, [ofertaAbrirId]);

    // Pusher — escuchar nuevos mensajes en tiempo real
    useEffect(() => {
        if (!chatAbierto) return () => {
            try { channel.unbind_all(); } catch (e) { }
            try { pusher.unsubscribe(`oferta-${chatAbierto}`); } catch (e) { }
            // NO pusher.disconnect() acá
        };


        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe(`oferta-${chatAbierto}`);
        channel.bind('nuevo-mensaje', (data: Mensaje) => {
            setMensajes(prev => [...prev, data]);
            recargar(); // actualizar badge de sin leer
        });

        pusherRef.current = pusher;

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`oferta-${chatAbierto}`);
            pusher.disconnect();
        };
    }, [chatAbierto, recargar]);


    useEffect(() => {
        if (!user?.id) return;

        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        // Canal personal del usuario para notificaciones
        const channel = pusher.subscribe(`usuario-${user.id}`);
        channel.bind('nuevo-mensaje', () => {
            recargarRef.current();
        });

        return () => {
            try { channel.unbind_all(); } catch (e) { }
            try { pusher.unsubscribe(`usuario-${user.id}`); } catch (e) { }
            try { pusher.disconnect(); } catch (e) { }
        };
    }, [user?.id]);

    // Scroll al último mensaje
    useEffect(() => {
        mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    // Enviar mensaje
    const handleEnviar = async () => {
        if (!texto.trim() || !chatAbierto || !user) return;

        const conversacion = conversaciones.find(c => c.id === chatAbierto);
        if (!conversacion) return;

        setEnviando(true);
        try {
            await fetch('/api/mensajes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ofertaId: chatAbierto,
                    receptorId: conversacion.otroParticipante.id,
                    contenido: texto.trim(),
                }),
            });
            setTexto('');
        } catch (err) {
            console.error('Error enviando mensaje:', err);
        } finally {
            setEnviando(false);
        }
    };

    const formatUltimaConexion = (ultimoLogin: string | null) => {
        if (!ultimoLogin) return 'Nunca conectado';
        const diff = Date.now() - new Date(ultimoLogin).getTime();
        const minutos = Math.floor(diff / 60000);
        if (minutos < 5) return '🟢 En línea';
        if (minutos < 60) return `Visto hace ${minutos} min`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `Visto hace ${horas}h`;
        const dias = Math.floor(horas / 24);
        return `Visto hace ${dias}d`;
    };

    const conversacionAbierta = conversaciones.find(c => c.id === chatAbierto);

    return (
        <div id="seccion-mensajes" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Header de la sección */}
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

            {/* Tabs internos */}
            <div className="border-b border-gray-200 dark:border-gray-700 flex">
                {(['activos', 'cerrados'] as TabMensajes[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setTabActivo(tab); setPagina(1); setChatAbierto(null); }}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${tabActivo === tab
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        {tab === 'activos' ? 'Activos' : 'Cerrados'}
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
                        <div key={conv.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            {/* Card de conversación */}
                            <button
                                onClick={() => toggleChat(conv.id)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {conv.otroParticipante.nombre[0]}{conv.otroParticipante.apellido[0]}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {conv.otroParticipante.nombre} {conv.otroParticipante.apellido}
                                        </p>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                                            {formatTimeAgo(conv.ultimoMensajeAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {conv.ultimoMensaje}
                                        </p>
                                        {conv.sinLeer > 0 && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs flex-shrink-0">
                                                {conv.sinLeer}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                        {formatUltimaConexion(conv.otroParticipante.ultimoLogin)}
                                    </p>
                                </div>

                                {/* Chevron */}
                                {chatAbierto === conv.id
                                    ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                }
                            </button>

                            {/* Chat expandido */}
                            {chatAbierto === conv.id && (
                                <div className="border-t border-gray-200 dark:border-gray-700">
                                    {/* Info de la oferta */}
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                                        {conv.turnoOfrece
                                            ? `Oferta: ${conv.turnoOfrece.fecha} · ${conv.turnoOfrece.horario}`
                                            : conv.fechasDisponibles?.length
                                                ? `Cobertura: ${conv.fechasDisponibles.map(f => f.fecha).join(', ')}`
                                                : 'Oferta'}
                                    </div>

                                    {/* Mensajes */}
                                    <div className="h-64 overflow-y-auto p-3 space-y-2">
                                        {loadingMensajes ? (
                                            <p className="text-center text-xs text-gray-400 mt-8">Cargando mensajes...</p>
                                        ) : mensajes.length === 0 ? (
                                            <p className="text-center text-xs text-gray-400 mt-8">
                                                Empezá la conversación
                                            </p>
                                        ) : (
                                            mensajes.map(msg => {
                                                const esMio = msg.emisor.id === user?.id;
                                                return (
                                                    <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${esMio
                                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                                                            }`}>
                                                            <p>{msg.contenido}</p>
                                                            <div className={`flex items-center gap-1 mt-0.5 ${esMio ? 'justify-end' : 'justify-start'}`}>
                                                                <span className={`text-[10px] ${esMio ? 'text-blue-200' : 'text-gray-400'}`}>
                                                                    {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {esMio && (
                                                                    msg.leido
                                                                        ? <CheckCheck className="h-3 w-3 text-blue-200" />
                                                                        : <Check className="h-3 w-3 text-blue-200" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={mensajesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                                        <input
                                            type="text"
                                            value={texto}
                                            onChange={e => setTexto(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleEnviar()}
                                            placeholder="Escribí un mensaje..."
                                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={handleEnviar}
                                            disabled={!texto.trim() || enviando}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Paginación */}
                {totalPaginas > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {pagina} / {totalPaginas}
                        </span>
                        <button
                            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                            disabled={pagina === totalPaginas}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}