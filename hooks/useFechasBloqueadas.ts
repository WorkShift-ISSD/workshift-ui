import useSWR from 'swr';
import { fetcher } from '@/app/api/fetcher';
import { endpoints } from '@/app/api/endpoints';

export function useFechasBloqueadas() {
    const { data, error, isLoading } = useSWR<string[]>(
        endpoints.fechasBloqueadas.list(),
        fetcher
    );

    return {
        fechasBloqueadas: data || [],
        isLoading,
        error,
    };
}