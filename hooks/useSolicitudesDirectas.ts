import useSWR from "swr";
import { GrupoTurno, Prioridad, EstadoOferta } from "./useOfertas";
import { apiClient } from "@/app/lib/apiclient";

export interface SolicitudesDirectas {
  id: string;
  solicitante: {
    id: string;
    nombre: string;
    apellido: string;
    horario: string;
  };
  destinatario: {
    id: string;
    nombre: string;
    apellido: string;
    horario: string;
  };
  turnoSolicitante: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
  turnoDestinatario: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
  motivo: string;
  prioridad: Prioridad;
  estado: EstadoOferta;
  fechaSolicitud: string;
}

export interface SolicitudDirectaForm {
  solicitanteId: string;
  destinatarioId: string;
  fechaSolicitante: string;
  horarioSolicitante: string;
  grupoSolicitante: GrupoTurno;
  fechaDestinatario: string;
  horarioDestinatario: string;
  grupoDestinatario: GrupoTurno;
  motivo: string;
  prioridad: Prioridad;
}

export const useSolicitudesDirectas = () => {
  const {
    data: solicitudes,
    error,
    isLoading,
    mutate,
  } = useSWR<SolicitudesDirectas[]>(
    "/solicitudes-directas?usuario=yo",
    () => apiClient.get<SolicitudesDirectas[]>("/solicitudes-directas?usuario=yo"),
    { refreshInterval: 5000 }
  );

  const agregarSolicitud = async (solicitud: SolicitudDirectaForm) => {
    const { solicitanteId, ...solicitudSinSolicitante } = solicitud;

    const data = await apiClient.post<any>('/solicitudes-directas', solicitudSinSolicitante);

    if (data?.error) throw new Error(data.error);

    mutate(
      (currentData) => {
        if (!currentData) return [data.solicitud || data];
        return [data.solicitud || data, ...currentData];
      },
      { revalidate: true }
    );

    return data;
  };

  const actualizarSolicitud = async (id: string, solicitud: SolicitudDirectaForm) => {
    const { solicitanteId, destinatarioId, ...solicitudParaActualizar } = solicitud;

    const data = await apiClient.patch<any>(`/solicitudes-directas/${id}`, solicitudParaActualizar);

    if (data?.error) {
      throw new Error(data.error || data.details || "Error al actualizar solicitud");
    }

    const solicitudActualizada = data.solicitud || data;

    mutate(
      (currentData) => {
        if (!currentData) return currentData;
        return currentData.map((s) =>
          s.id === id ? solicitudActualizada : s
        );
      },
      { revalidate: true }
    );

    return solicitudActualizada;
  };

  const actualizarEstado = async (id: string, nuevoEstado: EstadoOferta) => {
    const data = await apiClient.patch<any>(`/solicitudes-directas/${id}`, { estado: nuevoEstado });

    if (data?.error) throw new Error(data.error);

    mutate(
      (currentData) => {
        if (!currentData) return currentData;
        return currentData.map((s) =>
          s.id === id ? { ...s, estado: nuevoEstado } : s
        );
      },
      { revalidate: true }
    );

    return data;
  };

  return {
    solicitudes: solicitudes || [],
    agregarSolicitud,
    actualizarSolicitud,
    actualizarEstado,
    isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
};