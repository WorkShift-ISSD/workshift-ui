import useSWR from "swr";
import { GrupoTurno, Prioridad, EstadoOferta } from "./useOfertas";

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

// ✅ Fetcher con credentials
const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include', // ✅ Enviar cookies
  });
  if (!res.ok) throw new Error(`Error al obtener ${url}`);
  return res.json();
};

export const useSolicitudesDirectas = () => {
  const {
    data: solicitudes,
    error,
    isLoading,
    mutate,
  } = useSWR<SolicitudesDirectas[]>("/api/solicitudes-directas", fetcher, {
    refreshInterval: 5000,
  });

  // ✅ Crear nueva solicitud directa con cookies
  const agregarSolicitud = async (solicitud: SolicitudDirectaForm) => {
    // ❌ NO enviar solicitanteId en el body (el servidor lo obtiene del token)
    const { solicitanteId, ...solicitudSinSolicitante } = solicitud;

    const res = await fetch("/api/solicitudes-directas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include', // ✅ Enviar cookies automáticamente
      body: JSON.stringify(solicitudSinSolicitante),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear solicitud");

    // ✅ Actualización optimista
    mutate(
      (currentData) => {
        if (!currentData) return [data.solicitud || data];
        return [data.solicitud || data, ...currentData];
      },
      { revalidate: true }
    );

    return data;
  };

  // ✅ Actualizar solicitud completa (para edición de campos)
  const actualizarSolicitud = async (id: string, solicitud: SolicitudDirectaForm) => {
    // ❌ NO enviar solicitanteId ni destinatarioId en la edición
    const { solicitanteId, destinatarioId, ...solicitudParaActualizar } = solicitud;

    const res = await fetch(`/api/solicitudes-directas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify(solicitudParaActualizar),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.details || "Error al actualizar solicitud");
    }

    // ✅ Manejar diferentes formatos de respuesta del servidor
    const solicitudActualizada = data.solicitud || data;

    // ✅ Actualización optimista: actualizar el estado local inmediatamente
    mutate(
      (currentData) => {
        if (!currentData) return currentData;
        return currentData.map((s) => 
          s.id === id ? solicitudActualizada : s
        );
      },
      { revalidate: true } // Revalidar en segundo plano
    );

    return solicitudActualizada;
  };

  // ✅ Actualizar solo el estado (para aceptar/rechazar/cancelar)
  const actualizarEstado = async (id: string, nuevoEstado: EstadoOferta) => {
    const res = await fetch(`/api/solicitudes-directas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar estado");

    // ✅ Actualización optimista
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
    actualizarSolicitud, // ✅ Nueva función para editar
    actualizarEstado,
    isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
};