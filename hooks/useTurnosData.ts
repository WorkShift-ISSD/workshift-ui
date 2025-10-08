import { endpoints } from '@/app/api/endpoints';
import { fetcher, putter } from '@/app/api/fetcher';
import { Turno, TurnosData } from '@/app/api/types';
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