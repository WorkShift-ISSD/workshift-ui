// app/api/solicitudes-directas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const sql = postgres(process.env.POSTGRES_URL!, { 
  ssl: 'require', 
  prepare: false 
});

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
          sd.fecha_solicitud,
          sd.turno_solicitante,
          sd.turno_destinatario,
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
          ) as destinatario
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
          sd.fecha_solicitud,
          sd.turno_solicitante,
          sd.turno_destinatario,
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
          ) as destinatario
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        ORDER BY sd.fecha_solicitud DESC;
      `;
    }

    const solicitudes = await query;

    // Formatear la respuesta
    const solicitudesFormateadas = solicitudes.map((s: any) => ({
      id: s.id,
      estado: s.estado,
      motivo: s.motivo,
      prioridad: s.prioridad,
      fechaSolicitud: s.fecha_solicitud,
      solicitante: s.solicitante,
      destinatario: s.destinatario,
      turnoSolicitante: typeof s.turno_solicitante === 'string' ? 
        JSON.parse(s.turno_solicitante) : s.turno_solicitante,
      turnoDestinatario: typeof s.turno_destinatario === 'string' ? 
        JSON.parse(s.turno_destinatario) : s.turno_destinatario,
    }));

    return NextResponse.json(solicitudesFormateadas);
  } catch (error) {
    console.error('❌ Error fetching solicitudes:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: 'Error al obtener solicitudes',
        details: error instanceof Error ? error.message : String(error)
      },
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

    // Construir objetos JSONB para los turnos
    const turnoSolicitante = {
      fecha: fechaSolicitante,
      horario: horarioSolicitante,
      grupoTurno: grupoSolicitante
    };

    const turnoDestinatario = {
      fecha: fechaDestinatario,
      horario: horarioDestinatario,
      grupoTurno: grupoDestinatario
    };

    // Insertar la solicitud
    const [nuevaSolicitud] = await sql`
      INSERT INTO solicitudes_directas (
        solicitante_id,
        destinatario_id,
        turno_solicitante,
        turno_destinatario,
        motivo,
        prioridad,
        estado,
        fecha_solicitud
      ) VALUES (
        ${solicitanteId}::uuid,
        ${destinatarioId}::uuid,
        ${JSON.stringify(turnoSolicitante)}::jsonb,
        ${JSON.stringify(turnoDestinatario)}::jsonb,
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
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}