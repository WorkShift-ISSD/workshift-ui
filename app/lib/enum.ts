// lib/enums.ts

export enum EstadoSolicitud {
  SOLICITADO = 'SOLICITADO',
  APROBADO = 'APROBADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  VENCIDO = 'VENCIDO',
  RECHAZADO = 'RECHAZADO'
}

export enum EstadoOferta {
  DISPONIBLE = 'DISPONIBLE',
  SOLICITADO = 'SOLICITADO',
  APROBADO = 'APROBADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  VENCIDO = 'VENCIDO',
}

export enum RolUsuario {
  SUPERVISOR = 'SUPERVISOR',
  INSPECTOR = 'INSPECTOR',
  JEFE = 'JEFE',
  ADMINISTRADOR = 'ADMINISTRADOR'
}

export enum GrupoTurno {
  A = 'A',
  B = 'B',
  ADMIN = 'ADMIN'
}

export enum EstadoLicencia {
  PENDIENTE = "PENDIENTE",
  APROBADA = "APROBADA",
  ACTIVA = "ACTIVA",
  FINALIZADA = "FINALIZADA",
  CANCELADA = "CANCELADA",
  RECHAZADA = "RECHAZADA",
}

export enum TipoLicencia {
  ORDINARIA = "ORDINARIA",
  ENFERMEDAD = "ENFERMEDAD",
  ESPECIAL = "ESPECIAL",
  ESTUDIO = "ESTUDIO",
  SIN_GOCE = "SIN_GOCE",
}


export enum TipoTurno {
  MANANA = 'manana',
  TARDE = 'tarde',
  NOCTURNO = 'nocturno'
}


export enum TipoOferta {
  OFREZCO = 'OFREZCO',
  BUSCO = 'BUSCO'
}


export enum TipoSolicitud {
  INTERCAMBIO = 'INTERCAMBIO',
  ABIERTO = 'ABIERTO'
}

export enum Prioridad {
  NORMAL = 'NORMAL',
  URGENTE = 'URGENTE'
}

export enum EstadoCambio {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO',
  COMPLETADO = 'COMPLETADO'
}

export enum EstadoSancion {
  ACTIVA = 'ACTIVA',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA'
}

export enum EstadoAutorizacion {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  CANCELADA = 'CANCELADA'
}

export enum TipoAutorizacion {
  CAMBIO_TURNO = 'CAMBIO_TURNO',
  LICENCIA_ORDINARIA = 'LICENCIA_ORDINARIA'
}

// Helper para obtener valores como string SQL
export const getEnumSqlString = (enumObj: Record<string, string>): string => {
  return Object.values(enumObj).map(v => `'${v}'`).join(', ');
};

// Helper para obtener valores como array
export const getEnumValuesArray = (enumObj: Record<string, string>): string[] => {
  return Object.values(enumObj);
};

// Helper específico para validación
export const isValidEnumValue = <T extends Record<string, string>>(
  enumObj: T,
  value: string
): value is T[keyof T] => {
  return Object.values(enumObj).includes(value);
};

// Funciones de validación específicas
export const isValidEstadoSolicitud = (estado: string): estado is EstadoSolicitud => {
  return isValidEnumValue(EstadoSolicitud, estado);
};

export const isValidEstadoOferta = (estado: string): estado is EstadoOferta => {
  return isValidEnumValue(EstadoOferta, estado);
};

export const isValidRolUsuario = (rol: string): rol is RolUsuario => {
  return isValidEnumValue(RolUsuario, rol);
};

export const isValidGrupoTurno = (grupo: string): grupo is GrupoTurno => {
  return isValidEnumValue(GrupoTurno, grupo);
};

export const isValidTipoTurno = (tipo: string): tipo is TipoTurno => {
  return isValidEnumValue(TipoTurno, tipo);
};

export const isValidTipoOferta = (tipo: string): tipo is TipoOferta => {
  return isValidEnumValue(TipoOferta, tipo);
};

export const isValidTipoSolicitud = (tipo: string): tipo is TipoSolicitud => {
  return isValidEnumValue(TipoSolicitud, tipo);
};

export const isValidPrioridad = (prioridad: string): prioridad is Prioridad => {
  return isValidEnumValue(Prioridad, prioridad);
};

export const isValidEstadoCambio = (estado: string): estado is EstadoCambio => {
  return isValidEnumValue(EstadoCambio, estado);
};

export const isValidEstadoAutorizacion = (estado: string): estado is EstadoAutorizacion => {
  return isValidEnumValue(EstadoAutorizacion, estado);
};

export const isValidTipoAutorizacion = (tipo: string): tipo is TipoAutorizacion => {
  return isValidEnumValue(TipoAutorizacion, tipo);
};