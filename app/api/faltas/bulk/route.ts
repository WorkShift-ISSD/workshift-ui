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

    const registradoPorId = payload.id as string;

    const { faltas } = await request.json();
    if (!Array.isArray(faltas) || faltas.length === 0) {
      return NextResponse.json({ error: 'No hay faltas para importar' }, { status: 400 });
    }

    const creadas: any[] = [];
    const errores: { fila: string; error: string }[] = [];

    for (const f of faltas) {
      const filaId = `legajo ${f.legajo} - ${f.fecha}`;
      try {
        const [empleado] = await sql`
          SELECT id FROM users WHERE legajo = ${f.legajo} AND activo = true
        `;
        if (!empleado) {
          errores.push({ fila: filaId, error: 'Empleado no encontrado' });
          continue;
        }

        const [existente] = await sql`
          SELECT id FROM faltas
          WHERE empleado_id = ${empleado.id}::uuid AND fecha = ${f.fecha}::date
        `;
        if (existente) {
          errores.push({ fila: filaId, error: 'Ya existe una falta en esa fecha' });
          continue;
        }

        const justificada = ['si', 'sí', 'true', '1'].includes(
          String(f.justificada ?? '').toLowerCase()
        );

        const [nueva] = await sql`
          INSERT INTO faltas (id, empleado_id, fecha, causa, observaciones, justificada, registrado_por, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            ${empleado.id}::uuid,
            ${f.fecha}::date,
            ${f.motivo},
            ${f.observaciones || null},
            ${justificada},
            ${registradoPorId}::uuid,
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
    console.error('Error en bulk faltas:', error);
    return NextResponse.json({ error: 'Error al importar faltas' }, { status: 500 });
  }
}
