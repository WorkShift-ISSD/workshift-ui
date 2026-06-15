import useSWR from "swr";
import { useMemo } from "react";

export type Rol = "SUPERVISOR" | "INSPECTOR" | "JEFE";
export type GrupoTurno = "A" | "B";
export type TipoOferta = "OFREZCO" | "BUSCO"; 
export type ModalidadBusqueda = "INTERCAMBIO" | "ABIERTO";
export type Prioridad = "NORMAL" | "URGENTE";
export type EstadoOferta =
  | "DISPONIBLE"
  | "SOLICITADO"
  | "APROBADO"
  | "COMPLETADO"
  | "CANCELADO";

export interface Oferta {
  // destinatario: any;
  id: string;
  ofertante: {
    id: string;
    nombre: string;
    apellido: string;
    rol: Rol;
    calificacion: number;
    totalIntercambios: number;
  };
  tipo: TipoOferta;
  modalidadBusqueda?: ModalidadBusqueda; //  Nuevo campo opcional
  turnoOfrece: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  } | null;
  turnoBusca: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  } | null;
  turnosBusca?: Array<{ //  Nuevo para múltiples fechas
    fecha: string;
    horario: string;
  }>;
  rangoFechas?: {
    desde: string;
    hasta: string;
  };
  fechasDisponibles?: Array<{ //  Nuevo para modalidad abierta
    fecha: string;
    horario: string;
  }>;
  fechaDesde?: string | null; 
  fechaHasta?: string | null;
  horarioRango?: string | null;
  descripcion: string;
  prioridad: Prioridad;
  validoHasta: string;
  publicado: string;
  estado: EstadoOferta;
  motivo?: string;
  turnoSolicitado?: {
    fecha: string;
    horario: string;
  };
  turnoOfrecido?: {
    grupoTurno: GrupoTurno;
    horario: string;
    fecha: string;
  };
  fechaSolicitud?: string;
  turnoDestinatario?: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
  tomador?: {
    id: string;
    nombre: string;
    apellido: string;
  };
  fechasAcordadas?: Array<{
    fecha: string;
    tomadorId: string;
    tomadorNombre: string;
    tomadorApellido: string;
}> | null;
}

export interface NuevaOfertaForm {
  tipo: TipoOferta; 
  modalidadBusqueda: ModalidadBusqueda; 
  fechaOfrece: string;
  horarioOfrece: string;
  grupoOfrece: GrupoTurno;
  fechaDesde: string;
  fechaHasta: string;
  descripcion: string;
  prioridad: Prioridad;
  fechasBusca: Array<{ fecha: string; horario: string }>; 
  fechasDisponibles: Array<{ fecha: string; horario: string }>; 
  // Rango para fechas disponibles (Me ofrezco a cubrir, Necesito cobertura, Días a cambio)
  usaRangoDisponibles: boolean;
  rangoDisponibles: { desde: string; hasta: string; horario: string };
  // Rango para fechas busca (Turno que me ofrezco a hacer en OFREZCO_INTERCAMBIO)
  usaRangoBusca: boolean;
  rangoBusca: { desde: string; hasta: string; horario: string };
}

//  Fetcher con credentials
const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include', //  Enviar cookies
  });
  if (!res.ok) throw new Error(`Error al obtener ${url}`);
  return res.json();
};

export const useOfertas = () => {
  const {
    data: ofertas,
    error,
    isLoading,
    mutate,
  } = useSWR<Oferta[]>("/api/ofertas", fetcher, {
    refreshInterval: 5000,
  });

  //  Crear nueva oferta con cookies
  const agregarOferta = async (oferta: NuevaOfertaForm) => {
    console.log('📤 Enviando oferta:', oferta);

    const res = await fetch("/api/ofertas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include', // Enviar cookies automáticamente
      body: JSON.stringify(oferta),
    });

    const data = await res.json();
    console.log('📥 Respuesta del servidor:', data);

    if (!res.ok) throw new Error(data.error || data.details || "Error al crear oferta");

    mutate();
    return data;
  };

  // Actualizar estado de oferta
  const actualizarEstado = async (id: string, nuevoEstado: EstadoOferta) => {
    const res = await fetch(`/api/ofertas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: 'include', 
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    if (!res.ok) throw new Error("Error al actualizar estado");
    const updated = await res.json();

    mutate();
    return updated;
  };

  //  Eliminar oferta
  const eliminarOferta = async (id: string) => {
    const res = await fetch(`/api/ofertas/${id}`, {
      method: "DELETE",
      credentials: 'include', //  Agregar esto
    });
    if (!res.ok) throw new Error("Error al eliminar oferta");

    mutate();
  };

  // Estadísticas actualizadas
  const stats = useMemo(() => {
    if (!ofertas) return { total: 0, ofrezco: 0, busco: 0, urgentes: 0 };
    return {
      total: ofertas.length,
      ofrezco: ofertas.filter((o) => o.tipo === "OFREZCO").length,
      busco: ofertas.filter((o) => o.modalidadBusqueda === "INTERCAMBIO").length, //  Correcto
      urgentes: ofertas.filter((o) => o.prioridad === "URGENTE").length,
    };
  }, [ofertas]);

  return {
    ofertas: ofertas || [],
    stats,
    agregarOferta,
    solicitudes: ofertas?.filter(o => o.estado === "SOLICITADO") || [],
    actualizarEstado,
    eliminarOferta,
    isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
};