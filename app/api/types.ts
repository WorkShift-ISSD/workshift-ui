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
  email: string;
  rol: string;
  horario: string;
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