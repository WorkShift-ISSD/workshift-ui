// app/api/solicitudes-directas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// GET - Obtener solicitudes directas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    
    let query;
    if (estado) {
      query = sql`
        SELECT 
          sd.*,
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
          to_char(sd.fecha_solicitante, 'YYYY-MM-DD') as fecha_solicitante,
          to_char(sd.fecha_destinatario, 'YYYY-MM-DD') as fecha_destinatario,
          to_char(sd.fecha_solicitud, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as fecha_solicitud
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        WHERE sd.estado = ${estado}
        ORDER BY sd.fecha_solicitud DESC;
      `;
    } else {
      query = sql`
        SELECT 
          sd.*,
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
          to_char(sd.fecha_solicitante, 'YYYY-MM-DD') as fecha_solicitante,
          to_char(sd.fecha_destinatario, 'YYYY-MM-DD') as fecha_destinatario,
          to_char(sd.fecha_solicitud, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as fecha_solicitud
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        ORDER BY sd.fecha_solicitud DESC;
      `;
    }

    const solicitudes = await query;
    
    const solicitudesFormateadas = solicitudes.map((s: any) => ({
      id: s.id,
      solicitante: s.solicitante,
      destinatario: s.destinatario,
      turnoSolicitante: {
        fecha: s.fecha_solicitante,
        horario: s.horario_solicitante,
        grupoTurno: s.grupo_solicitante,
      },
      turnoDestinatario: {
        fecha: s.fecha_destinatario,
        horario: s.horario_destinatario,
        grupoTurno: s.grupo_destinatario,
      },
      motivo: s.motivo,
      prioridad: s.prioridad,
      estado: s.estado,
      fechaSolicitud: s.fecha_solicitud,
    }));

    return NextResponse.json(solicitudesFormateadas);
  } catch (error) {
    console.error('Error fetching solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes' }, 
      { status: 500 }
    );
  }
}

// POST - Crear solicitud directa
// POST - Crear solicitud directa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos obligatorios según SolicitudDirectaForm
    const requiredFields = [
      "destinatarioId",
      "fechaSolicitante",
      "horarioSolicitante",
      "grupoSolicitante",
      "fechaDestinatario",
      "horarioDestinatario",
      "grupoDestinatario",
      "motivo",
      "prioridad",
    ];

    const missingFields = requiredFields.filter((f) => !body[f]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Faltan campos obligatorios: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // TEMP: userId simulado
    const userId = "410544b2-4001-4271-9855-fec4b6a6442a";

    // Insertar la solicitud
    const [solicitud] = await sql`
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
        ${userId},
        ${body.destinatarioId},
        ${body.fechaSolicitante},
        ${body.horarioSolicitante},
        ${body.grupoSolicitante},
        ${body.fechaDestinatario},
        ${body.horarioDestinatario},
        ${body.grupoDestinatario},
        ${body.motivo},
        ${body.prioridad},
        'SOLICITADO',
        NOW()
      )
      RETURNING *;
    `;

    // Obtener solicitud completa con usuarios
    const [solicitudCompleta] = await sql`
      SELECT 
        sd.*,
        json_build_object('id', us.id, 'nombre', us.nombre, 'apellido', us.apellido) as solicitante,
        json_build_object('id', ud.id, 'nombre', ud.nombre, 'apellido', ud.apellido) as destinatario,
        to_char(sd.fecha_solicitud, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as fecha_solicitud
      FROM solicitudes_directas sd
      JOIN users us ON sd.solicitante_id = us.id
      JOIN users ud ON sd.destinatario_id = ud.id
      WHERE sd.id = ${solicitud.id};
    `;

    return NextResponse.json(
      {
        id: solicitudCompleta.id,
        solicitante: solicitudCompleta.solicitante,
        destinatario: solicitudCompleta.destinatario,
        turnoSolicitante: {
          fecha: solicitudCompleta.fecha_solicitante,
          horario: solicitudCompleta.horario_solicitante,
          grupoTurno: solicitudCompleta.grupo_solicitante,
        },
        turnoDestinatario: {
          fecha: solicitudCompleta.fecha_destinatario,
          horario: solicitudCompleta.horario_destinatario,
          grupoTurno: solicitudCompleta.grupo_destinatario,
        },
        motivo: solicitudCompleta.motivo,
        prioridad: solicitudCompleta.prioridad,
        estado: solicitudCompleta.estado,
        fechaSolicitud: solicitudCompleta.fecha_solicitud,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating solicitud:", error);
    return NextResponse.json(
      { error: "Error inesperado al crear la solicitud" },
      { status: 500 }
    );
  }
}