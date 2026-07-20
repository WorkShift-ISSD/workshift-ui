import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

const TIPOS_VALIDOS = ['ORDINARIA', 'COMPENSATORIO', 'COMISION', 'GREMIAL', 'PATERNIDAD', 'MEDICA', 'ESTUDIO', 'SIN_GOCE', 'CURSO'];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { licencias } = await request.json();
    if (!Array.isArray(licencias) || licencias.length === 0) {
      return NextResponse.json({ error: 'No hay licencias para importar' }, { status: 400 });
    }

    const creadas: any[] = [];
    const errores: { fila: string; error: string }[] = [];

    for (const l of licencias) {
      const filaId = `legajo ${l.legajo} (${l.tipo} ${l.fecha_desde}→${l.fecha_hasta})`;
      try {
        const [empleado] = await sql`
          SELECT id FROM users WHERE legajo = ${l.legajo} AND activo = true
        `;
        if (!empleado) {
          errores.push({ fila: filaId, error: 'Empleado no encontrado' });
          continue;
        }

        const [solapada] = await sql`
          SELECT id FROM licencias
          WHERE empleado_id = ${empleado.id}
            AND estado IN ('PENDIENTE', 'APROBADA', 'ACTIVA')
            AND (
              (fecha_desde <= ${l.fecha_desde}::date AND fecha_hasta >= ${l.fecha_desde}::date) OR
              (fecha_desde <= ${l.fecha_hasta}::date AND fecha_hasta >= ${l.fecha_hasta}::date) OR
              (fecha_desde >= ${l.fecha_desde}::date AND fecha_hasta <= ${l.fecha_hasta}::date)
            )
        `;
        if (solapada) {
          errores.push({ fila: filaId, error: 'Se solapa con una licencia existente' });
          continue;
        }

        const [nueva] = await sql`
          INSERT INTO licencias (id, empleado_id, tipo, fecha_desde, fecha_hasta, observaciones, estado, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            ${empleado.id},
            ${l.tipo},
            ${l.fecha_desde}::date,
            ${l.fecha_hasta}::date,
            ${l.observaciones || null},
            'APROBADA',
            NOW(), NOW()
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
    console.error('Error en bulk licencias:', error);
    return NextResponse.json({ error: 'Error al importar licencias' }, { status: 500 });
  }
}
