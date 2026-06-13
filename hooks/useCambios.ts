import { apiClient } from '@/app/lib/apiclient';
import { Cambio, Turno } from '@/app/api/types';
import useSWR from 'swr';


export function useCambios() {
  const { data, error, isLoading, mutate } = useSWR<Cambio[]>(
    '/cambios',
    () => apiClient.get<Cambio[]>('/cambios')
  );

  const createCambio = async (cambio: Omit<Cambio, 'id'>) => {
    const newCambio = await apiClient.post<Cambio>('/cambios', cambio);
    mutate([...(data || []), newCambio], false);
    return newCambio;
  };

  const updateCambio = async (id: string, cambio: Partial<Cambio>) => {
    const updated = await apiClient.put<Cambio>(`/cambios/${id}`, cambio);
    mutate(
      data?.map((c) => (c.id === id ? updated : c)),
      false
    );
    return updated;
  };

  const deleteCambio = async (id: string) => {
    await apiClient.delete(`/cambios/${id}`);
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
    id ? `/cambios/${id}` : null,
    () => apiClient.get<Cambio>(`/cambios/${id}`)
  );

  return {
    cambio: data,
    isLoading,
    error,
    mutate,
  };
}