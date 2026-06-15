import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

// GET - obtener presentes por fecha
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');

  if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });

  const presentes = await sql`
    SELECT empleado_id::text as "empleadoId"
    FROM presentes
    WHERE fecha = ${fecha}::date
  `;

  return NextResponse.json(presentes);
}

// POST - marcar presente
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.empleadoId || !body.fecha) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  let registradoPorId: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      registradoPorId = payload.id as string;
    } catch {}
  }

  await sql`
    INSERT INTO presentes (empleado_id, fecha, registrado_por)
    VALUES (${body.empleadoId}::uuid, ${body.fecha}::date, ${registradoPorId}::uuid)
    ON CONFLICT (empleado_id, fecha) DO NOTHING
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE - quitar presente (por empleadoId y fecha en body)
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  if (!body.empleadoId || !body.fecha) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  await sql`
    DELETE FROM presentes
    WHERE empleado_id = ${body.empleadoId}::uuid
    AND fecha = ${body.fecha}::date
  `;

  return NextResponse.json({ ok: true });
}