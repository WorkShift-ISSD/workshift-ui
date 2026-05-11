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

    const listado = await sql`
      SELECT
        u.id::text,
        u.nombre || ' ' || u.apellido as nombre,
        u.rol as cargo,
        COALESCE(u.calificacion, 0) as promedio,
        COUNT(DISTINCT c.turno_efectivo_id)::int as cantidad,
        COUNT(DISTINCT c.id) FILTER (WHERE c.cumplimiento = true)::int as "cumplSi",
        COUNT(DISTINCT c.id) FILTER (WHERE c.cumplimiento = false)::int as "cumplNo",
        COALESCE(AVG(c.comunicacion), 0) as comunicacion,
        COALESCE(AVG(c.responsabilidad), 0) as responsabilidad,
        COALESCE(AVG(c.recomendacion), 0) as recomendacion,
        (
          SELECT c2.comentario
          FROM calificaciones c2
          JOIN turnos_efectivos te2 ON te2.id = c2.turno_efectivo_id
          WHERE c2.calificado_id = u.id
            AND c2.comentario IS NOT NULL
          ORDER BY te2.fecha DESC
          LIMIT 1
        ) as "ultimoComentario"
      FROM users u
      LEFT JOIN calificaciones c ON c.calificado_id = u.id
      WHERE u.activo = true
        AND u.rol = ${rol}
        AND u.id != ${payload.id as string}::uuid
      GROUP BY u.id, u.nombre, u.apellido, u.rol, u.calificacion
      ORDER BY COALESCE(u.calificacion, 0) DESC, u.apellido;
    `;

    return NextResponse.json(listado);

  } catch (error) {
    console.error('❌ Error GET /api/calificaciones/listado:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}