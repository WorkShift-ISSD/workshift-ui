import { deleter, endpoints, fetcher, poster, putter } from '@/app/lib/api/endpoints';
import { Turno, TurnosData } from '@/app/lib/api/types';
import useSWR from 'swr';

export function useTurnosData() {
  const { data, error, isLoading, mutate } = useSWR<TurnosData>(
    endpoints.turnosData.get(),
    fetcher
  );

  const updateTurnosData = async (turnosData: Partial<TurnosData>) => {
    const updated = await putter<TurnosData>(
      endpoints.turnosData.update(),
      { ...data, ...turnosData }
    );
    mutate(updated, false);
    return updated;
  };

  return {
    turnosData: data,
    isLoading,
    error,
    updateTurnosData,
    mutate,
  };
}