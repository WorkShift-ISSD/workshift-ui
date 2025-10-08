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