import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { sanciones } = await request.json();
    if (!Array.isArray(sanciones) || sanciones.length === 0) {
      return NextResponse.json({ error: 'No hay sanciones para importar' }, { status: 400 });
    }

    const creadas: any[] = [];
    const errores: { fila: string; error: string }[] = [];
    const hoy = new Date().toISOString().split('T')[0];

    for (const s of sanciones) {
      const filaId = `legajo ${s.legajo} (${s.fecha_desde} → ${s.fecha_hasta})`;
      try {
        const [empleado] = await sql`
          SELECT id FROM users WHERE legajo = ${s.legajo} AND activo = true
        `;
        if (!empleado) {
          errores.push({ fila: filaId, error: 'Empleado no encontrado' });
          continue;
        }

        const estado = s.fecha_hasta < hoy ? 'FINALIZADA' : 'ACTIVA';

        const [nueva] = await sql`
          INSERT INTO sanciones (empleado_id, fecha_desde, fecha_hasta, motivo, estado)
          VALUES (
            ${empleado.id},
            ${s.fecha_desde}::date,
            ${s.fecha_hasta}::date,
            ${s.motivo || null},
            ${estado}
          )
          RETURNING id::text
        `;
        creadas.push(nueva);
      } catch (err: any) {
        errores.push({ fila: filaId, error: 'Error al insertar' });
      }
    }

    return NextResponse.json({ creadas: creadas.length, errores });
  } catch (error) {
    console.error('Error en bulk sanciones:', error);
    return NextResponse.json({ error: 'Error al importar sanciones' }, { status: 500 });
  }
}
