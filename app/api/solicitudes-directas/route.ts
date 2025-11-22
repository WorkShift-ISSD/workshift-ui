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
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    // ✅ Obtener solicitudes con JSONB
    const solicitudes = await sql`
      SELECT 
        sd.id,
        sd.solicitante_id,
        sd.destinatario_id,
        sd.turno_solicitante,
        sd.turno_destinatario,
        sd.motivo,
        sd.prioridad,
        sd.estado,
        sd.fecha_solicitud,
        sd.created_at,
        sd.updated_at,
        -- Datos del solicitante
        u1.nombre as solicitante_nombre,
        u1.apellido as solicitante_apellido,
        u1.rol as solicitante_rol,
        -- Datos del destinatario
        u2.nombre as destinatario_nombre,
        u2.apellido as destinatario_apellido,
        u2.rol as destinatario_rol
      FROM solicitudes_directas sd
      INNER JOIN users u1 ON sd.solicitante_id = u1.id
      INNER JOIN users u2 ON sd.destinatario_id = u2.id
      WHERE sd.solicitante_id = ${userId}::uuid 
         OR sd.destinatario_id = ${userId}::uuid
      ORDER BY sd.fecha_solicitud DESC;
    `;

    // ✅ Formatear respuesta
    const formattedSolicitudes = solicitudes.map(s => ({
      id: s.id,
      solicitante: {
        id: s.solicitante_id,
        nombre: s.solicitante_nombre,
        apellido: s.solicitante_apellido,
        rol: s.solicitante_rol
      },
      destinatario: {
        id: s.destinatario_id,
        nombre: s.destinatario_nombre,
        apellido: s.destinatario_apellido,
        rol: s.destinatario_rol
      },
      turnoSolicitante: s.turno_solicitante,
      turnoDestinatario: s.turno_destinatario,
      motivo: s.motivo,
      prioridad: s.prioridad,
      estado: s.estado,
      fechaSolicitud: s.fecha_solicitud,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return NextResponse.json(formattedSolicitudes);
  } catch (error) {
    console.error('❌ Error en GET /api/solicitudes-directas:', error);
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

    // ✅ Crear objetos JSONB para los turnos
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

    // ✅ Insertar la solicitud usando JSONB
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
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}