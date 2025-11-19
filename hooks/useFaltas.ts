// hooks/useFaltas.ts
import useSWR from 'swr';
import { endpoints } from '@/app/api/endpoints';
import { deleter, fetcher, poster, putter } from '@/app/api/fetcher';

export interface Falta {
  inspectorId: any;
  id: string;
  empleadoId: string;
  fecha: string;
  causa: string;
  observaciones: string | null;
  justificada: boolean;
  registradoPor: string;
  createdAt: string;
  updatedAt: string;
  // Relaciones opcionales
  empleado?: {
    id: string;
    nombre: string;
    apellido: string;
    legajo: number;
    horario: string | null;
  };
}

export function useFaltas(fecha?: string) {
  const { data, error, isLoading, mutate } = useSWR<Falta[]>(
    endpoints.faltas.list(fecha),
    fetcher
  );

  const createFalta = async (falta: Omit<Falta, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newFalta = await poster<Falta>(
      endpoints.faltas.create(),
      falta
    );
    mutate([...(data || []), newFalta], false);
    return newFalta;
  };

  const updateFalta = async (id: string, falta: Partial<Falta>) => {
    const updated = await putter<Falta>(
      endpoints.faltas.update(id),
      falta
    );
    mutate(
      data?.map((f) => (f.id === id ? updated : f)),
      false
    );
    return updated;
  };

  const deleteFalta = async (id: string) => {
    await deleter(endpoints.faltas.delete(id));
    mutate(
      data?.filter((f) => f.id !== id),
      false
    );
  };

  return {
    faltas: data,
    isLoading,
    error,
    createFalta,
    updateFalta,
    deleteFalta,
    mutate,
  };
}