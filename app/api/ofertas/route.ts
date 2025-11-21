// app/api/ofertas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

// GET - Obtener todas las ofertas (sin cambios)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    
    let query;
    if (estado) {
      query = sql`
        SELECT 
          o.*,
          json_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'apellido', u.apellido,
            'rol', u.rol,
            'calificacion', COALESCE(u.calificacion, 4.5),
            'total_intercambios', COALESCE(u.total_intercambios, 0)
          ) as ofertante,
          to_char(o.fecha_ofrece, 'YYYY-MM-DD') as fecha_ofrece,
          to_char(o.fecha_busca, 'YYYY-MM-DD') as fecha_busca,
          to_char(o.fecha_desde, 'YYYY-MM-DD') as fecha_desde,
          to_char(o.fecha_hasta, 'YYYY-MM-DD') as fecha_hasta,
          to_char(o.publicado, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as publicado
        FROM ofertas o
        JOIN users u ON o.ofertante_id = u.id
        WHERE o.estado = ${estado}
        ORDER BY o.publicado DESC;
      `;
    } else {
      query = sql`
        SELECT 
          o.*,
          json_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'apellido', u.apellido,
            'rol', u.rol,
            'calificacion', COALESCE(u.calificacion, 4.5),
            'total_intercambios', COALESCE(u.total_intercambios, 0)
          ) as ofertante,
          to_char(o.fecha_ofrece, 'YYYY-MM-DD') as fecha_ofrece,
          to_char(o.fecha_busca, 'YYYY-MM-DD') as fecha_busca,
          to_char(o.fecha_desde, 'YYYY-MM-DD') as fecha_desde,
          to_char(o.fecha_hasta, 'YYYY-MM-DD') as fecha_hasta,
          to_char(o.publicado, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as publicado
        FROM ofertas o
        JOIN users u ON o.ofertante_id = u.id
        ORDER BY o.publicado DESC;
      `;
    }

    const ofertas = await query;
    
    const ofertasFormateadas = ofertas.map((o: any) => ({
      id: o.id,
      ofertante: o.ofertante,
      tipo: o.tipo,
      turnoOfrece: o.tipo !== 'ABIERTO' ? {
        fecha: o.fecha_ofrece,
        horario: o.horario_ofrece,
        grupoTurno: o.grupo_ofrece,
      } : null,
      turnoBusca: o.tipo === 'INTERCAMBIO' ? {
        fecha: o.fecha_busca,
        horario: o.horario_busca,
        grupoTurno: o.grupo_busca,
      } : null,
      rangoFechas: o.tipo === 'ABIERTO' ? {
        desde: o.fecha_desde,
        hasta: o.fecha_hasta,
      } : undefined,
      descripcion: o.descripcion,
      prioridad: o.prioridad,
      validoHasta: o.valido_hasta,
      publicado: o.publicado,
      estado: o.estado,
    }));

    return NextResponse.json(ofertasFormateadas);
  } catch (error) {
    console.error('Error fetching ofertas:', error);
    return NextResponse.json(
      { error: 'Error al obtener ofertas' }, 
      { status: 500 }
    );
  }
}

// POST - Crear nueva oferta
// POST - Crear nueva oferta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Body recibido:', body);
    console.log('🔍 Tipo:', body.tipo);
    console.log('🔍 Modalidad:', body.modalidadBusqueda);
    
    // ✅ Obtener userId del token JWT
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
    
    // Verificar que el usuario existe
    const [userExists] = await sql`
      SELECT id FROM users WHERE id = ${userId}::uuid;
    `;
    
    if (!userExists) {
      console.error('❌ Usuario no existe:', userId);
      return NextResponse.json(
        { error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    }
    
    console.log('✅ Usuario encontrado:', userExists);
    
    // Determinar qué campos usar según el tipo y modalidad
    let fechaOfrece = null;
    let horarioOfrece = null;
    let grupoOfrece = null;
    let fechaBusca = null;
    let horarioBusca = null;
    let grupoBusca = null;
    let fechaDesde = null;
    let fechaHasta = null;

    if (body.modalidadBusqueda === 'INTERCAMBIO') {
      // Para intercambio, usar fechaOfrece y fechasBusca
      if (body.tipo === 'OFREZCO') {
        fechaOfrece = body.fechaOfrece;
        horarioOfrece = body.horarioOfrece;
        grupoOfrece = body.grupoOfrece;
        // Por ahora, tomar la primera fecha que busca
        if (body.fechasBusca && body.fechasBusca[0]) {
          fechaBusca = body.fechasBusca[0].fecha;
          horarioBusca = body.fechasBusca[0].horario;
        }
      } else if (body.tipo === 'BUSCO') {
        fechaOfrece = body.fechaOfrece;
        horarioOfrece = body.horarioOfrece;
        grupoOfrece = body.grupoOfrece;
        if (body.fechasBusca && body.fechasBusca[0]) {
          fechaBusca = body.fechasBusca[0].fecha;
          horarioBusca = body.fechasBusca[0].horario;
        }
      }
    } else if (body.modalidadBusqueda === 'ABIERTO') {
      // Para abierto, usar fechasDisponibles
      if (body.fechasDisponibles && body.fechasDisponibles.length > 0) {
        // Tomar la primera y última fecha del array
        const fechas = body.fechasDisponibles.map((f: any) => f.fecha).sort();
        fechaDesde = fechas[0];
        fechaHasta = fechas[fechas.length - 1];
      }
    }

    console.log('📅 Fechas procesadas:', {
      fechaOfrece,
      horarioOfrece,
      grupoOfrece,
      fechaBusca,
      horarioBusca,
      grupoBusca,
      fechaDesde,
      fechaHasta
    });
    
    const [oferta] = await sql`
      INSERT INTO ofertas (
        ofertante_id,
        tipo,
        fecha_ofrece,
        horario_ofrece,
        grupo_ofrece,
        fecha_busca,
        horario_busca,
        grupo_busca,
        fecha_desde,
        fecha_hasta,
        descripcion,
        prioridad,
        estado,
        valido_hasta,
        publicado
      ) VALUES (
        ${userId}::uuid,
        ${body.tipo},
        ${fechaOfrece},
        ${horarioOfrece},
        ${grupoOfrece},
        ${fechaBusca},
        ${horarioBusca},
        ${grupoBusca},
        ${fechaDesde},
        ${fechaHasta},
        ${body.descripcion},
        ${body.prioridad},
        'DISPONIBLE',
        NOW() + INTERVAL '7 days',
        NOW()
      )
      RETURNING 
        *,
        to_char(publicado, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as publicado_formatted;
    `;
    
    console.log('✅ Oferta insertada:', oferta);

    // Obtener datos completos con el ofertante
    const [ofertaCompleta] = await sql`
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
        to_char(o.publicado, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as publicado
      FROM ofertas o
      JOIN users u ON o.ofertante_id = u.id
      WHERE o.id = ${oferta.id};
    `;

    console.log('✅ Oferta completa:', ofertaCompleta);

    return NextResponse.json({
      id: ofertaCompleta.id,
      ofertante: ofertaCompleta.ofertante,
      tipo: ofertaCompleta.tipo,
      turnoOfrece: ofertaCompleta.tipo !== 'ABIERTO' ? {
        fecha: ofertaCompleta.fecha_ofrece,
        horario: ofertaCompleta.horario_ofrece,
        grupoTurno: ofertaCompleta.grupo_ofrece,
      } : null,
      turnoBusca: ofertaCompleta.tipo === 'INTERCAMBIO' ? {
        fecha: ofertaCompleta.fecha_busca,
        horario: ofertaCompleta.horario_busca,
        grupoTurno: ofertaCompleta.grupo_busca,
      } : null,
      rangoFechas: ofertaCompleta.fecha_desde && ofertaCompleta.fecha_hasta ? {
        desde: ofertaCompleta.fecha_desde,
        hasta: ofertaCompleta.fecha_hasta,
      } : undefined,
      descripcion: ofertaCompleta.descripcion,
      prioridad: ofertaCompleta.prioridad,
      estado: ofertaCompleta.estado,
      publicado: ofertaCompleta.publicado,
      fechaOfrece: ofertaCompleta.fecha_ofrece,
    }, { status: 201 });
    
  } catch (error) {
    console.error('💥 Error creating oferta:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear oferta',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}