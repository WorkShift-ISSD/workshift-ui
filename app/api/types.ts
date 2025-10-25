export enum Rol {
  USUARIO = 'USUARIO',
  SUPERVISOR = 'SUPERVISOR',
  INSPECTOR = 'INSPECTOR',
  JEFESECTOR = 'JEFESECTOR',
  ADMIN = 'ADMIN',
}

export enum GrupoTurno {
  A = 'A',
  B = 'B',
}

export enum Horario {
  TURNO_04_14 = 'TURNO_04_14',
  TURNO_06_16 = 'TURNO_06_16',
  TURNO_10_20 = 'TURNO_10_20',
  TURNO_13_23 = 'TURNO_13_23',
  TURNO_19_05 = 'TURNO_19_05',
}

export enum EstadoIntercambio {
  PENDIENTE = 'PENDIENTE',
  ACEPTADO = 'ACEPTADO',
  ESPERANDO_APROBACION = 'ESPERANDO_APROBACION',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  EJECUTADO = 'EJECUTADO',
  CANCELADO = 'CANCELADO',
  EXPIRADO = 'EXPIRADO',
}

export enum EstadoLicencia {
  ACTIVA = 'ACTIVA',
  VENCIDA = 'VENCIDA',
  SUSPENDIDA = 'SUSPENDIDA',
  RENOVADA = 'RENOVADA',
}

export enum EstadoAutorizacion {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  CANCELADA = 'CANCELADA',
  EXPIRADA = 'EXPIRADA',
}

export enum TipoAutorizacion {
  LICENCIA = 'LICENCIA',
  CAMBIO_TURNO = 'CAMBIO_TURNO',
  OTRO = 'OTRO',
}

// Usuario
export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  legajo?: string;
  rol: Rol;
  telefono?: string | null;
  direccion?: string | null;
  fechaNacimiento?: Date | null;
  activo: boolean;
  grupoTurno?: GrupoTurno | null;
  horarioLaboral?: Horario | null;
  fotoPerfil?: string | null;
  ultimoLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Turno
export interface Turno {
  id: string;
  idUsuario: string;
  grupoTurno: GrupoTurno;
  horaInicio: Date;
  horaFin: Date;
  notas?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// IntercambioTurno (antes era "Cambio")
export interface IntercambioTurno {
  id: string;
  idTurnoOriginal: string;
  turnoReemplazoId?: string | null;
  usuarioSolicitanteId: string;
  usuarioAceptanteId?: string | null;
  jefeId?: string | null;
  estado: EstadoIntercambio;
  fechaSolicitud: Date;
  fechaAceptacion?: Date | null;
  fechaAprobacion?: Date | null;
  fechaEjecucion?: Date | null;
  fechaRechazo?: Date | null;
  motivoRechazo?: string | null;
  motivo: string;
  comentarios?: string | null;
  urgencia: string;
  createdAt: Date;
  updatedAt: Date;
}

// IntercambioTurno con relaciones populadas (para UI)
export interface IntercambioTurnoConRelaciones extends IntercambioTurno {
  turnoOriginal: Turno;
  turnoReemplazo?: Turno | null;
  usuarioSolicitante: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  usuarioAceptante?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
  jefe?: {
    id: string;
    nombre: string;
    apellido: string;
  } | null;
}

// LicenciaPersonal
export interface LicenciaPersonal {
  id: string;
  idUsuario: string;
  tipoLicencia: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: EstadoLicencia;
  notas?: string | null;
  aprobadoPor?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Ausencia
export interface Ausencia {
  id: string;
  idUsuario: string;
  fecha: Date;
  tipoAusencia: string;
  justificacion?: string | null;
  sancionAplicada?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Autorizacion
export interface Autorizacion {
  id: string;
  solicitadoPorId: string;
  jefeId?: string | null;
  revisadoPorId?: string | null;
  tipo: TipoAutorizacion;
  estado: EstadoAutorizacion;
  fechaAprobacion?: Date | null;
  fechaVencimiento?: Date | null;
  justificacion: string;
  comentarios?: string | null;
  motivoRechazo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Stats para dashboard
export interface StatsIntercambios {
  turnosOferta: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
  aceptados: number;
  ejecutados: number;
  cancelados: number;
  expirados: number;
}

export interface TurnosData {
  misGuardias: number;
  guardiasCubiertas: number;
  guardiasQueMeCubrieron: number;
  total: number;
}

// Helpers para Horario
export const HORARIOS_MAP: Record<Horario, { inicio: string; fin: string; label: string }> = {
  TURNO_04_14: { inicio: '04:00', fin: '14:00', label: '04:00-14:00' },
  TURNO_06_16: { inicio: '06:00', fin: '16:00', label: '06:00-16:00' },
  TURNO_10_20: { inicio: '10:00', fin: '20:00', label: '10:00-20:00' },
  TURNO_13_23: { inicio: '13:00', fin: '23:00', label: '13:00-23:00' },
  TURNO_19_05: { inicio: '19:00', fin: '05:00', label: '19:00-05:00' },
};

export const HORARIOS_OPCIONES = Object.entries(HORARIOS_MAP).map(([key, value]) => ({
  value: key as Horario,
  label: value.label,
}));

// Helper para obtener horario formateado
export function getHorarioLabel(horario: Horario | null | undefined): string | null {
  if (!horario) return null;
  return HORARIOS_MAP[horario]?.label || null;
}

// Helper para parsear horario
export function parseHorario(horario: Horario): { inicio: string; fin: string } {
  return {
    inicio: HORARIOS_MAP[horario].inicio,
    fin: HORARIOS_MAP[horario].fin,
  };
}

// Tipos de licencia comunes
export const TIPOS_LICENCIA = [
  'MEDICA',
  'VACACIONES',
  'PERSONAL',
  'MATERNIDAD',
  'PATERNIDAD',
  'ESTUDIO',
  'DUELO',
] as const;

export type TipoLicencia = typeof TIPOS_LICENCIA[number];

// Tipos de ausencia comunes
export const TIPOS_AUSENCIA = [
  'INJUSTIFICADA',
  'JUSTIFICADA',
  'TARDANZA',
] as const;

export type TipoAusencia = typeof TIPOS_AUSENCIA[number];

// Niveles de urgencia
export const NIVELES_URGENCIA = [
  'BAJA',
  'NORMAL',
  'ALTA',
  'URGENTE',
] as const;

export type NivelUrgencia = typeof NIVELES_URGENCIA[number];