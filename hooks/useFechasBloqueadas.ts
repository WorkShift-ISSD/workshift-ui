import useSWR from 'swr';
import { apiClient } from '@/app/lib/apiclient';

export function useFechasBloqueadas() {
    const { data, error, isLoading } = useSWR<string[]>(
        '/fechas-bloqueadas',
        () => apiClient.get<string[]>('/fechas-bloqueadas')
    );

    return {
        fechasBloqueadas: data || [],
        isLoading,
        error,
    };
}