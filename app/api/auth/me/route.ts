import { NextResponse } from 'next/server';
import { apiClient } from '@/app/lib/apiclient';

export async function GET() {
  const data = await apiClient.get<any>('/users/me');
  if (data?.statusCode === 401 || data?.message === 'Unauthorized') {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({ user: data });
}