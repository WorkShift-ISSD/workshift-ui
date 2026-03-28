// app/api/autorizaciones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';

// GET - Obtener autorización por ID con datos completos del cambio
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
        
        -- Empleado solicitante
        json_build_object(
          'id', e.id,
          'nombre', e.nombre,
          'apellido', e.apellido,
          'rol', e.rol
        ) as empleado,
        
        -- Aprobador (si existe)
        CASE 
          WHEN a.aprobado_por IS NOT NULL THEN
            json_build_object(
              'id', ap.id,
              'nombre', ap.nombre,
              'apellido', ap.apellido
            )
          ELSE NULL
        END as aprobador,
        
        -- Datos de SOLICITUD DIRECTA (si aplica)
        CASE 
          WHEN a.solicitud_id IS NOT NULL THEN
            json_build_object(
              'id', sd.id,
              'motivo', sd.motivo,
              'prioridad', sd.prioridad,
              'fechaSolicitud', sd.fecha_solicitud,
              'solicitante', json_build_object(
                'id', us.id,
                'nombre', us.nombre,
                'apellido', us.apellido,
                'rol', us.rol
              ),
              'destinatario', json_build_object(
                'id', ud.id,
                'nombre', ud.nombre,
                'apellido', ud.apellido,
                'rol', ud.rol
              ),
              'turnoSolicitante', sd.turno_solicitante,
              'turnoDestinatario', sd.turno_destinatario
            )
          ELSE NULL
        END as solicitudDirecta,
        
        -- Datos de OFERTA (si aplica)
        CASE 
          WHEN a.oferta_id IS NOT NULL THEN
            json_build_object(
              'id', of.id,
              'tipo', of.tipo,
              'modalidadBusqueda', of.modalidad_busqueda,
              'descripcion', of.descripcion,
              'prioridad', of.prioridad,
              'publicado', of.publicado,
              'ofertante', json_build_object(
                'id', uof.id,
                'nombre', uof.nombre,
                'apellido', uof.apellido,
                'rol', uof.rol
              ),
              'tomador', CASE 
                WHEN of.tomador_id IS NOT NULL THEN
                  json_build_object(
                    'id', ut.id,
                    'nombre', ut.nombre,
                    'apellido', ut.apellido,
                    'rol', ut.rol
                  )
                ELSE NULL
              END,
              'turnoOfrece', of.turno_ofrece,
              'turnoSeleccionado', of.turno_seleccionado,
              'turnosBusca', of.turnos_busca,
              'fechasDisponibles', of.fechas_disponibles
            )
          ELSE NULL
        END as oferta
        
      FROM autorizaciones a
      JOIN users e ON a.empleado_id = e.id
      LEFT JOIN users ap ON a.aprobado_por = ap.id
      
      -- JOIN con solicitud directa
      LEFT JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      LEFT JOIN users us ON sd.solicitante_id = us.id
      LEFT JOIN users ud ON sd.destinatario_id = ud.id
      
      -- JOIN con oferta
      LEFT JOIN ofertas of ON a.oferta_id = of.id
      LEFT JOIN users uof ON of.ofertante_id = uof.id
      LEFT JOIN users ut ON of.tomador_id = ut.id
      
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

// PUT - Actualizar autorización
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