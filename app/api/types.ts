// app/api/types.ts
// Tipos que reflejan exactamente lo que devuelven las APIs

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Rol = 'ADMINISTRADOR' | 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
export type GrupoTurno = 'A' | 'B';
export type Prioridad = 'NORMAL' | 'URGENTE';

// ─── Usuario ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  legajo: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  grupoTurno: GrupoTurno;
  horario: string;
  activo: boolean;
  imagen?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  fechaNacimiento?: string | null;
  primerIngreso?: boolean;
  calificacion?: number;
  totalIntercambios?: number;
  created_at?: string;
  updated_at?: string;
}

// Versión resumida que aparece embebida en otros objetos
export interface UsuarioResumen {
  id: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  horario?: string;
  grupoTurno?: GrupoTurno;
  calificacion?: number;
  totalIntercambios?: number;
}

// ─── Turnos ───────────────────────────────────────────────────────────────────

export interface TurnoInfo {
  fecha: string;        // YYYY-MM-DD
  horario: string;      // ej: "04:00-14:00"
  grupoTurno: GrupoTurno;
}

// ─── Solicitudes directas ─────────────────────────────────────────────────────

export type EstadoSolicitud =
  | 'SOLICITADO'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'COMPLETADO'
  | 'CANCELADO';

export interface SolicitudDirecta {
  id: string;
  estado: EstadoSolicitud;
  motivo: string;
  prioridad: Prioridad;
  fechaSolicitud: string;
  fechaRespuesta?: string | null;
  solicitante: UsuarioResumen;
  destinatario: UsuarioResumen;
  turnoSolicitante: TurnoInfo;
  turnoDestinatario: TurnoInfo;
  created_at?: string;
  updated_at?: string;
}

export interface NuevaSolicitudDirecta {
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

// ─── Ofertas ──────────────────────────────────────────────────────────────────

export type EstadoOferta =
  | 'DISPONIBLE'
  | 'SOLICITADO'
  | 'APROBADO'
  | 'COMPLETADO'
  | 'CANCELADO';

export type TipoOferta = 'OFREZCO' | 'BUSCO';
export type ModalidadOferta = 'INTERCAMBIO' | 'ABIERTO';

export interface FechaBusca {
  fecha: string;
  horario: string;
}

export interface Oferta {
  id: string;
  ofertante: UsuarioResumen;
  tomador?: UsuarioResumen | null;
  tipo: TipoOferta;
  modalidadBusqueda: ModalidadOferta;
  turnoOfrece?: TurnoInfo | null;
  turnosBusca?: FechaBusca[] | null;
  fechasDisponibles?: FechaBusca[] | null;
  descripcion: string;
  prioridad: Prioridad;
  estado: EstadoOferta;
  validoHasta: string;
  publicado: string;
}

export interface NuevaOferta {
  tipo: TipoOferta;
  modalidadBusqueda: ModalidadOferta;
  fechaOfrece?: string;
  horarioOfrece?: string;
  grupoOfrece?: GrupoTurno;
  fechasBusca?: FechaBusca[];
  fechasDisponibles?: FechaBusca[];
  descripcion: string;
  prioridad?: Prioridad;
  diasValidez?: number;
}

// ─── Licencias ────────────────────────────────────────────────────────────────

export type TipoLicencia =
  | 'ORDINARIA'
  | 'ESPECIAL'
  | 'MEDICA'
  | 'ESTUDIO'
  | 'SIN_GOCE';

export type EstadoLicencia =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ACTIVA'
  | 'FINALIZADA'
  | 'CANCELADA';

export interface Licencia {
  id: string;
  empleado_id: string;
  empleado?: UsuarioResumen;
  tipo: TipoLicencia;
  articulo?: string | null;
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  estado: EstadoLicencia;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NuevaLicencia {
  tipo: TipoLicencia;
  articulo?: string;
  fecha_desde: string;
  fecha_hasta: string;
  observaciones?: string;
}

// ─── Sanciones ────────────────────────────────────────────────────────────────

export type EstadoSancion = 'ACTIVA' | 'FINALIZADA' | 'ANULADA';

export interface Sancion {
  id: string;
  empleado_id: string;
  empleado?: UsuarioResumen;
  motivo: string;
  fecha_desde: string;
  fecha_hasta: string;
  estado: EstadoSancion;
  created_at?: string;
  updated_at?: string;
}

export interface NuevaSancion {
  empleado_id: string;
  motivo: string;
  fecha_desde: string;
  fecha_hasta: string;
}

// ─── Faltas ───────────────────────────────────────────────────────────────────

export interface Falta {
  id: string;
  empleadoId: string;
  empleado: UsuarioResumen & { legajo: number };
  fecha: string;
  motivo: string;
  observaciones?: string | null;
  conLicencia: boolean;
  justificada: boolean;
  registradoPor?: UsuarioResumen | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NuevaFalta {
  empleadoId: string;
  fecha: string;
  motivo: string;
  observaciones?: string;
  justificada?: boolean;
}

// ─── Autorizaciones ───────────────────────────────────────────────────────────

export type TipoAutorizacion = 'CAMBIO_TURNO' | 'LICENCIA_ORDINARIA';
export type EstadoAutorizacion =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA';

export interface Autorizacion {
  id: string;
  tipo: TipoAutorizacion;
  empleadoId: string;
  empleado: UsuarioResumen;
  solicitudId?: string | null;
  ofertaId?: string | null;
  licenciaId?: string | null;
  estado: EstadoAutorizacion;
  observaciones?: string | null;
  aprobadoPor?: string | null;
  aprobador?: UsuarioResumen | null;
  fechaAprobacion?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Stats / Dashboard ────────────────────────────────────────────────────────

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

// ─── Tipos legacy — mantener por compatibilidad mientras se migra ─────────────
// TODO: eliminar estos una vez que todos los componentes usen los tipos nuevos

/** @deprecated usar SolicitudDirecta */
export interface SolicitudesDirectas extends SolicitudDirecta {}

/** @deprecated usar Oferta */
export interface Ofertas extends Oferta {}

/** @deprecated usar User */
export interface Turno {
  id: string;
  nombre: string;
  tipo: 'mañana' | 'tarde' | 'nocturno';
  horaInicio: string;
  horaFin: string;
  created_at?: string;
  updated_at?: string;
}

/** @deprecated usar NuevaSolicitudDirecta */
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