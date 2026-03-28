// app/api/fetcher.ts

export class APIError extends Error {
  info: unknown;
  status: number;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

// Opciones base para todas las requests — manda cookies automáticamente
const BASE_OPTIONS: RequestInit = {
  credentials: 'include',
};

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    ...BASE_OPTIONS,
  });

  if (!res.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: 'Error desconocido' };
    }

    throw new APIError(
      errorData.error || errorData.message || 'Error al obtener datos',
      res.status,
      errorData
    );
  }

  return res.json();
}

export async function poster<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    ...BASE_OPTIONS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = {};
    }
    throw new APIError(
      errorData.error || errorData.message || 'Error al crear recurso',
      res.status,
      errorData
    );
  }

  return res.json();
}

export async function putter<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    ...BASE_OPTIONS,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = {};
    }
    throw new APIError(
      errorData.error || errorData.message || 'Error al actualizar recurso',
      res.status,
      errorData
    );
  }

  return res.json();
}

export async function patcher<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    ...BASE_OPTIONS,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = {};
    }
    throw new APIError(
      errorData.error || errorData.message || 'Error al actualizar recurso',
      res.status,
      errorData
    );
  }

  return res.json();
}

export async function deleter<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    ...BASE_OPTIONS,
    method: 'DELETE',
  });

  if (!res.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = {};
    }
    throw new APIError(
      errorData.error || errorData.message || 'Error al eliminar recurso',
      res.status,
      errorData
    );
  }

  return res.json();
}