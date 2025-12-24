// app/api/autorizaciones/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { EstadoAutorizacion, TipoAutorizacion, getEnumSqlString } from '@/app/lib/enum';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

// GET - Listar autorizaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const tipo = searchParams.get('tipo');

    let whereClause = sql`WHERE 1=1`;

    if (estado) {
      whereClause = sql`${whereClause} AND a.estado = ${estado}`;
    }

    if (tipo) {
      whereClause = sql`${whereClause} AND a.tipo = ${tipo}`;
    }

    const autorizaciones = await sql`
      SELECT 
        a.id::text,
        a.tipo,
        a.empleado_id::text as "empleadoId",
        a.solicitud_id::text as "solicitudId",
        a.oferta_id::text as "ofertaId",
        a.licencia_id::text as "licenciaId",
        a.estado,
        a.observaciones,
        a.aprobado_por::text as "aprobadoPor",
        a.fecha_aprobacion as "fechaAprobacion",
        a.created_at as "createdAt",
        a.updated_at as "updatedAt",
        json_build_object(
          'id', e.id,
          'nombre', e.nombre,
          'apellido', e.apellido,
          'rol', e.rol
        ) as empleado,
        CASE 
          WHEN a.aprobado_por IS NOT NULL THEN
            json_build_object(
              'id', ap.id,
              'nombre', ap.nombre,
              'apellido', ap.apellido
            )
          ELSE NULL
        END as aprobador
      FROM autorizaciones a
      JOIN users e ON a.empleado_id = e.id
      LEFT JOIN users ap ON a.aprobado_por = ap.id
      ${whereClause}
      ORDER BY a.created_at DESC;
    `;

    return NextResponse.json(autorizaciones);
  } catch (error) {
    console.error('❌ Error GET /api/autorizaciones:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener autorizaciones',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST - Crear autorización (uso interno, automático)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      tipo,
      empleadoId,
      solicitudId,
      ofertaId,
      licenciaId,
      observaciones
    } = body;

    // Validar campos obligatorios
    if (!tipo || !empleadoId) {
      return NextResponse.json(
        { error: 'Tipo y empleadoId son requeridos' },
        { status: 400 }
      );
    }

    // Validar que tenga exactamente una referencia
    const referencias = [solicitudId, ofertaId, licenciaId].filter(Boolean);
    if (referencias.length !== 1) {
      return NextResponse.json(
        { error: 'Debe proporcionar exactamente una referencia (solicitud, oferta o licencia)' },
        { status: 400 }
      );
    }

    // ✅ VALIDACIÓN: Verificar que el empleado NO tenga sanciones activas
    const hoy = new Date().toISOString().split('T')[0];
    
    const [sancionActiva] = await sql`
      SELECT 1 FROM sanciones
      WHERE empleado_id = ${empleadoId}::uuid
        AND estado = 'ACTIVA'
        AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;

    if (sancionActiva) {
      return NextResponse.json(
        { error: 'El empleado tiene una sanción activa y no puede solicitar autorizaciones' },
        { status: 400 }
      );
    }

    // ✅ VALIDACIÓN: Verificar que el empleado NO tenga licencias activas
    const [licenciaActiva] = await sql`
      SELECT 1 FROM licencias
      WHERE empleado_id = ${empleadoId}::uuid
        AND estado IN ('APROBADA', 'ACTIVA')
        AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;

    if (licenciaActiva) {
      return NextResponse.json(
        { error: 'El empleado tiene una licencia activa y no puede solicitar autorizaciones' },
        { status: 400 }
      );
    }

    // Crear autorización
    const [nuevaAutorizacion] = await sql`
      INSERT INTO autorizaciones (
        tipo,
        empleado_id,
        solicitud_id,
        oferta_id,
        licencia_id,
        estado,
        observaciones
      ) VALUES (
        ${tipo},
        ${empleadoId}::uuid,
        ${solicitudId ? sql`${solicitudId}::uuid` : null},
        ${ofertaId ? sql`${ofertaId}::uuid` : null},
        ${licenciaId ? sql`${licenciaId}::uuid` : null},
        ${EstadoAutorizacion.PENDIENTE},
        ${observaciones || null}
      )
      RETURNING 
        id::text,
        tipo,
        empleado_id::text as "empleadoId",
        solicitud_id::text as "solicitudId",
        oferta_id::text as "ofertaId",
        licencia_id::text as "licenciaId",
        estado,
        observaciones,
        created_at as "createdAt";
    `;

    console.log('✅ Autorización creada:', nuevaAutorizacion.id);

    return NextResponse.json(nuevaAutorizacion, { status: 201 });
  } catch (error) {
    console.error('❌ Error POST /api/autorizaciones:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear autorización',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}