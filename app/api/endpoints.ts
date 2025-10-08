// lib/api/endpoints.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const endpoints = {
  // Cambios
  cambios: {
    list: () => `${API_BASE_URL}/cambios`,
    byId: (id: string) => `${API_BASE_URL}/cambios/${id}`,
    create: () => `${API_BASE_URL}/cambios`,
    update: (id: string) => `${API_BASE_URL}/cambios/${id}`,
    delete: (id: string) => `${API_BASE_URL}/cambios/${id}`,
  },
  
  // Stats
  stats: {
    get: () => `${API_BASE_URL}/stats`,
    update: () => `${API_BASE_URL}/stats`,
  },
  
  // Turnos Data
  turnosData: {
    get: () => `${API_BASE_URL}/turnosData`,
    update: () => `${API_BASE_URL}/turnosData`,
  },
  
  // Users
  users: {
    list: () => `${API_BASE_URL}/users`,
    byId: (id: string) => `${API_BASE_URL}/users/${id}`,
    create: () => `${API_BASE_URL}/users`,
    update: (id: string) => `${API_BASE_URL}/users/${id}`,
    delete: (id: string) => `${API_BASE_URL}/users/${id}`,
  },
  
  // Turnos
  turnos: {
    list: () => `${API_BASE_URL}/turnos`,
    byId: (id: string) => `${API_BASE_URL}/turnos/${id}`,
    create: () => `${API_BASE_URL}/turnos`,
    update: (id: string) => `${API_BASE_URL}/turnos/${id}`,
    delete: (id: string) => `${API_BASE_URL}/turnos/${id}`,
  },
} as const;












