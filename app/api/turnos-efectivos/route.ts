import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value;
}

export async function GET(request: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const res = await fetch(`${API}/turnos-efectivos${request.nextUrl.search}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
