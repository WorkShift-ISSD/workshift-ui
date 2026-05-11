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
    const fecha = searchParams.get('fecha');
    const targetUserId = searchParams.get('userId') || userId;

    // Si se pasa ?fecha= sin userId, devolver todos los turnos efectivos del día para todos los empleados
    if (fecha && !searchParams.get('userId')) {
      const ganados = await sql`
        SELECT
          te.empleado_id::text as "empleadoId",
          TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
          te.horario_efectivo as "horarioEfectivo",
          te.grupo_efectivo as "grupoEfectivo",
          te.tipo_cambio as "tipoCambio",
          'GANADO' as tipo,
          u.nombre, u.apellido, u.horario, u.grupo_turno as "grupoTurno"
        FROM turnos_efectivos te
        JOIN users u ON te.empleado_id = u.id
        WHERE te.fecha = ${fecha}::date AND te.estado = 'PENDIENTE';
      `;

      const cedidos = await sql`
        SELECT
          te.empleado_intercambio_id::text as "empleadoId",
          TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
          te.horario_original as "horarioEfectivo",
          te.grupo_original as "grupoEfectivo",
          te.tipo_cambio as "tipoCambio",
          'CEDIDO' as tipo,
          u.nombre, u.apellido, u.horario, u.grupo_turno as "grupoTurno"
        FROM turnos_efectivos te
        JOIN users u ON te.empleado_intercambio_id = u.id
        WHERE te.fecha = ${fecha}::date
          AND te.estado = 'PENDIENTE'
          AND te.empleado_intercambio_id IS NOT NULL;
      `;

      return NextResponse.json([...ganados, ...cedidos]);
    }

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
        AND estado = 'PENDIENTE';
    `;

    const turnosCedidos = await sql`
      SELECT
        TO_CHAR(fecha, 'YYYY-MM-DD') as fecha
      FROM turnos_efectivos
      WHERE empleado_intercambio_id = ${targetUserId}::uuid
        AND estado = 'PENDIENTE';
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