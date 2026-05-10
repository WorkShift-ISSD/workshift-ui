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
    const usuario = searchParams.get('usuario');

    // Si pide solo sus movimientos
    if (usuario === 'yo') {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;

      if (!token) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
      }

      const { payload } = await jwtVerify(token, SECRET_KEY);
      const userId = payload.id as string;

      const solicitudes = await sql`
        SELECT 
          sd.id, sd.estado, sd.motivo, sd.prioridad, sd.fecha_solicitud,
          sd.turno_solicitante, sd.turno_destinatario, sd.origen,
          json_build_object('id', us.id, 'nombre', us.nombre, 'apellido', us.apellido, 'rol', us.rol, 'horario', us.horario) as solicitante,
          json_build_object('id', ud.id, 'nombre', ud.nombre, 'apellido', ud.apellido, 'rol', ud.rol, 'horario', ud.horario) as destinatario
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        WHERE sd.solicitante_id = ${userId}::uuid 
            OR sd.destinatario_id = ${userId}::uuid
        ORDER BY sd.fecha_solicitud DESC;
      `;

      return NextResponse.json(solicitudes.map((s: any) => ({
        id: s.id, estado: s.estado, motivo: s.motivo, prioridad: s.prioridad,
        fechaSolicitud: s.fecha_solicitud, fechaRespuesta: null,
        solicitante: s.solicitante, destinatario: s.destinatario,
        turnoSolicitante: typeof s.turno_solicitante === 'string' ? JSON.parse(s.turno_solicitante) : s.turno_solicitante,
        turnoDestinatario: typeof s.turno_destinatario === 'string' ? JSON.parse(s.turno_destinatario) : s.turno_destinatario,
        origen: s.origen, 
      })));
    }


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
          sd.origen,
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
        origen: s.origen,
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


    const hoy = new Date().toISOString().split('T')[0];

    const [sancionSolicitante] = await sql`
  SELECT 1 FROM sanciones
  WHERE empleado_id = ${solicitanteId}::uuid
    AND estado = 'ACTIVA'
    AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
  LIMIT 1;
`;
    if (sancionSolicitante) {
      return NextResponse.json(
        { error: 'Tenés una sanción activa y no podés realizar solicitudes de cambio' },
        { status: 400 }
      );
    }


    const [licenciaSolicitante] = await sql`
  SELECT 1 FROM licencias
  WHERE empleado_id = ${solicitanteId}::uuid
    AND estado IN ('APROBADA', 'ACTIVA')
    AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
  LIMIT 1;
`;
    if (licenciaSolicitante) {
      return NextResponse.json(
        { error: 'Tenés una licencia activa y no podés realizar solicitudes de cambio' },
        { status: 400 }
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


    // La fecha a validar para el destinatario es:
    // - En intercambio: fechaDestinatario (el turno que él da a cambio)
    // - En cobertura: fechaSolicitante (el día que va a cubrir)
    const fechaAValidarDestinatario = fechaDestinatario || fechaSolicitante;

    const [sancionDestinatario] = await sql`
  SELECT 1 FROM sanciones
  WHERE empleado_id = ${destinatarioId}::uuid
    AND estado = 'ACTIVA'
    AND ${fechaAValidarDestinatario}::date BETWEEN fecha_desde AND fecha_hasta
  LIMIT 1;
`;
    if (sancionDestinatario) {
      return NextResponse.json(
        { error: 'El compañero tiene una sanción para ese día y no puede realizar cambios de turno' },
        { status: 400 }
      );
    }

    const [licenciaDestinatario] = await sql`
  SELECT 1 FROM licencias
  WHERE empleado_id = ${destinatarioId}::uuid
    AND estado IN ('APROBADA', 'ACTIVA')
    AND ${fechaAValidarDestinatario}::date BETWEEN fecha_desde AND fecha_hasta
  LIMIT 1;
`;
    if (licenciaDestinatario) {
      return NextResponse.json(
        { error: 'El compañero tiene una licencia para ese día y no puede realizar cambios de turno' },
        { status: 400 }
      );
    }



    // Licencia del solicitante en la fecha de su turno
    if (fechaSolicitante) {
      const [licenciaSolicitanteEnFecha] = await sql`
    SELECT 1 FROM licencias
    WHERE empleado_id = ${solicitanteId}::uuid
      AND estado IN ('APROBADA', 'ACTIVA')
      AND ${fechaSolicitante}::date BETWEEN fecha_desde AND fecha_hasta
    LIMIT 1;
  `;
      if (licenciaSolicitanteEnFecha) {
        return NextResponse.json(
          { error: 'Tenés una licencia aprobada para ese día y no podés ofrecerlo a cambio' },
          { status: 400 }
        );
      }
    }

    // Verificar si ya hay una autorización pendiente para esa fecha
    console.log('Verificando autorizacion pendiente para:', fechaSolicitante, 'solicitanteId:', solicitanteId);
    const [autorizacionPendiente] = await sql`
  SELECT 1 FROM autorizaciones a
  JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
  WHERE a.estado = 'PENDIENTE'
  AND (
    (sd.solicitante_id = ${solicitanteId}::uuid AND sd.fecha_solicitante = ${fechaSolicitante}::date)
    OR
    (sd.destinatario_id = ${solicitanteId}::uuid AND sd.fecha_destinatario = ${fechaDestinatario || null}::date)
    OR
    (sd.destinatario_id = ${solicitanteId}::uuid AND sd.fecha_destinatario IS NULL AND sd.fecha_solicitante = ${fechaSolicitante}::date)
  )
  LIMIT 1;
`;
    console.log('resultado:', autorizacionPendiente);
    if (autorizacionPendiente) {
      return NextResponse.json(
        { error: 'Ya tenés una autorización pendiente para esa fecha' },
        { status: 400 }
      );
    }

    // Validar campos obligatorios — fechaDestinatario es opcional (cobertura)
    const camposFaltantes = [];
    if (!destinatarioId) camposFaltantes.push('destinatarioId');
    if (!fechaSolicitante) camposFaltantes.push('fechaSolicitante');
    if (!horarioSolicitante) camposFaltantes.push('horarioSolicitante');
    if (!grupoSolicitante) camposFaltantes.push('grupoSolicitante');
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

    const turnoDestinatario = fechaDestinatario ? {
      fecha: fechaDestinatario,
      horario: horarioDestinatario,
      grupoTurno: grupoDestinatario
    } : null;

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
    ${turnoDestinatario ? JSON.stringify(turnoDestinatario) : null},
    ${fechaSolicitante}::date,
    ${horarioSolicitante},
    ${grupoSolicitante},
    ${fechaDestinatario || null},
    ${horarioDestinatario || null},
    ${grupoDestinatario || null},
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
      turnoDestinatario,
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