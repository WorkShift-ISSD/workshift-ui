// lib/api/endpoints.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

// lib/api/fetcher.ts
export class APIError extends Error {
  info: any;
  status: number;

  constructor(message: string, status: number, info?: any) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new APIError(
      'Error al obtener datos',
      res.status,
      info
    );
  }

  return res.json();
}

export async function poster<T>(
  url: string,
  data: any
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new APIError(
      'Error al crear recurso',
      res.status,
      info
    );
  }

  return res.json();
}

export async function putter<T>(
  url: string,
  data: any
): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new APIError(
      'Error al actualizar recurso',
      res.status,
      info
    );
  }

  return res.json();
}

export async function deleter<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new APIError(
      'Error al eliminar recurso',
      res.status,
      info
    );
  }

  return res.json();
}











