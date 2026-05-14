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
    if (payload.rol !== 'JEFE' && payload.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const desde = searchParams.get('desde') || null;
    const hasta = searchParams.get('hasta') || null;
    const empleadoId = searchParams.get('empleadoId') || null;
    const tipo = searchParams.get('tipo') || null;

    const autorizaciones = await sql`
      SELECT
        a.id::text,
        u.nombre || ' ' || u.apellido as empleado,
        u.rol,
        a.tipo,
        CASE
          WHEN a.tipo = 'CAMBIO_TURNO' AND sd.fecha_destinatario IS NOT NULL THEN 'Intercambio'
          WHEN a.tipo = 'CAMBIO_TURNO' THEN 'Cobertura'
          WHEN a.tipo = 'LICENCIA_ORDINARIA' THEN lic.tipo
          ELSE NULL
        END as subtipo,
        TO_CHAR(COALESCE(
          sd.fecha_solicitante,
          lic.fecha_desde,
          a.created_at::date
        ), 'YYYY-MM-DD') as fecha,
        TO_CHAR(sd.fecha_destinatario, 'YYYY-MM-DD') as "fechaDestinatario",
        a.estado,
        COALESCE(sd.motivo, of.descripcion, lic.tipo) as motivo,
        ap.nombre || ' ' || ap.apellido as "aprobadoPor",
        CASE
          WHEN sd.destinatario_id IS NOT NULL THEN ud.nombre || ' ' || ud.apellido
          WHEN of.tomador_id IS NOT NULL THEN ut.nombre || ' ' || ut.apellido
          ELSE NULL
        END as "otraPersona",
        a.created_at
      FROM autorizaciones a
      JOIN users u ON a.empleado_id = u.id
      LEFT JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      LEFT JOIN users ud ON sd.destinatario_id = ud.id
      LEFT JOIN ofertas of ON a.oferta_id = of.id
      LEFT JOIN users ut ON of.tomador_id = ut.id
      LEFT JOIN licencias lic ON a.licencia_id = lic.id
      LEFT JOIN users ap ON a.aprobado_por = ap.id
      WHERE u.activo = true
        ${payload.rol === 'JEFE' ? sql`AND a.estado != 'CANCELADA'` : sql``}
        ${desde ? sql`AND a.created_at >= ${desde}::date` : sql``}
        ${hasta ? sql`AND a.created_at <= ${hasta}::date + INTERVAL '1 day'` : sql``}
        ${empleadoId ? sql`AND a.empleado_id = ${empleadoId}::uuid` : sql``}
        ${tipo ? sql`AND a.tipo = ${tipo}` : sql``}
      ORDER BY a.created_at DESC
    `;

    return NextResponse.json(autorizaciones);

  } catch (error) {
    console.error('❌ Error GET /api/reportes/autorizaciones:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
