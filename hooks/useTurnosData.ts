// hooks/useTurnosData.ts
import useSWR from 'swr';
import { apiClient } from '@/app/lib/apiclient';
import { TurnosData } from '@/app/api/types';

export function useTurnosData() {
  const { data, error, isLoading, mutate } = useSWR<TurnosData>(
    '/turnos-data',
    () => apiClient.get<TurnosData>('/turnos-data')
  );

  const updateTurnosData = async (turnosData: Partial<TurnosData>) => {
    const updated = await apiClient.put<TurnosData>('/turnos-data', { ...data, ...turnosData });
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