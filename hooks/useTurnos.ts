// hooks/useTurnos.ts
import { deleter, endpoints, fetcher, poster, putter } from '@/app/lib/api/endpoints';
import { Turno } from '@/app/lib/api/types';
import useSWR from 'swr';

export function useTurnos() {
  const { data, error, isLoading, mutate } = useSWR<Turno[]>(
    endpoints.turnos.list(),
    fetcher
  );

  const createTurno = async (turno: Omit<Turno, 'id'>) => {
    const newTurno = await poster<Turno>(
      endpoints.turnos.create(),
      turno
    );
    mutate([...(data || []), newTurno], false);
    return newTurno;
  };

  const updateTurno = async (id: string, turno: Partial<Turno>) => {
    const updated = await putter<Turno>(
      endpoints.turnos.update(id),
      turno
    );
    mutate(
      data?.map((t) => (t.id === id ? updated : t)),
      false
    );
    return updated;
  };

  const deleteTurno = async (id: string) => {
    await deleter(endpoints.turnos.delete(id));
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