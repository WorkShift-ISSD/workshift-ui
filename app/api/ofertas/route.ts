// app/api/ofertas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import postgres from 'postgres';
import {
  EstadoOferta,
  TipoOferta,
  Prioridad,
  isValidEstadoOferta,
  isValidTipoOferta,
  isValidPrioridad,
  isValidTipoSolicitud,
  TipoSolicitud
} from '../../lib/enum';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);


// GET - Obtener todas las ofertas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    // Obtener usuario logueado
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: string | null = null;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        userId = payload.id as string;
      } catch (e) {
        // token inválido, continuar sin filtrar
      }
    }


    const ofertas = await sql`
  SELECT 
    o.*,
    json_build_object(
      'id', u.id,
      'nombre', u.nombre,
      'apellido', u.apellido,
      'rol', u.rol,
      'calificacion', COALESCE(u.calificacion, 4.5),
      'totalIntercambios', COALESCE(u.total_intercambios, 0)
    ) as ofertante,
    json_build_object(
      'id', t.id,
      'nombre', t.nombre,
      'apellido', t.apellido
    ) as tomador,
    (
  SELECT json_agg(json_build_object(
    'fecha', sd.fecha_solicitante::text,
    'tomadorId', sd.solicitante_id::text,
    'tomadorNombre', us.nombre,
    'tomadorApellido', us.apellido
  ))
  FROM solicitudes_directas sd
  JOIN autorizaciones a ON a.solicitud_id = sd.id
  JOIN users us ON us.id = sd.solicitante_id
  WHERE sd.oferta_id = o.id
    AND a.estado IN ('PENDIENTE', 'APROBADA')
) as fechas_acordadas,
(
  SELECT a.estado
  FROM solicitudes_directas sd
  JOIN autorizaciones a ON a.solicitud_id = sd.id
  WHERE sd.oferta_id = o.id
  LIMIT 1
) as estado_autorizacion
  FROM ofertas o
  JOIN users u ON o.ofertante_id = u.id
  LEFT JOIN users t ON o.tomador_id = t.id
  WHERE o.estado IN (
    ${EstadoOferta.DISPONIBLE}, 
    ${EstadoOferta.SOLICITADO}, 
    ${EstadoOferta.APROBADO},
    ${EstadoOferta.COMPLETADO},
    ${EstadoOferta.CANCELADO}
  )
  AND (
    o.ofertante_id = ${userId}::uuid
    OR o.modalidad_busqueda != 'ABIERTO'
    OR o.fechas_disponibles IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM sanciones s
      WHERE s.empleado_id = ${userId}::uuid
        AND s.estado = 'ACTIVA'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE 
              WHEN jsonb_typeof(o.fechas_disponibles) = 'array' THEN o.fechas_disponibles
              ELSE (o.fechas_disponibles#>>'{}')::jsonb
            END
          ) fd
        WHERE (fd->>'fecha') != '' AND (fd->>'fecha')::date BETWEEN s.fecha_desde AND s.fecha_hasta  
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM licencias l
      WHERE l.empleado_id = ${userId}::uuid
        AND l.estado IN ('APROBADA', 'ACTIVA')
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE 
              WHEN jsonb_typeof(o.fechas_disponibles) = 'array' THEN o.fechas_disponibles
              ELSE (o.fechas_disponibles#>>'{}')::jsonb
            END
          ) fd
          WHERE (fd->>'fecha')::date BETWEEN l.fecha_desde AND l.fecha_hasta
        )
    )
  )
  ORDER BY o.publicado DESC;
`;

    const ofertasFormateadas = ofertas.map(o => ({
      id: o.id,
      ofertante: o.ofertante,
      tomador: o.tomador?.id ? o.tomador : null,
      tipo: o.tipo,
      modalidadBusqueda: o.modalidad_busqueda,
      turnoOfrece: o.turno_ofrece ?
        (typeof o.turno_ofrece === 'string' ?
          JSON.parse(o.turno_ofrece) :
          o.turno_ofrece
        ) : null,
      turnosBusca: o.turnos_busca ?
        (typeof o.turnos_busca === 'string' ?
          JSON.parse(o.turnos_busca) :
          o.turnos_busca
        ) : null,
      fechasDisponibles: o.fechas_disponibles ?
        (typeof o.fechas_disponibles === 'string' ?
          JSON.parse(o.fechas_disponibles) :
          o.fechas_disponibles
        ) : null,
      fechaDesde: o.fecha_desde || null,
      fechaHasta: o.fecha_hasta || null,
      horarioRango: o.horario_rango || null,
      descripcion: o.descripcion,
      prioridad: o.prioridad,
      estado: o.estado,
      validoHasta: o.valido_hasta,
      publicado: o.publicado,
      fechasAcordadas: o.fechas_acordadas ?
        (typeof o.fechas_acordadas === 'string' ? JSON.parse(o.fechas_acordadas) : o.fechas_acordadas)
        : null,
      estadoAutorizacion: o.estado_autorizacion,
    }));

    return NextResponse.json(ofertasFormateadas);
  } catch (error) {
    console.error('Error en GET /api/ofertas:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener ofertas',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    const userId = payload.id as string;


    // Obtener datos del usuario
    const [usuario] = await sql`
      SELECT id, horario, grupo_turno 
      FROM users 
      WHERE id = ${userId}::uuid;
    `;

    if (!usuario) {
      console.error('❌ Usuario no existe:', userId);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    //  Validar tipo (OFREZCO o BUSCO)
    if (!isValidTipoOferta(body.tipo)) {
      return NextResponse.json(
        { error: `Tipo de oferta inválido: "${body.tipo}". Debe ser: ${Object.values(TipoOferta).join(' o ')}` },
        { status: 400 }
      );
    }

    //  Validar modalidadBusqueda (INTERCAMBIO o ABIERTO)
    if (!isValidTipoSolicitud(body.modalidadBusqueda)) {
      return NextResponse.json(
        { error: `Modalidad inválida: "${body.modalidadBusqueda}". Debe ser: ${Object.values(TipoSolicitud).join(' o ')}` },
        { status: 400 }
      );
    }

    if (body.prioridad && !isValidPrioridad(body.prioridad)) {
      return NextResponse.json(
        { error: `Prioridad inválida. Debe ser: ${Object.values(Prioridad).join(', ')}` },
        { status: 400 }
      );
    }

    const hoy = new Date().toISOString().split('T')[0];


    const [sancionUsuario] = await sql`
  SELECT 1 FROM sanciones
  WHERE empleado_id = ${userId}::uuid
    AND estado = 'ACTIVA'
    AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
  LIMIT 1;
`;
    if (sancionUsuario) {
      return NextResponse.json(
        { error: 'Tenés una sanción activa y no podés publicar ofertas' },
        { status: 400 }
      );
    }

    const [licenciaUsuario] = await sql`
  SELECT 1 FROM licencias
  WHERE empleado_id = ${userId}::uuid
    AND estado IN ('APROBADA', 'ACTIVA')
    AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
  LIMIT 1;
`;
    if (licenciaUsuario) {
      return NextResponse.json(
        { error: 'Tenés una licencia activa y no podés publicar ofertas' },
        { status: 400 }
      );
    }


    // Calcular valido_hasta
    const diasValidez = body.diasValidez || 7;
    const validoHasta = new Date();
    validoHasta.setDate(validoHasta.getDate() + diasValidez);


    // Validar licencia en la fecha que ofrece (intercambio)
    if (body.fechaOfrece) {
      const [licenciaEnFecha] = await sql`
    SELECT 1 FROM licencias
    WHERE empleado_id = ${userId}::uuid
      AND estado IN ('APROBADA', 'ACTIVA')
      AND ${body.fechaOfrece}::date BETWEEN fecha_desde AND fecha_hasta
    LIMIT 1;
  `;
      if (licenciaEnFecha) {
        return NextResponse.json(
          { error: 'Tenés una licencia aprobada para ese día y no podés ofrecerlo' },
          { status: 400 }
        );
      }
    }

    // Validar licencia en fechas disponibles (abierto)
    if (body.fechasDisponibles?.length > 0) {
      for (const fd of body.fechasDisponibles) {
        if (!fd.fecha) continue;
        const [licenciaEnFecha] = await sql`
      SELECT 1 FROM licencias
      WHERE empleado_id = ${userId}::uuid
        AND estado IN ('APROBADA', 'ACTIVA')
        AND ${fd.fecha}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;
        if (licenciaEnFecha) {
          return NextResponse.json(
            { error: `Tenés una licencia aprobada para el ${fd.fecha} y no podés publicar esa fecha` },
            { status: 400 }
          );
        }
      }
    }

    // Verificar autorizaciones pendientes para intercambio
    if (body.fechaOfrece) {
      const [autorizacionPendiente] = await sql`
    SELECT 1 FROM autorizaciones a
    JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
    WHERE a.estado = 'PENDIENTE'
      AND (
        (sd.solicitante_id = ${userId}::uuid AND sd.fecha_solicitante = ${body.fechaOfrece}::date)
        OR
        (sd.destinatario_id = ${userId}::uuid AND sd.fecha_destinatario = ${body.fechaOfrece}::date)
        OR
        (sd.destinatario_id = ${userId}::uuid AND sd.fecha_destinatario IS NULL AND sd.fecha_solicitante = ${body.fechaOfrece}::date)
      )
    LIMIT 1;
  `;
      if (autorizacionPendiente) {
        return NextResponse.json(
          { error: 'Ya tenés una autorización pendiente para esa fecha' },
          { status: 400 }
        );
      }
    }

    // Verificar para cobertura
    if (body.fechasDisponibles?.length > 0) {
      for (const fd of body.fechasDisponibles) {
        if (!fd.fecha) continue;
        const [autorizacionPendiente] = await sql`
          SELECT 1 FROM autorizaciones a
          JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
          WHERE a.estado = 'PENDIENTE'
          AND (
            (sd.solicitante_id = ${userId}::uuid AND sd.fecha_solicitante = ${fd.fecha}::date)
          OR
            (sd.destinatario_id = ${userId}::uuid AND sd.fecha_destinatario = ${fd.fecha}::date)
          OR
            (sd.destinatario_id = ${userId}::uuid AND sd.fecha_destinatario IS NULL AND sd.fecha_solicitante = ${fd.fecha}::date)
            )
          LIMIT 1;
          `;
        if (autorizacionPendiente) {
          return NextResponse.json(
            { error: `Ya tenés una autorización pendiente para el ${fd.fecha}` },
            { status: 400 }
          );
        }
      }
    }

    // Construir datos según modalidad
    let turnoOfrece = null;
    let turnosBusca = null;
    let fechasDisponibles = null;
    let fechaDesde = null;
    let fechaHasta = null;
    let horarioRango = null;


    if (body.usaRangoDisponibles && body.rangoDisponibles?.desde && body.rangoDisponibles?.hasta) {
      fechaDesde = body.rangoDisponibles.desde;
      fechaHasta = body.rangoDisponibles.hasta;
    } else if (body.usaRangoBusca && body.rangoBusca?.desde && body.rangoBusca?.hasta) {
      fechaDesde = body.rangoBusca.desde;
      fechaHasta = body.rangoBusca.hasta;
    }

    if (body.usaRangoDisponibles && body.rangoDisponibles?.horario) {
      horarioRango = body.rangoDisponibles.horario;
    } else if (body.usaRangoBusca && body.rangoBusca?.horario) {
      horarioRango = body.rangoBusca.horario;
    }

    if (body.modalidadBusqueda === TipoSolicitud.INTERCAMBIO) {
      if (body.tipo === 'OFREZCO') {
        if (body.fechaOfrece) {
          turnoOfrece = {
            fecha: body.fechaOfrece,
            horario: body.horarioOfrece || usuario.horario,
            grupoTurno: body.grupoOfrece || usuario.grupo_turno
          };
        }
        if (!body.usaRangoBusca && body.fechasBusca?.length > 0) {
          const validas = body.fechasBusca.filter((f: any) => f.fecha && f.fecha.trim() !== '');
          if (validas.length > 0) turnosBusca = validas;
        }
      } else {
        // BUSCO_INTERCAMBIO
        if (body.fechasBusca?.length > 0) {
          const validas = body.fechasBusca.filter((f: any) => f.fecha && f.fecha.trim() !== '');
          if (validas.length > 0) turnosBusca = validas;
        }
        if (body.usaRangoDisponibles) {
          turnoOfrece = {
            fecha: body.rangoDisponibles?.desde,
            horario: body.rangoDisponibles?.horario || usuario.horario,
            grupoTurno: usuario.grupo_turno
          };
        } else if (body.fechasDisponibles?.length > 0) {
          const validas = body.fechasDisponibles.filter((f: any) => f.fecha && f.fecha.trim() !== '');
          if (validas.length > 0) {
            fechasDisponibles = validas;
            turnoOfrece = {
              fecha: validas[0].fecha,
              horario: validas[0].horario || usuario.horario,
              grupoTurno: usuario.grupo_turno
            };
          }
        }
      }
    } else if (body.modalidadBusqueda === TipoSolicitud.ABIERTO) {
      if (!body.usaRangoDisponibles && body.fechasDisponibles?.length > 0) {
        const validas = body.fechasDisponibles.filter((f: any) => f.fecha && f.fecha.trim() !== '');
        if (validas.length > 0) fechasDisponibles = validas;
      }
    }


    // Insertar oferta
    const resultado = await sql`
    INSERT INTO ofertas (
        ofertante_id,
        tipo,
        modalidad_busqueda,
        turno_ofrece,
        turnos_busca,
        fechas_disponibles,
        fecha_desde,
        fecha_hasta,
        horario_rango,
        descripcion,
        prioridad,
        estado,
        valido_hasta,
        publicado
    ) VALUES (
        ${userId}::uuid,
        ${body.tipo},
        ${body.modalidadBusqueda},
        ${turnoOfrece ? JSON.stringify(turnoOfrece) : null}::jsonb,
        ${turnosBusca ? JSON.stringify(turnosBusca) : null}::jsonb,
        ${fechasDisponibles ? JSON.stringify(fechasDisponibles) : null}::jsonb,
        ${fechaDesde},
        ${fechaHasta},
        ${horarioRango},
        ${body.descripcion},
        ${body.prioridad || Prioridad.NORMAL},
        ${EstadoOferta.DISPONIBLE},
        ${validoHasta.toISOString()},
        NOW()
    )
    RETURNING *;
`;

    const oferta = resultado[0];

    // Obtener oferta completa
    const ofertaCompleta = await sql`
      SELECT 
        o.*,
        json_build_object(
          'id', u.id,
          'nombre', u.nombre,
          'apellido', u.apellido,
          'rol', u.rol,
          'calificacion', COALESCE(u.calificacion, 4.5),
          'totalIntercambios', COALESCE(u.total_intercambios, 0)
        ) as ofertante
      FROM ofertas o
      JOIN users u ON o.ofertante_id = u.id
      WHERE o.id = ${oferta.id};
    `;

    const ofertaFinal = ofertaCompleta[0];

    return NextResponse.json({
      id: ofertaFinal.id,
      ofertante: ofertaFinal.ofertante,
      tipo: ofertaFinal.tipo,
      modalidadBusqueda: ofertaFinal.modalidad_busqueda,
      turnoOfrece: ofertaFinal.turno_ofrece ?
        (typeof ofertaFinal.turno_ofrece === 'string' ?
          JSON.parse(ofertaFinal.turno_ofrece) :
          ofertaFinal.turno_ofrece
        ) : null,
      turnosBusca: ofertaFinal.turnos_busca ?
        (typeof ofertaFinal.turnos_busca === 'string' ?
          JSON.parse(ofertaFinal.turnos_busca) :
          ofertaFinal.turnos_busca
        ) : null,
      fechasDisponibles: ofertaFinal.fechas_disponibles ?
        (typeof ofertaFinal.fechas_disponibles === 'string' ?
          JSON.parse(ofertaFinal.fechas_disponibles) :
          ofertaFinal.fechas_disponibles
        ) : null,
      fechaDesde: ofertaFinal.fecha_desde || null,
      fechaHasta: ofertaFinal.fecha_hasta || null,
      horarioRango: ofertaFinal.horario_rango || null,
      descripcion: ofertaFinal.descripcion,
      prioridad: ofertaFinal.prioridad,
      estado: ofertaFinal.estado,
      validoHasta: ofertaFinal.valido_hasta,
      publicado: ofertaFinal.publicado,
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Error creating oferta:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Error al crear oferta',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}