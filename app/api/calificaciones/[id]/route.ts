import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    const body = await request.json();
    const { comunicacion, responsabilidad, recomendacion, cumplimiento, comentario } = body;

    // Verificar que es el calificador y dentro de 24hs
    const [cal] = await sql`
      SELECT id, calificado_id FROM calificaciones
      WHERE id = ${id}::uuid
        AND calificador_id = ${userId}::uuid
        AND created_at > NOW() - INTERVAL '24 hours';
    `;
    if (!cal) return NextResponse.json({ error: 'No autorizado o fuera de plazo' }, { status: 403 });

    const [updated] = await sql`
      UPDATE calificaciones SET
        comunicacion = COALESCE(${comunicacion ?? null}, comunicacion),
        responsabilidad = COALESCE(${responsabilidad ?? null}, responsabilidad),
        recomendacion = COALESCE(${recomendacion ?? null}, recomendacion),
        cumplimiento = COALESCE(${cumplimiento ?? null}, cumplimiento),
        comentario = COALESCE(${comentario ?? null}, comentario),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id::text, promedio, calificado_id::text;
    `;

    // Recalcular promedio del calificado
    await sql`
      UPDATE users SET
        calificacion = (
          SELECT ROUND(AVG(promedio), 1)
          FROM calificaciones WHERE calificado_id = ${cal.calificado_id}::uuid
        )
      WHERE id = ${cal.calificado_id}::uuid;
    `;

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}