// app/api/ofertas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// GET - Obtener todas las ofertas
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
    
    // Transformar los datos al formato esperado por el frontend
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Body recibido:', body); // Debug
    
    // TODO: Obtener userId de la sesión autenticada
    const userId = '410544b2-4001-4271-9855-fec4b6a6442a'; // Temporal
    
    // Verificar que el usuario existe
    const [userExists] = await sql`
      SELECT id FROM users WHERE id = ${userId};
    `;
    
    if (!userExists) {
      console.error('❌ Usuario no existe:', userId);
      return NextResponse.json(
        { error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    }
    
    console.log('✅ Usuario encontrado:', userExists);
    
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
        ${userId},
        ${body.tipo},
        ${body.tipo !== 'ABIERTO' ? body.fechaOfrece : null},
        ${body.tipo !== 'ABIERTO' ? body.horarioOfrece : null},
        ${body.tipo !== 'ABIERTO' ? body.grupoOfrece : null},
        ${body.tipo === 'INTERCAMBIO' ? body.fechaBusca : null},
        ${body.tipo === 'INTERCAMBIO' ? body.horarioBusca : null},
        ${body.tipo === 'INTERCAMBIO' ? body.grupoBusca : null},
        ${body.tipo === 'ABIERTO' ? body.fechaDesde : null},
        ${body.tipo === 'ABIERTO' ? body.fechaHasta : null},
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
      rangoFechas: ofertaCompleta.tipo === 'ABIERTO' ? {
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