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
        ) as ofertante
      FROM ofertas o
      JOIN users u ON o.ofertante_id = u.id
      WHERE o.estado IN (
        ${EstadoOferta.DISPONIBLE}, 
        ${EstadoOferta.SOLICITADO}, 
        ${EstadoOferta.APROBADO}
      )
        AND o.valido_hasta > NOW()
      ORDER BY o.publicado DESC;
    `;

    const ofertasFormateadas = ofertas.map(o => ({
      id: o.id,
      ofertante: o.ofertante,
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
      descripcion: o.descripcion,
      prioridad: o.prioridad,
      estado: o.estado,
      validoHasta: o.valido_hasta,
      publicado: o.publicado,
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
    console.log('📥 Body recibido:', {
  horarioOfrece: body.horarioOfrece,
  fechaOfrece: body.fechaOfrece,
  tipo: body.tipo,
  bodyCompleto: body
});

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

    console.log('✅ Usuario autenticado:', userId);

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

    console.log('✅ Usuario encontrado:', usuario);

    // ✅ Validar tipo (OFREZCO o BUSCO)
    if (!isValidTipoOferta(body.tipo)) {
      return NextResponse.json(
        { error: `Tipo de oferta inválido: "${body.tipo}". Debe ser: ${Object.values(TipoOferta).join(' o ')}` },
        { status: 400 }
      );
    }

    // ✅ Validar modalidadBusqueda (INTERCAMBIO o ABIERTO)
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


console.log('🔧 Creando turnoOfrece con:', {
  fechaOfrece: body.fechaOfrece,
  horarioOfrece: body.horarioOfrece,
  grupoOfrece: body.grupoOfrece,
  usuarioHorario: usuario.horario,
  horarioFinal: body.horarioOfrece || usuario.horario
});


    // Calcular valido_hasta
    const diasValidez = body.diasValidez || 7;
    const validoHasta = new Date();
    validoHasta.setDate(validoHasta.getDate() + diasValidez);

    // Construir datos según modalidad
    let turnoOfrece = null;
    let turnosBusca = null;
    let fechasDisponibles = null;
    console.log('🔧 Creando turnoOfrece con:', {
  fechaOfrece: body.fechaOfrece,
  horarioOfrece: body.horarioOfrece,
  usuarioHorario: usuario.horario,
  horarioFinal: body.horarioOfrece || usuario.horario
});

    if (body.modalidadBusqueda === TipoSolicitud.INTERCAMBIO) {
      // Para INTERCAMBIO: guardar turno que ofrece y turnos que busca
      if (body.fechaOfrece) {
        turnoOfrece = {
          fecha: body.fechaOfrece,
          horario: body.horarioOfrece || usuario.horario, // ✅ USAR EL DEL FORM
          grupoTurno: body.grupoOfrece || usuario.grupo_turno
        };
      }

      if (body.fechasBusca && body.fechasBusca.length > 0) {
        turnosBusca = body.fechasBusca;
      }
    } else if (body.modalidadBusqueda === TipoSolicitud.ABIERTO) {
      // Para ABIERTO: solo fechas disponibles
      if (body.fechasDisponibles && body.fechasDisponibles.length > 0) {
        fechasDisponibles = body.fechasDisponibles;
      }
    }

    console.log('📅 Datos procesados:', {
      userId,
      tipo: body.tipo,
      modalidadBusqueda: body.modalidadBusqueda,
      turnoOfrece,
      turnosBusca,
      fechasDisponibles,
      validoHasta: validoHasta.toISOString()
    });

    // Insertar oferta
    const resultado = await sql`
      INSERT INTO ofertas (
        ofertante_id,
        tipo,
        modalidad_busqueda,
        turno_ofrece,
        turnos_busca,
        fechas_disponibles,
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
        ${body.descripcion},
        ${body.prioridad || Prioridad.NORMAL},
        ${EstadoOferta.DISPONIBLE},
        ${validoHasta.toISOString()},
        NOW()
      )
      RETURNING *;
    `;

    console.log('💾 GUARDADO EN BD:', {
  turno_ofrece: resultado[0].turno_ofrece,
  tipo: typeof resultado[0].turno_ofrece,
  parseado: typeof resultado[0].turno_ofrece === 'string' 
    ? JSON.parse(resultado[0].turno_ofrece)
    : resultado[0].turno_ofrece
});

    const oferta = resultado[0];
    console.log('✅ Oferta insertada con ID:', oferta.id);

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