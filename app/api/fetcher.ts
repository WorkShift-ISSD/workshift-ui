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

const BASE_OPTIONS: RequestInit = {
  credentials: 'include',
};

const NESTJS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Convierte cualquier URL (absoluta a NestJS o relativa) a /api/proxy/<path>
function toProxyPath(url: string): string {
  let pathAndQuery = url;

  // Si es una URL absoluta a NestJS, extraer path + query
  if (url.startsWith(NESTJS_API_URL)) {
    pathAndQuery = url.slice(NESTJS_API_URL.length);
  }

  // Quitar slash inicial para no duplicarlo
  const clean = pathAndQuery.startsWith('/') ? pathAndQuery.slice(1) : pathAndQuery;
  return `/api/proxy/${clean}`;
}

async function handleErrors(res: Response, fallbackMsg: string) {
  let errorData: { error?: string; message?: string } = {};
  try {
    errorData = await res.json();
  } catch {
    errorData = { message: 'Error desconocido' };
  }
  throw new APIError(
    errorData.error || errorData.message || fallbackMsg,
    res.status,
    errorData
  );
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(toProxyPath(url), { ...BASE_OPTIONS });
  if (!res.ok) await handleErrors(res, 'Error al obtener datos');
  return res.json();
}

export async function poster<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(toProxyPath(url), {
    ...BASE_OPTIONS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleErrors(res, 'Error al crear recurso');
  return res.json();
}

export async function putter<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(toProxyPath(url), {
    ...BASE_OPTIONS,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleErrors(res, 'Error al actualizar recurso');
  return res.json();
}

export async function patcher<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(toProxyPath(url), {
    ...BASE_OPTIONS,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleErrors(res, 'Error al actualizar recurso');
  return res.json();
}

export async function deleter<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(toProxyPath(url), {
    ...BASE_OPTIONS,
    method: 'DELETE',
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  });
  if (!res.ok) await handleErrors(res, 'Error al eliminar recurso');
  return res.json();
}