import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NESTJS_API_URL || 'http://localhost:3001';

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const res = await fetch(`${API}/faltas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const res = await fetch(`${API}/faltas/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const res = await fetch(`${API}/faltas/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
