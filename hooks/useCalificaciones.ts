import useSWR from 'swr';
import { apiClient } from '@/app/lib/apiclient';

export interface TurnoPendiente {
  id: string;
  fecha: string;
  horario: string;
  tipo_cambio: string;
  otro_id: string;
  otro_nombre: string;
  otro_iniciales: string;
}

export interface HistorialCalificacion {
  id: string;
  fecha: string;
  horario: string;
  comunicacion: number;
  responsabilidad: number;
  recomendacion: number;
  promedio: number;
  cumplimiento: boolean;
  comentario: string | null;
  direccion: 'dada' | 'recibida';
  otro_nombre: string;
  otro_iniciales: string;
  editable: boolean;
  created_at: string;
}

interface CalificacionesData {
  pendientes: TurnoPendiente[];
  historial: HistorialCalificacion[];
  miScore: number;
}

export function useCalificaciones() {
  const { data, error, isLoading, mutate } = useSWR<CalificacionesData>(
    '/calificaciones',
    () => apiClient.get<CalificacionesData>('/calificaciones'),
    { revalidateOnFocus: true }
  );

  const crearCalificacion = async (body: {
    turnoEfectivoId: string;
    calificadoId: string;
    comunicacion: number;
    responsabilidad: number;
    recomendacion: number;
    cumplimiento: boolean;
    comentario?: string;
  }) => {
    const res = await apiClient.post('/calificaciones', body);
    mutate();
    return res;
  };

  const eliminarCalificacion = async (id: string) => {
    const res = await apiClient.delete(`/calificaciones/${id}`);
    mutate();
    return res;
  };

  const editarCalificacion = async (id: string, body: Partial<{
    comunicacion: number;
    responsabilidad: number;
    recomendacion: number;
    cumplimiento: boolean;
    comentario: string;
  }>) => {
    const res = await apiClient.put(`/calificaciones/${id}`, body);
    mutate();
    return res;
  };

  return {
    pendientes: data?.pendientes || [],
    historial: data?.historial || [],
    miScore: data?.miScore || 0,
    isLoading,
    error,
    crearCalificacion,
    editarCalificacion,
    eliminarCalificacion,
    refetch: mutate,
  };
}

export interface ListadoItem {
  id: string;
  calificado_nombre: string;
  calificado_turno: string;
  calificador_nombre: string;
  fecha: string;
  promedio: number;
  comunicacion: number;
  responsabilidad: number;
  recomendacion: number;
  cumplimiento: boolean;
  comentario: string | null;
}

export function useListadoCalificaciones(filters?: { desde?: string; hasta?: string; turno?: string }) {
  const params = new URLSearchParams();
  if (filters?.desde) params.set('desde', filters.desde);
  if (filters?.hasta) params.set('hasta', filters.hasta);
  if (filters?.turno) params.set('turno', filters.turno);
  const path = `/calificaciones/listado${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading } = useSWR<ListadoItem[]>(
    path,
    () => apiClient.get<ListadoItem[]>(path),
    { revalidateOnFocus: true }
  );

  return {
    listado: data || [],
    isLoading,
    error,
  };
}