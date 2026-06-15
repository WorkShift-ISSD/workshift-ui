import useSWR from 'swr';
import { fetcher } from '@/app/api/fetcher';
import { endpoints } from '@/app/api/endpoints';

interface TurnoEfectivo {
    id: string;
    fecha: string;
    horario_original: string;
    horario_efectivo: string;
    grupo_original: string;
    grupo_efectivo: string;
    tipo_cambio: string;
    estado: string;
}

interface TurnosEfectivosData {
    ganados: TurnoEfectivo[];
    cedidos: TurnoEfectivo[];
}

export function useTurnosEfectivos() {
    const { data, error, isLoading } = useSWR<TurnosEfectivosData>(
        endpoints.turnosEfectivos.list(),
        fetcher
    );

    return {
        turnosEfectivos: data?.ganados || [],
        cedidosCompletos: data?.cedidos || [],
        fechasCedidas: (data?.cedidos || []).map((t: TurnoEfectivo) => t.fecha),
        isLoading,
        error,
    };
}