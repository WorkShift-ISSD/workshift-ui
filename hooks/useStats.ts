import { deleter, endpoints, fetcher, poster, putter } from '@/app/lib/api/endpoints';
import { Stats, Turno } from '@/app/lib/api/types';
import useSWR from 'swr';
export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<Stats>(
    endpoints.stats.get(),
    fetcher
  );

  const updateStats = async (stats: Partial<Stats>) => {
    const updated = await putter<Stats>(
      endpoints.stats.update(),
      { ...data, ...stats }
    );
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