// lib/placeholder-data.ts

export const users = [
  {
    id: '410544b2-4001-4271-9855-fec4b6a6442a',
    nombre: 'Emanuel',
    email: 'emanuel@workshift.com',
    password: 'password123',
    rol: 'inspector'
  },
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442b',
    nombre: 'Juan García',
    email: 'juan.garcia@workshift.com',
    password: 'password123',
    rol: 'inspector'
  },
  {
    id: '3958dc9e-742f-4377-85e9-fec4b6a6442c',
    nombre: 'María López',
    email: 'maria.lopez@workshift.com',
    password: 'password123',
    rol: 'inspector'
  },
  {
    id: '3958dc9e-737f-4377-85e9-fec4b6a6442d',
    nombre: 'Carlos Martínez',
    email: 'carlos.martinez@workshift.com',
    password: 'password123',
    rol: 'inspector'
  },
  {
    id: '3958dc9e-722f-4377-85e9-fec4b6a6442e',
    nombre: 'Ana Rodríguez',
    email: 'ana.rodriguez@workshift.com',
    password: 'password123',
    rol: 'inspector'
  },
  {
    id: '3958dc9e-799f-4377-85e9-fec4b6a64430',
    nombre: 'Patricia Hernández',
    email: 'patricia.hernandez@workshift.com',
    password: 'password123',
    rol: 'inspector'
  },
  {
    id: '3958dc9e-765f-4377-85e9-fec4b6a64431',
    nombre: 'Roberto Pérez',
    email: 'roberto.perez@workshift.com',
    password: 'password123',
    rol: 'inspector'
  },
  {
    id: '3958dc9e-754f-4377-85e9-fec4b6a64432',
    nombre: 'Carmen Sánchez',
    email: 'carmen.sanchez@workshift.com',
    password: 'password123',
    rol: 'inspector'
  }
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