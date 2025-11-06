// app/api/solicitudes-directas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

// GET - Obtener solicitudes directas
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
            'apellido', us.apellido,
            'horario', us.horario
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido,
            'horario', ud.horario
          ) as destinatario,
          json_build_object(
            'fecha', sd.fecha_solicitante,
            'horario', us.horario,
            'grupoTurno', sd.grupo_solicitante
          ) as "turnoSolicitante",
          json_build_object(
            'fecha', sd.fecha_destinatario,
            'horario', ud.horario,
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
            'apellido', us.apellido,
            'horario', us.horario
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido,
            'horario', ud.horario
          ) as destinatario,
          json_build_object(
            'fecha', sd.fecha_solicitante,
            'horario', us.horario,
            'grupoTurno', sd.grupo_solicitante
          ) as "turnoSolicitante",
          json_build_object(
            'fecha', sd.fecha_destinatario,
            'horario', ud.horario,
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Body recibido:', body);

    // ✅ Obtener el usuario autenticado del token JWT
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar y decodificar el token
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const solicitanteId = payload.id as string;

    console.log('✅ Usuario autenticado:', solicitanteId);

    const {
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

    // Validar campos obligatorios
    if (
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

    // Verificar que el solicitante no se envíe una solicitud a sí mismo
    if (solicitanteId === destinatarioId) {
      return NextResponse.json(
        { error: 'No puedes enviarte una solicitud a ti mismo' },
        { status: 400 }
      );
    }

    // Verificar que ambos usuarios existan
    const [solicitante] = await sql`
      SELECT id FROM users WHERE id = ${solicitanteId}::uuid;
    `;
    
    const [destinatario] = await sql`
      SELECT id FROM users WHERE id = ${destinatarioId}::uuid;
    `;

    if (!solicitante || !destinatario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Usuarios validados');

    // Insertar la solicitud
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
        ${solicitanteId}::uuid,
        ${destinatarioId}::uuid,
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

    console.log('✅ Solicitud creada:', nuevaSolicitud);

    return NextResponse.json(
      { message: 'Solicitud creada correctamente', solicitud: nuevaSolicitud },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error en POST /api/solicitudes-directas:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}