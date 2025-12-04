// hooks/useFaltas.ts
import useSWR from 'swr';
import { endpoints } from '@/app/api/endpoints';
import { deleter, fetcher, poster, putter } from '@/app/api/fetcher';

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

// Normalizar fecha para evitar problemas de zona horaria
const normalizarFecha = (fecha: string): string => {
  // Si la fecha ya está en formato YYYY-MM-DD, devolverla tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }
  
  // Si viene con timestamp, extraer solo la fecha
  const date = new Date(fecha);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Hook para obtener faltas de una fecha específica
export function useFaltas(fecha?: string) {
  // Normalizar la fecha antes de hacer la petición
  const fechaNormalizada = fecha ? normalizarFecha(fecha) : undefined;
  
  const { data, error, isLoading, mutate } = useSWR<Falta[]>(
    fechaNormalizada ? endpoints.faltas.list(fechaNormalizada) : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000, // 5 segundos de cache
    }
  );

  const createFalta = async (falta: Omit<Falta, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Normalizar la fecha antes de enviar
    const faltaConFechaNormalizada = {
      ...falta,
      fecha: normalizarFecha(falta.fecha)
    };
    
    const newFalta = await poster<Falta>(
      endpoints.faltas.create(),
      faltaConFechaNormalizada
    );
    
    // Actualizar cache local
    mutate([...(data || []), newFalta], false);
    return newFalta;
  };

  const updateFalta = async (id: string, falta: Partial<Falta>) => {
    // Normalizar la fecha si está presente
    const faltaConFechaNormalizada = falta.fecha 
      ? { ...falta, fecha: normalizarFecha(falta.fecha) }
      : falta;
    
    const updated = await putter<Falta>(
      endpoints.faltas.update(id),
      faltaConFechaNormalizada
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

// Hook para obtener TODAS las faltas (sin filtro de fecha)
export function useTodasLasFaltas() {
  const { data, error, isLoading, mutate } = useSWR<Falta[]>(
    '/api/faltas',
    fetcher,
    {
      revalidateOnFocus: false,
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