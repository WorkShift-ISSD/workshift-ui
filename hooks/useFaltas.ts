// hooks/useFaltas.ts
import useSWR from 'swr';
import { endpoints } from '@/app/api/endpoints';
import { deleter, fetcher, poster, putter } from '@/app/api/fetcher';

export interface Falta {
  motivo: string;
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
    rol: string;
  };
}

// Hook para obtener faltas de una fecha específica
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

// ✅ Nuevo hook para obtener TODAS las faltas (sin filtro de fecha)
export function useTodasLasFaltas() {
  const { data, error, isLoading, mutate } = useSWR<Falta[]>(
    '/api/faltas', // Sin parámetro de fecha para traer todas
    fetcher,
    {
      revalidateOnFocus: false, // No revalidar al cambiar de pestaña
      dedupingInterval: 60000, // Cache de 1 minuto
    }
  );

  return {
    faltas: data || [],
    isLoading,
    error,
    mutate,
  };
}