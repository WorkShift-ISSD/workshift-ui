// app/api/autorizaciones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';

// GET - Obtener autorización por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [autorizacion] = await sql`
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
      WHERE a.id = ${id}::uuid;
    `;

    if (!autorizacion) {
      return NextResponse.json(
        { error: 'Autorización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(autorizacion);
  } catch (error) {
    console.error('❌ Error GET /api/autorizaciones/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener autorización' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar autorización (solo observaciones o estado manual)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { observaciones } = body;

    const [actualizada] = await sql`
      UPDATE autorizaciones
      SET
        observaciones = COALESCE(${observaciones}, observaciones),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id::text;
    `;

    if (!actualizada) {
      return NextResponse.json(
        { error: 'Autorización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error('❌ Error PUT /api/autorizaciones/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar autorización' },
      { status: 500 }
    );
  }
}