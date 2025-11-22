export interface Cambio {
  id: string;
  fecha: string;
  turno: string;
  solicitante: string;
  destinatario: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  created_at?: string;
  updated_at?: string;
}

export interface Stats {
  turnosOferta: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
}

export interface TurnosData {
  misGuardias: number;
  guardiasCubiertas: number;
  guardiasQueMeCubrieron: number;
  total: number;
}

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  horario?: string;
  grupoTurno?: GrupoTurno;
  created_at?: string;
  updated_at?: string;
}

export interface Turno {
  id: string;
  nombre: string;
  tipo: 'mañana' | 'tarde' | 'nocturno';
  horaInicio: string;
  horaFin: string;
  created_at?: string;
  updated_at?: string;
}

// ========================================
// TIPOS PARA OFERTAS
// ========================================

export type GrupoTurno = 'A' | 'B';
export type TipoOferta = 'OFREZCO' | 'BUSCO';
export type ModalidadBusqueda = 'INTERCAMBIO' | 'ABIERTO';
export type Prioridad = 'NORMAL' | 'URGENTE';
export type EstadoOferta = 'DISPONIBLE' | 'SOLICITADO' | 'APROBADO' | 'COMPLETADO' | 'CANCELADO';

// Estructura de turno básico
export interface TurnoInfo {
  fecha: string;
  horario: string;
  grupoTurno?: GrupoTurno;
}

// Turno con solo fecha y horario (para arrays)
export interface TurnoSimple {
  fecha: string;
  horario: string;
}

// Tipo para el formulario (frontend)
export interface NuevaOfertaForm {
  tipo: TipoOferta;
  modalidadBusqueda: ModalidadBusqueda;
  fechaOfrece: string;
  horarioOfrece: string;
  grupoOfrece: GrupoTurno;
  descripcion: string;
  prioridad: Prioridad;
  fechasBusca: TurnoSimple[];
  fechasDisponibles: TurnoSimple[];
}

// Tipo para el payload que se envía al backend
export interface OfertaPayload {
  tipo: TipoOferta;
  modalidadBusqueda: ModalidadBusqueda;
  descripcion: string;
  prioridad: Prioridad;
  turnoOfrece?: TurnoInfo;
  turnosBusca?: TurnoSimple[];
  fechasDisponibles?: TurnoSimple[];
}

// Tipo para la oferta completa desde la DB (con datos populados)
export interface Oferta {
  id: string;
  ofertanteId: string;
  tomadorId: string | null;
  tipo: TipoOferta;
  modalidadBusqueda: ModalidadBusqueda;
  turnoOfrece: TurnoInfo | null;
  turnosBusca: TurnoSimple[] | null;
  fechasDisponibles: TurnoSimple[] | null;
  descripcion: string;
  prioridad: Prioridad;
  estado: EstadoOferta;
  publicado: string;
  createdAt: string;
  updatedAt: string;
  // Relaciones populadas
  ofertante: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
  tomador?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
}

// ========================================
// TIPOS PARA SOLICITUDES DIRECTAS
// ========================================

export type EstadoSolicitud = 'SOLICITADO' | 'APROBADO' | 'COMPLETADO' | 'CANCELADO';

export interface TurnoSolicitud {
  fecha: string;
  horario: string;
  grupoTurno: GrupoTurno;
}

// Tipo para el formulario de solicitud directa (frontend)
export interface SolicitudDirectaForm {
  solicitanteId?: string;
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

// Tipo para la solicitud completa desde la DB
export interface SolicitudDirecta {
  id: string;
  solicitanteId: string;
  destinatarioId: string;
  turnoSolicitante: TurnoSolicitud;
  turnoDestinatario: TurnoSolicitud;
  motivo: string;
  prioridad: Prioridad;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  createdAt: string;
  updatedAt: string;
  // Relaciones populadas
  solicitante: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
  destinatario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
}

// ========================================
// TIPOS LEGACY (mantener compatibilidad)
// ========================================

// @deprecated - Usar Oferta en su lugar
export interface Ofertas {
  id: string;
  ofertante: string;
  tipo: string;
  turnoOfrece: string | null;
  turnoBusca: string | null;
  descripcion: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
  validoHasta: string;
  publicado: string;
  estado: 'DISPONIBLE' | 'SOLICITADO' | 'APROBADO' | 'COMPLETADO' | 'CANCELADO';
}

// @deprecated - Usar SolicitudDirecta en su lugar
export interface SolicitudesDirectas {
  id: string;
  solicitante: string;
  destinatario: string;
  turnoSolicitante: string;
  turnoDestinatario: string;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  fechaSolicitud: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
}