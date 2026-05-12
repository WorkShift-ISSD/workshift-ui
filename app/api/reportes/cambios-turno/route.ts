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

    // ─── Stats generales ────────────────────────────────────────────────────
    const [stats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE a.estado = 'APROBADA')::int as aprobados,
        COUNT(*) FILTER (WHERE a.estado = 'RECHAZADA')::int as rechazados,
        COUNT(*) FILTER (WHERE a.estado = 'CANCELADA')::int as cancelados,
        COUNT(*) FILTER (WHERE a.estado = 'PENDIENTE')::int as pendientes,
        COUNT(*) FILTER (WHERE a.tipo = 'CAMBIO_TURNO' AND sd.turno_destinatario IS NOT NULL)::int as intercambios,
        COUNT(*) FILTER (WHERE a.tipo = 'CAMBIO_TURNO' AND sd.turno_destinatario IS NULL)::int as coberturas
      FROM autorizaciones a
      LEFT JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      WHERE a.tipo = 'CAMBIO_TURNO'
        ${desde ? sql`AND a.created_at >= ${desde}::date` : sql``}
        ${hasta ? sql`AND a.created_at <= ${hasta}::date + INTERVAL '1 day'` : sql``}
        ${empleadoId ? sql`AND a.empleado_id = ${empleadoId}::uuid` : sql``}
    `;

    // ─── Por mes ─────────────────────────────────────────────────────────────
    const porMes = await sql`
      SELECT
        TO_CHAR(a.created_at, 'MM/YYYY') as mes,
        DATE_TRUNC('month', a.created_at) as mes_orden,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE a.estado = 'APROBADA')::int as aprobados,
        COUNT(*) FILTER (WHERE a.estado = 'RECHAZADA')::int as rechazados
      FROM autorizaciones a
      WHERE a.tipo = 'CAMBIO_TURNO'
        ${desde ? sql`AND a.created_at >= ${desde}::date` : sql``}
        ${hasta ? sql`AND a.created_at <= ${hasta}::date + INTERVAL '1 day'` : sql``}
        ${empleadoId ? sql`AND a.empleado_id = ${empleadoId}::uuid` : sql``}
      GROUP BY mes, mes_orden
      ORDER BY mes_orden ASC
    `;

    // ─── Por empleado ─────────────────────────────────────────────────────────
    const porEmpleado = await sql`
      SELECT
        u.nombre || ' ' || u.apellido as nombre,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE a.estado = 'APROBADA')::int as aprobados
      FROM autorizaciones a
      JOIN users u ON a.empleado_id = u.id
      WHERE a.tipo = 'CAMBIO_TURNO'
        ${desde ? sql`AND a.created_at >= ${desde}::date` : sql``}
        ${hasta ? sql`AND a.created_at <= ${hasta}::date + INTERVAL '1 day'` : sql``}
        ${empleadoId ? sql`AND a.empleado_id = ${empleadoId}::uuid` : sql``}
      GROUP BY u.nombre, u.apellido
      ORDER BY total DESC
      LIMIT 10
    `;

    // ─── Tabla detalle ────────────────────────────────────────────────────────
    const tabla = await sql`
      SELECT
        a.id::text,
        a.estado,
        a.created_at,
        u.nombre || ' ' || u.apellido as empleado,
        u.rol,
        CASE
          WHEN sd.turno_destinatario IS NOT NULL THEN 'Intercambio'
          ELSE 'Cobertura'
        END as tipo_cambio,
        CASE WHEN sd.turno_solicitante->>'fecha' IS NOT NULL
          THEN TO_CHAR((sd.turno_solicitante->>'fecha')::date, 'DD/MM/YYYY')
          ELSE NULL
        END as fecha_turno,
        COALESCE(sd.motivo, of.descripcion) as motivo,
        ap.nombre || ' ' || ap.apellido as aprobado_por
      FROM autorizaciones a
      JOIN users u ON a.empleado_id = u.id
      LEFT JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      LEFT JOIN ofertas of ON a.oferta_id = of.id
      LEFT JOIN users ap ON a.aprobado_por = ap.id
      WHERE a.tipo = 'CAMBIO_TURNO'
        ${desde ? sql`AND a.created_at >= ${desde}::date` : sql``}
        ${hasta ? sql`AND a.created_at <= ${hasta}::date + INTERVAL '1 day'` : sql``}
        ${empleadoId ? sql`AND a.empleado_id = ${empleadoId}::uuid` : sql``}
      ORDER BY a.created_at DESC
    `;

    return NextResponse.json({ stats, porMes, porEmpleado, tabla });

  } catch (error) {
    console.error('❌ Error GET /api/reportes/cambios-turno:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
