'use client';

import { useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Send, Check, CheckCheck } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';

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

interface Conversacion {
    id: string;
    ofertaId: string;
    ofertanteId: string;
    conversacionEstado: string;
    turnoOfrece: { fecha: string; horario: string } | null;
    fechasDisponibles: { fecha: string; horario: string }[] | null;
    ultimoMensaje: string;
    ultimoMensajeAt: string;
    sinLeer: number;
    visto: boolean;
    ultimoMensajeMioLeido: boolean | null;
    otroParticipante: {
        id: string;
        nombre: string;
        apellido: string;
        ultimoLogin: string | null;
    };
}

interface Props {
    conv: Conversacion;
    isOpen: boolean;
    userId: string;
    mensajes: Mensaje[];
    loadingMensajes: boolean;
    texto: string;
    enviando: boolean;
    onToggle: () => void;
    onTextoChange: (v: string) => void;
    onEnviar: () => void;
    onAceptar: (turnoParaEnviar: { fecha: string; horario: string } | null) => void;
    onRechazar: () => void;
    mensajesEndRef: React.RefObject<HTMLDivElement | null>;
}

function estaEnLinea(ultimoLogin: string | null): boolean {
    if (!ultimoLogin) return false;
    const diff = Date.now() - new Date(ultimoLogin).getTime();
    return Math.floor(diff / 60000) < 5;
}

export function ChatCard({
    conv,
    isOpen,
    userId,
    mensajes,
    loadingMensajes,
    texto,
    enviando,
    onToggle,
    onTextoChange,
    onEnviar,
    onAceptar,
    onRechazar,
    mensajesEndRef,
}: Props) {
    const { formatTimeAgo } = useFormatters();
    const soyElOfertante = conv.ofertanteId === userId;

    const calcularTurnoParaEnviar = () => {
        // Buscar fecha en el mensaje del interesado
        const mensajeInteresado = mensajes.find(m => m.emisor.id !== conv.ofertanteId);
        const fechaDelMensaje = mensajeInteresado?.contenido.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        const horarioDelMensaje = mensajeInteresado?.contenido.match(/\d{2}:\d{2}-\d{2}:\d{2}/)?.[0];

        if (fechaDelMensaje) {
            // Buscar el horario en fechasDisponibles o usar el del mensaje
            const horario = conv.fechasDisponibles?.find(f => f.fecha === fechaDelMensaje)?.horario
                || horarioDelMensaje
                || conv.fechasDisponibles?.[0]?.horario
                || '';
            return { fecha: fechaDelMensaje, horario };
        }

        // Sin fecha en mensaje, usar primera fecha disponible
        return conv.fechasDisponibles?.[0]
            ? { fecha: conv.fechasDisponibles[0].fecha, horario: conv.fechasDisponibles[0].horario }
            : null;
    };

    const mensajesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [isOpen, mensajes]);


    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Card header */}
            <button
                onClick={onToggle}
                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {conv.otroParticipante.nombre[0]}{conv.otroParticipante.apellido[0]}
                </div>

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
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.ultimoMensaje}</p>
                        {conv.sinLeer > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs flex-shrink-0">
                                {conv.sinLeer}
                            </span>
                        )}
                    </div>
                    {estaEnLinea(conv.otroParticipante.ultimoLogin) && (
                        <span className="text-[10px] text-green-500">🟢 En línea</span>
                    )}
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {conv.ultimoMensajeMioLeido === true
                            ? 'Leído'
                            : conv.ultimoMensajeMioLeido === false
                                ? 'Sin leer'
                                : ''}
                    </p>
                </div>

                {isOpen
                    ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                }
            </button>

            {/* Chat expandido */}
            {isOpen && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                    {/* Info oferta */}
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
                            <p className="text-center text-xs text-gray-400 mt-8">Empezá la conversación</p>
                        ) : (
                            mensajes.map(msg => {
                                const esMio = msg.emisor.id === userId;
                                return (
                                    <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${esMio
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                                            }`}>
                                            <p>{msg.contenido}</p>
                                            <div className={`flex items-center gap-1 mt-0.5 ${esMio ? 'justify-end' : 'justify-start'}`}>
                                                <span className={`text-[10px] ${esMio ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZone: 'America/Argentina/Buenos_Aires'
                                                    })}
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

                    {/* Botones Aceptar/Rechazar */}
                    {soyElOfertante && conv.conversacionEstado === 'ACTIVA' && (
                        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            <button
                                onClick={() => onAceptar(calcularTurnoParaEnviar())}
                                className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                            >
                                Aceptar propuesta
                            </button>
                            <button
                                onClick={onRechazar}
                                className="flex-1 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Rechazar propuesta
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    {conv.conversacionEstado === 'ACTIVA' ? (
                        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            <input
                                type="text"
                                value={texto}
                                onChange={e => onTextoChange(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onEnviar()}
                                placeholder="Escribí un mensaje..."
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={onEnviar}
                                disabled={!texto.trim() || enviando}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                                {conv.conversacionEstado === 'CANCELADA'
                                    ? '❌ Esta oferta fue rechazada • la conversación está cerrada'
                                    : conv.conversacionEstado === 'ACEPTADA'
                                        ? '✅ Esta oferta fue aceptada • la conversación está cerrada'
                                        : 'Conversación cerrada'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}