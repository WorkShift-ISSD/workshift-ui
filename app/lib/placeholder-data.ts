// lib/placeholder-data.ts

export const users = [
  {
    id: '410544b2-4001-4271-9855-fec4b6a6442a',
    nombre: 'Emanuel',
    apellido: 'González',
    legajo: 1001,
    email: 'emanuel@workshift.com',
    password: 'password123',
    rol: 'INSPECTOR',
    telefono: '+54 11 4444-5555',
    direccion: 'Av. Corrientes 1234, Buenos Aires',
    horario: '08:00-16:00',
    fechaNacimiento: '1990-05-15',
    activo: true,
    grupoTurno: 'A'
  },
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442b',
    nombre: 'Juan',
    apellido: 'García',
    legajo: 1002,
    email: 'juan.garcia@workshift.com',
    password: 'password123',
    rol: 'INSPECTOR',
    telefono: '+54 11 5555-6666',
    direccion: 'Calle Falsa 123, Buenos Aires',
    horario: '14:00-22:00',
    fechaNacimiento: '1985-03-20',
    activo: true,
    grupoTurno: 'B'
  },
  {
    id: '3958dc9e-742f-4377-85e9-fec4b6a6442c',
    nombre: 'María',
    apellido: 'López',
    legajo: 1003,
    email: 'maria.lopez@workshift.com',
    password: 'password123',
    rol: 'SUPERVISOR',
    telefono: '+54 11 6666-7777',
    direccion: 'Av. Santa Fe 4567, Buenos Aires',
    horario: '06:00-14:00',
    fechaNacimiento: '1988-11-10',
    activo: true,
    grupoTurno: 'A'
  },
];

export const turnos = [
  {
    id: '50ca3e18-62cd-11ee-8c99-0242ac120001',
    nombre: 'Nocturno - Inspector Gadget',
    tipo: 'nocturno',
    horaInicio: '22:00:00',
    horaFin: '06:00:00'
  },
  {
    id: '50ca3e18-62cd-11ee-8c99-0242ac120002',
    nombre: 'Tarde - Inspector Poirot',
    tipo: 'tarde',
    horaInicio: '14:00:00',
    horaFin: '22:00:00'
  },
  {
    id: '50ca3e18-62cd-11ee-8c99-0242ac120003',
    nombre: 'Mañana - Inspector Clouseau',
    tipo: 'mañana',
    horaInicio: '06:00:00',
    horaFin: '14:00:00'
  },
  {
    id: '50ca3e18-62cd-11ee-8c99-0242ac120004',
    nombre: 'Nocturno - Inspector Morse',
    tipo: 'nocturno',
    horaInicio: '22:00:00',
    horaFin: '06:00:00'
  }
];

export const cambios = [
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd8001',
    fecha: '2025-10-10',
    turno: 'Nocturno - Inspector Gadget',
    solicitante: 'Juan García',
    destinatario: 'María López',
    estado: 'PENDIENTE'
  },
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd8002',
    fecha: '2025-10-08',
    turno: 'Tarde - Inspector Poirot',
    solicitante: 'Carlos Martínez',
    destinatario: 'Ana Rodríguez',
    estado: 'APROBADO'
  },
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd8003',
    fecha: '2025-10-12',
    turno: 'Mañana - Inspector Clouseau',
    solicitante: 'Luis González',
    destinatario: 'Patricia Hernández',
    estado: 'PENDIENTE'
  },
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd8004',
    fecha: '2025-10-15',
    turno: 'Nocturno - Inspector Morse',
    solicitante: 'Roberto Pérez',
    destinatario: 'Carmen Sánchez',
    estado: 'APROBADO'
  }
];

export const stats = {
  turnosOferta: 3,
  aprobados: 12,
  pendientes: 5,
  rechazados: 2
};

export const turnosData = {
  misGuardias: 15,
  guardiasCubiertas: 8,
  guardiasQueMeCubrieron: 3,
  total: 26
};