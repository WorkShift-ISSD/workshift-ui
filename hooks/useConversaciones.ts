import { useState, useEffect } from 'react';
import { fetcher } from '@/app/api/fetcher';
import { endpoints } from '@/app/api/endpoints';

export interface OtroParticipante {
    id: string;
    nombre: string;
    apellido: string;
    ultimoLogin: string | null;
}

export interface Conversacion {
    id: string; // oferta_id
    ofertaEstado: string;
    ofertaTipo: string;
    modalidadBusqueda: string;
    turnoOfrece: { fecha: string; horario: string; grupoTurno: string } | null;
    fechasDisponibles: { fecha: string; horario: string }[] | null;
    ultimoMensaje: string;
    ultimoMensajeAt: string;
    sinLeer: number;
    otroParticipante: OtroParticipante;
}

export function useConversaciones() {
    const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cargar = async () => {
        setIsLoading(true);
        try {
            const data = await fetcher<Conversacion[]>(endpoints.mensajes.conversaciones());
            setConversaciones(data);
        } catch (err) {
            setError('Error al cargar conversaciones');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        cargar();
    }, []);

    return { conversaciones, isLoading, error, recargar: cargar };
}