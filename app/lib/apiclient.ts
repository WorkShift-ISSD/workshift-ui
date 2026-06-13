const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getHeaders(): Promise<HeadersInit> {
  // En cliente, las cookies se envían automáticamente con credentials
  // En servidor, necesitamos leerlas manualmente
  if (typeof window === 'undefined') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  // En cliente usamos credentials: 'include' para enviar cookies
  return {};
}

export const apiClient = {
  async get(path: string) {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      headers,
      credentials: 'include',
    });
    return res.json();
  },

  async post(path: string, body: unknown) {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async patch(path: string, body: unknown) {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
    });
    return res.json();
    },

  async put(path: string, body: unknown) {
    const headers = await getHeaders();
    const res = await fetch(`${API}${path}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return res.json();
  },

    async delete(path: string, body?: unknown) {
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