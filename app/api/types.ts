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