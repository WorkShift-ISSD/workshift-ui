import useSWR from "swr";
import { GrupoTurno, Prioridad, EstadoOferta } from "./useOfertas";

export interface SolicitudesDirectas {
  id: string;
  solicitante: {
    id: string;
    nombre: string;
    apellido: string;
  };
  destinatario: {
    id: string;
    nombre: string;
    apellido: string;
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
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

  // Crear nueva solicitud directa
  const agregarSolicitud = async (formData: SolicitudDirectaForm) => {
    console.log("Agregar solicitud directa:", formData);

    

    const res = await fetch("/api/solicitudes-directas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    console.log("📥 Respuesta del servidor:", data);
    console.log("📊 Status de la respuesta:", res.status);
  

    if (!res.ok) throw new Error(data.error || "Error al crear solicitud");

    await mutate(); // Refresca la lista
    return data;
  };

  // Actualizar estado
  const actualizarEstado = async (id: string, nuevoEstado: EstadoOferta) => {
    const res = await fetch(`/api/solicitudes-directas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    if (!res.ok) throw new Error("Error al actualizar estado");
    const updated = await res.json();

    mutate();
    return updated;
  };

  return {
    solicitudes: solicitudes || [],
    agregarSolicitud,
    actualizarEstado,
    isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
};