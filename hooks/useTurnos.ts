// hooks/useTurnos.ts
import { apiClient } from '@/app/lib/apiclient';
import { Turno } from '@/app/api/types';
import useSWR from 'swr';

export function useTurnos() {
  const { data, error, isLoading, mutate } = useSWR<Turno[]>(
    '/turnos',
    () => apiClient.get<Turno[]>('/turnos')
  );

  const createTurno = async (turno: Omit<Turno, 'id'>) => {
    const newTurno = await apiClient.post<Turno>('/turnos', turno);
    mutate([...(data || []), newTurno], false);
    return newTurno;
  };

  const updateTurno = async (id: string, turno: Partial<Turno>) => {
    const updated = await apiClient.put<Turno>(`/turnos/${id}`, turno);
    mutate(
      data?.map((t) => (t.id === id ? updated : t)),
      false
    );
    return updated;
  };

  const deleteTurno = async (id: string) => {
    await apiClient.delete(`/turnos/${id}`);
    mutate(
      data?.filter((t) => t.id !== id),
      false
    );
  };

  return {
    turnos: data,
    isLoading,
    error,
    createTurno,
    updateTurno,
    deleteTurno,
    mutate,
  };
}