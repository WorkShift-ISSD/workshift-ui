import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const rutaNestJS = path.join('/');
  const queryString = request.nextUrl.search;
  const url = `${NEXT_PUBLIC_API_URL}/${rutaNestJS}${queryString}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    try {
      const json = await request.json();
      body = JSON.stringify(json);
    } catch {
      body = undefined;
    }
  }

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
