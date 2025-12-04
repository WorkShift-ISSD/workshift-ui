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
            'rol', us.rol,
            'horario', us.horario
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido,
            'rol', ud.rol,
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
            'rol', us.rol,
            'horario', us.horario
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido,
            'rol', ud.rol,
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
      fechaRespuesta: null, // La tabla original no tiene esta columna
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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
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
    console.log('🔥 Body recibido:', JSON.stringify(body, null, 2));

    // ✅ Obtener el usuario autenticado del token JWT
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      console.error('❌ Token no encontrado');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar y decodificar el token
    let solicitanteId: string;
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      solicitanteId = payload.id as string;
      console.log('✅ Usuario autenticado:', solicitanteId);
    } catch (jwtError) {
      console.error('❌ Error verificando JWT:', jwtError);
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

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
    const camposFaltantes = [];
    if (!destinatarioId) camposFaltantes.push('destinatarioId');
    if (!fechaSolicitante) camposFaltantes.push('fechaSolicitante');
    if (!horarioSolicitante) camposFaltantes.push('horarioSolicitante');
    if (!grupoSolicitante) camposFaltantes.push('grupoSolicitante');
    if (!fechaDestinatario) camposFaltantes.push('fechaDestinatario');
    if (!horarioDestinatario) camposFaltantes.push('horarioDestinatario');
    if (!grupoDestinatario) camposFaltantes.push('grupoDestinatario');
    if (!motivo) camposFaltantes.push('motivo');
    if (!prioridad) camposFaltantes.push('prioridad');

    if (camposFaltantes.length > 0) {
      console.error('❌ Campos faltantes:', camposFaltantes);
      return NextResponse.json(
        { 
          error: 'Faltan campos obligatorios',
          camposFaltantes
        },
        { status: 400 }
      );
    }

    // Verificar que el solicitante no se envíe una solicitud a sí mismo
    if (solicitanteId === destinatarioId) {
      console.error('❌ Intento de auto-solicitud');
      return NextResponse.json(
        { error: 'No puedes enviarte una solicitud a ti mismo' },
        { status: 400 }
      );
    }

    // Verificar que ambos usuarios existan
    let solicitante, destinatario;
    try {
      [solicitante] = await sql`
        SELECT id, nombre, apellido, rol FROM users WHERE id = ${solicitanteId}::uuid;
      `;
      
      [destinatario] = await sql`
        SELECT id, nombre, apellido, rol FROM users WHERE id = ${destinatarioId}::uuid;
      `;
    } catch (dbError) {
      console.error('❌ Error consultando usuarios:', dbError);
      return NextResponse.json(
        { error: 'Error al verificar usuarios' },
        { status: 500 }
      );
    }

    if (!solicitante) {
      console.error('❌ Solicitante no encontrado:', solicitanteId);
      return NextResponse.json(
        { error: 'Usuario solicitante no encontrado' },
        { status: 404 }
      );
    }

    if (!destinatario) {
      console.error('❌ Destinatario no encontrado:', destinatarioId);
      return NextResponse.json(
        { error: 'Usuario destinatario no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Usuarios validados:', {
      solicitante: solicitante.nombre + ' ' + solicitante.apellido,
      destinatario: destinatario.nombre + ' ' + destinatario.apellido
    });

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

    console.log('📅 Turnos a intercambiar:', {
      turnoSolicitante,
      turnoDestinatario
    });

    // Insertar la solicitud
    let nuevaSolicitud;
    try {
      [nuevaSolicitud] = await sql`
        INSERT INTO solicitudes_directas (
          solicitante_id,
          destinatario_id,
          turno_solicitante,
          turno_destinatario,
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
          ${JSON.stringify(turnoSolicitante)}::jsonb,
          ${JSON.stringify(turnoDestinatario)}::jsonb,
          ${fechaSolicitante}::date,
          ${horarioSolicitante},
          ${grupoSolicitante},
          ${fechaDestinatario}::date,
          ${horarioDestinatario},
          ${grupoDestinatario},
          ${motivo},
          ${prioridad},
          'SOLICITADO',
          NOW()
        )
        RETURNING *;
      `;
    } catch (insertError) {
      console.error('❌ Error insertando solicitud:', insertError);
      console.error('Error stack:', insertError instanceof Error ? insertError.stack : 'No stack');
      
      // Si es un error de constraint, dar más detalles
      if (insertError instanceof Error && insertError.message.includes('constraint')) {
        return NextResponse.json(
          { 
            error: 'Error de validación en la base de datos',
            details: insertError.message
          },
          { status: 400 }
        );
      }
      
      throw insertError; // Re-lanzar para el catch general
    }

    console.log('✅ Solicitud creada con ID:', nuevaSolicitud.id);

    // Formatear respuesta con la misma estructura que GET
    const respuesta = {
      id: nuevaSolicitud.id,
      estado: nuevaSolicitud.estado,
      motivo: nuevaSolicitud.motivo,
      prioridad: nuevaSolicitud.prioridad,
      fechaSolicitud: nuevaSolicitud.fecha_solicitud,
      fechaRespuesta: null, // La tabla original no tiene esta columna
      solicitante: {
        id: solicitante.id,
        nombre: solicitante.nombre,
        apellido: solicitante.apellido,
        rol: solicitante.rol
      },
      destinatario: {
        id: destinatario.id,
        nombre: destinatario.nombre,
        apellido: destinatario.apellido,
        rol: destinatario.rol
      },
      turnoSolicitante,
      turnoDestinatario
    };

    return NextResponse.json(
      { 
        message: 'Solicitud creada correctamente', 
        solicitud: respuesta 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error en POST /api/solicitudes-directas:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
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