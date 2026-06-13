import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NESTJS_API_URL || 'http://localhost:3001';

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value;
}

export async function GET(request: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const res = await fetch(`${API}/sanciones${request.nextUrl.search}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(request: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const res = await fetch(`${API}/sanciones`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
