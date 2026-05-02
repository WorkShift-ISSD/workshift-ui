// app/api/turnos-efectivos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || userId;

    const turnosGanados = await sql`
      SELECT 
        id::text,
        TO_CHAR(fecha, 'YYYY-MM-DD') as fecha,
        horario_original,
        horario_efectivo,
        grupo_original,
        grupo_efectivo,
        tipo_cambio,
        estado,
        'GANADO' as tipo
      FROM turnos_efectivos
      WHERE empleado_id = ${targetUserId}::uuid
        AND estado = 'PENDIENTE'
        AND fecha >= NOW()::date;
    `;

    const turnosCedidos = await sql`
      SELECT 
        TO_CHAR(fecha, 'YYYY-MM-DD') as fecha
      FROM turnos_efectivos
      WHERE empleado_intercambio_id = ${targetUserId}::uuid
        AND estado = 'PENDIENTE'
        AND fecha >= NOW()::date;
    `;

    return NextResponse.json({
      ganados: turnosGanados,
      cedidos: turnosCedidos.map((t: any) => t.fecha)
    });

  } catch (error) {
    console.error('❌ Error fetching turnos efectivos:', error);
    return NextResponse.json(
      { error: 'Error al obtener turnos efectivos', details: String(error) },
      { status: 500 }
    );
  }
}