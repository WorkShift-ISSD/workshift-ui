import { deleter, endpoints, fetcher, poster, putter } from '@/app/lib/api/endpoints';
import { Cambio, Turno } from '@/app/lib/api/types';
import useSWR from 'swr';

export function useCambios() {
  const { data, error, isLoading, mutate } = useSWR<Cambio[]>(
    endpoints.cambios.list(),
    fetcher
  );

  const createCambio = async (cambio: Omit<Cambio, 'id'>) => {
    const newCambio = await poster<Cambio>(
      endpoints.cambios.create(),
      cambio
    );
    mutate([...(data || []), newCambio], false);
    return newCambio;
  };

  const updateCambio = async (id: string, cambio: Partial<Cambio>) => {
    const updated = await putter<Cambio>(
      endpoints.cambios.update(id),
      cambio
    );
    mutate(
      data?.map((c) => (c.id === id ? updated : c)),
      false
    );
    return updated;
  };

  const deleteCambio = async (id: string) => {
    await deleter(endpoints.cambios.delete(id));
    mutate(
      data?.filter((c) => c.id !== id),
      false
    );
  };

  return {
    cambios: data,
    isLoading,
    error,
    createCambio,
    updateCambio,
    deleteCambio,
    mutate,
  };
}

export function useCambio(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Cambio>(
    id ? endpoints.cambios.byId(id) : null,
    fetcher
  );

  return {
    cambio: data,
    isLoading,
    error,
    mutate,
  };
}