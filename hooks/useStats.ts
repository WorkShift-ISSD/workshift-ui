import { apiClient } from '@/app/lib/apiclient';
import { Stats, Turno } from '@/app/api/types';
import useSWR from 'swr';

export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<Stats>(
    '/stats',
    () => apiClient.get<Stats>('/stats')
  );

  const updateStats = async (stats: Partial<Stats>) => {
    const updated = await apiClient.put<Stats>('/stats', { ...data, ...stats });
    mutate(updated, false);
    return updated;
  };

  return {
    stats: data,
    isLoading,
    error,
    updateStats,
    mutate,
  };
}