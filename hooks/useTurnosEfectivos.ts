import useSWR from 'swr';
import { apiClient } from '@/app/lib/apiclient';

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
        '/turnos-efectivos',
        () => apiClient.get<TurnosEfectivosData>('/turnos-efectivos')
    );

    return {
        turnosEfectivos: data?.ganados || [],
        cedidosCompletos: data?.cedidos || [],
        fechasCedidas: (data?.cedidos || []).map((t: TurnoEfectivo) => t.fecha),
        isLoading,
        error,
    };
}