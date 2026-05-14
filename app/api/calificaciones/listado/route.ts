import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const rol = payload.rol as string;

    const { searchParams } = new URL(request.url);
    const desde = searchParams.get('desde') || null;
    const hasta = searchParams.get('hasta') || null;
    const turno = searchParams.get('turno') || null;

    const listado = await sql`
      SELECT
        c.id::text,
        calificado.nombre || ' ' || calificado.apellido as calificado_nombre,
        calificado.grupo_turno as calificado_turno,
        calificador.nombre || ' ' || calificador.apellido as calificador_nombre,
        TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
        c.promedio,
        c.comunicacion,
        c.responsabilidad,
        c.recomendacion,
        c.cumplimiento,
        c.comentario
      FROM calificaciones c
      JOIN users calificado ON calificado.id = c.calificado_id
      JOIN users calificador ON calificador.id = c.calificador_id
      JOIN turnos_efectivos te ON te.id = c.turno_efectivo_id
      WHERE calificado.activo = true
        AND calificado.rol = ${rol}
        ${desde ? sql`AND te.fecha >= ${desde}::date` : sql``}
        ${hasta ? sql`AND te.fecha <= ${hasta}::date` : sql``}
        ${turno ? sql`AND calificado.grupo_turno = ${turno}` : sql``}
      ORDER BY te.fecha DESC;
    `;

    return NextResponse.json(listado);

  } catch (error) {
    console.error('❌ Error GET /api/calificaciones/listado:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
