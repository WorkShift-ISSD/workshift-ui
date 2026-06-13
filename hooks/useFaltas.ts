// hooks/useFaltas.ts
import useSWR from 'swr';
import { apiClient } from '@/app/lib/apiclient';

export interface Falta {
  motivo: string;
  inspectorId: any;
  id: string;
  empleadoId: string;
  fecha: string; // Formato: "YYYY-MM-DD"
  causa: string;
  observaciones: string | null;
  justificada: boolean;
  registradoPor: {
    id: string;
    nombre: string;
    apellido: string;
  };
  createdAt: string;
  updatedAt: string;
  empleado?: {
    id: string;
    nombre: string;
    apellido: string;
    legajo: number;
    horario: string | null;
    rol: string;
  };
}

// Normalizar fecha para evitar problemas de zona horaria
const normalizarFecha = (fecha: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }

  if (fecha.includes('T')) {
    return fecha.split('T')[0];
  }

  try {
    const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  } catch (error) {
    console.error('Error normalizando fecha:', error);
  }

  return fecha;
};

// Hook para obtener faltas de una fecha específica
export function useFaltas(fecha?: string) {
  const fechaNormalizada = fecha ? normalizarFecha(fecha) : undefined;

  const path = fechaNormalizada ? `/faltas?fecha=${fechaNormalizada}` : null;

  const { data, error, isLoading, mutate } = useSWR<Falta[]>(
    path,
    () => apiClient.get<Falta[]>(path!),
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const createFalta = async (falta: Omit<Falta, 'id' | 'createdAt' | 'updatedAt'>) => {
    const faltaConFechaNormalizada = {
      ...falta,
      fecha: normalizarFecha(falta.fecha)
    };

    const newFalta = await apiClient.post<Falta>('/faltas', faltaConFechaNormalizada);

    mutate([...(data || []), newFalta], false);
    return newFalta;
  };

  const updateFalta = async (id: string, falta: Partial<Falta>) => {
    const faltaConFechaNormalizada = falta.fecha
      ? { ...falta, fecha: normalizarFecha(falta.fecha) }
      : falta;

    const updated = await apiClient.put<Falta>(`/faltas/${id}`, faltaConFechaNormalizada);

    mutate(
      data?.map((f) => (f.id === id ? updated : f)),
      false
    );
    return updated;
  };

  const deleteFalta = async (id: string) => {
    await apiClient.delete(`/faltas/${id}`);
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

// Hook para obtener TODAS las faltas (sin filtro de fecha)
export function useTodasLasFaltas() {
  const { data, error, isLoading, mutate } = useSWR<Falta[]>(
    '/faltas',
    () => apiClient.get<Falta[]>('/faltas'),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    faltas: data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}