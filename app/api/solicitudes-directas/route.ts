// app/api/solicitudes-directas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// GET - Obtener solicitudes directas
// app/api/solicitudes-directas/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    let query;
    if (estado) {
      query = sql`
        SELECT 
          sd.id,
          sd.estado,
          sd.motivo,
          sd.prioridad,
          sd.fecha_solicitud as "fechaSolicitud",
          json_build_object(
            'id', us.id,
            'nombre', us.nombre,
            'apellido', us.apellido
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido
          ) as destinatario,
          json_build_object(
            'fecha', sd.fecha_solicitante,
            'horario', sd.horario_solicitante,
            'grupoTurno', sd.grupo_solicitante
          ) as "turnoSolicitante",
          json_build_object(
            'fecha', sd.fecha_destinatario,
            'horario', sd.horario_destinatario,
            'grupoTurno', sd.grupo_destinatario
          ) as "turnoDestinatario"
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        WHERE sd.estado = ${estado}
        ORDER BY sd.fecha_solicitud DESC;
      `;
    } else {
      query = sql`
        SELECT 
          sd.id,
          sd.estado,
          sd.motivo,
          sd.prioridad,
          sd.fecha_solicitud as "fechaSolicitud",
          json_build_object(
            'id', us.id,
            'nombre', us.nombre,
            'apellido', us.apellido
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido
          ) as destinatario,
          json_build_object(
            'fecha', sd.fecha_solicitante,
            'horario', sd.horario_solicitante,
            'grupoTurno', sd.grupo_solicitante
          ) as "turnoSolicitante",
          json_build_object(
            'fecha', sd.fecha_destinatario,
            'horario', sd.horario_destinatario,
            'grupoTurno', sd.grupo_destinatario
          ) as "turnoDestinatario"
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        ORDER BY sd.fecha_solicitud DESC;
      `;
    }

    const solicitudes = await query;

    return NextResponse.json(solicitudes);
  } catch (error) {
    console.error('Error fetching solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes' },
      { status: 500 }
    );
  }
}

// POST - Crear solicitud directa en la BD
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      solicitanteId,
      destinatarioId,
      fechaSolicitante,
      horarioSolicitante,
      grupoSolicitante,
      fechaDestinatario,
      horarioDestinatario,
      grupoDestinatario,
      motivo,
      prioridad
    } = body;

    if (
      !solicitanteId ||
      !destinatarioId ||
      !fechaSolicitante ||
      !horarioSolicitante ||
      !grupoSolicitante ||
      !fechaDestinatario ||
      !horarioDestinatario ||
      !grupoDestinatario ||
      !motivo ||
      !prioridad
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    const [nuevaSolicitud] = await sql`
      INSERT INTO solicitudes_directas (
        solicitante_id,
        destinatario_id,
        fecha_solicitante,
        horario_solicitante,
        grupo_solicitante,
        fecha_destinatario,
        horario_destinatario,
        grupo_destinatario,
        motivo,
        prioridad,
        estado,
        fecha_solicitud
      ) VALUES (
        ${solicitanteId},
        ${destinatarioId},
        ${fechaSolicitante},
        ${horarioSolicitante},
        ${grupoSolicitante},
        ${fechaDestinatario},
        ${horarioDestinatario},
        ${grupoDestinatario},
        ${motivo},
        ${prioridad},
        'SOLICITADO',
        NOW()
      )
      RETURNING *;
    `;

    return NextResponse.json(
      { message: 'Solicitud creada correctamente', solicitud: nuevaSolicitud },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error en POST /api/solicitudes-directas:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
