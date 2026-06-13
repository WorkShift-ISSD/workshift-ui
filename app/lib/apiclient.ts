// app/lib/apiclient.ts
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getHeaders(): Promise<HeadersInit> {
  if (typeof window === 'undefined') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
}

export const apiClient = {
  async get<T = unknown>(path: string): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      headers,
      credentials: 'include',
    });
    return res.json();
  },

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },

  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      method: 'DELETE',
      headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      credentials: 'include',
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  },
};