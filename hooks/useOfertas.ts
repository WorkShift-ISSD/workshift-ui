import useSWR from "swr";
import { useMemo } from "react";
import { apiClient } from "@/app/lib/apiclient";

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
  modalidadBusqueda?: ModalidadBusqueda;
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
  turnosBusca?: Array<{
    fecha: string;
    horario: string;
  }>;
  rangoFechas?: {
    desde: string;
    hasta: string;
  };
  fechasDisponibles?: Array<{
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
  usaRangoDisponibles: boolean;
  rangoDisponibles: { desde: string; hasta: string; horario: string };
  usaRangoBusca: boolean;
  rangoBusca: { desde: string; hasta: string; horario: string };
}

export const useOfertas = () => {
  const {
    data: ofertas,
    error,
    isLoading,
    mutate,
  } = useSWR<Oferta[]>(
    "/ofertas",
    () => apiClient.get<Oferta[]>("/ofertas"),
    { refreshInterval: 5000 }
  );

  const agregarOferta = async (oferta: NuevaOfertaForm) => {
    console.log('📤 Enviando oferta:', oferta);

    const data = await apiClient.post<any>('/ofertas', oferta);
    console.log('📥 Respuesta del servidor:', data);

    if (data?.error) throw new Error(data.error || data.details || "Error al crear oferta");

    mutate();
    return data;
  };

  const actualizarEstado = async (id: string, nuevoEstado: EstadoOferta) => {
    const updated = await apiClient.patch<any>(`/ofertas/${id}`, { estado: nuevoEstado });

    if (updated?.error) throw new Error(updated.error || "Error al actualizar estado");

    mutate();
    return updated;
  };

  const eliminarOferta = async (id: string) => {
    const data = await apiClient.delete<any>(`/ofertas/${id}`);
    if (data?.error) throw new Error(data.error || "Error al eliminar oferta");

    mutate();
  };

  const stats = useMemo(() => {
    if (!ofertas) return { total: 0, ofrezco: 0, busco: 0, urgentes: 0 };
    return {
      total: ofertas.length,
      ofrezco: ofertas.filter((o) => o.tipo === "OFREZCO").length,
      busco: ofertas.filter((o) => o.modalidadBusqueda === "INTERCAMBIO").length,
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