// app/api/cambios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);


export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    const cambios = await sql`
      SELECT 
        te.id::text,
        TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
        te.horario_efectivo as turno,
        te.estado,
        te.tipo_cambio,
        te.created_at,
        json_build_object(
          'id', us.id,
          'nombre', us.nombre,
          'apellido', us.apellido
        ) as solicitante,
        json_build_object(
          'id', ui.id,
          'nombre', ui.nombre,
          'apellido', ui.apellido
        ) as destinatario
      FROM turnos_efectivos te
      JOIN users us ON te.empleado_id = us.id
      LEFT JOIN users ui ON te.empleado_intercambio_id = ui.id
      WHERE te.empleado_id = ${userId}::uuid
      ORDER BY te.fecha ASC;
    `;

    return NextResponse.json(cambios.map(c => ({
      id: c.id,
      fecha: c.fecha,
      turno: c.turno,
      solicitante: `Cubrís a ${c.destinatario.nombre} ${c.destinatario.apellido}`,
      destinatario: '',
      estado: c.estado,
    })));

  } catch (error) {
    console.error('❌ Error fetching cambios:', error);
    return NextResponse.json(
      { error: 'Error al leer cambios', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {  // ← SIN parámetros
  try {
    const cambio = await request.json();

    const [newCambio] = await sql`
      INSERT INTO cambios (fecha, turno, solicitante, destinatario, estado)
      VALUES (${cambio.fecha}, ${cambio.turno}, ${cambio.solicitante}, 
              ${cambio.destinatario}, ${cambio.estado})
      RETURNING 
        id::text,
        fecha::text,
        turno,
        solicitante,
        destinatario,
        estado,
        created_at,
        updated_at
    `;

    return NextResponse.json(newCambio, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating cambio:', error);
    return NextResponse.json(
      { error: 'Error al crear cambio', details: String(error) },
      { status: 500 }
    );
  }
}