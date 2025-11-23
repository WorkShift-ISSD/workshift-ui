// app/api/ofertas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

// GET - Obtener todas las ofertas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    
    let query;
    if (estado) {
      query = sql`
        SELECT 
          o.id,
          o.ofertante_id,
          o.tipo,
          o.modalidad_busqueda,
          o.turno_ofrece,
          o.turnos_busca,
          o.fechas_disponibles,
          o.descripcion,
          o.prioridad,
          o.estado,
          o.publicado,
          o.tomador_id,
          json_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'apellido', u.apellido,
            'rol', u.rol,
            'calificacion', COALESCE(u.calificacion, 4.5),
            'totalIntercambios', COALESCE(u.total_intercambios, 0)
          ) as ofertante,
          CASE 
            WHEN o.tomador_id IS NOT NULL THEN
              json_build_object(
                'id', t.id,
                'nombre', t.nombre,
                'apellido', t.apellido
              )
            ELSE NULL
          END as tomador
        FROM ofertas o
        JOIN users u ON o.ofertante_id = u.id
        LEFT JOIN users t ON o.tomador_id = t.id
        WHERE o.estado = ${estado}
        ORDER BY o.publicado DESC;
      `;
    } else {
      query = sql`
        SELECT 
          o.id,
          o.ofertante_id,
          o.tipo,
          o.modalidad_busqueda,
          o.turno_ofrece,
          o.turnos_busca,
          o.fechas_disponibles,
          o.descripcion,
          o.prioridad,
          o.estado,
          o.publicado,
          o.tomador_id,
          json_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'apellido', u.apellido,
            'rol', u.rol,
            'calificacion', COALESCE(u.calificacion, 4.5),
            'totalIntercambios', COALESCE(u.total_intercambios, 0)
          ) as ofertante,
          CASE 
            WHEN o.tomador_id IS NOT NULL THEN
              json_build_object(
                'id', t.id,
                'nombre', t.nombre,
                'apellido', t.apellido
              )
            ELSE NULL
          END as tomador
        FROM ofertas o
        JOIN users u ON o.ofertante_id = u.id
        LEFT JOIN users t ON o.tomador_id = t.id
        ORDER BY o.publicado DESC;
      `;
    }

    const ofertas = await query;
    
    const ofertasFormateadas = ofertas.map((o: any) => ({
      id: o.id,
      ofertante: o.ofertante,
      tomador: o.tomador,
      tipo: o.tipo,
      modalidadBusqueda: o.modalidad_busqueda,
      turnoOfrece: o.turno_ofrece ? (typeof o.turno_ofrece === 'string' ? JSON.parse(o.turno_ofrece) : o.turno_ofrece) : null,
      turnosBusca: o.turnos_busca ? (typeof o.turnos_busca === 'string' ? JSON.parse(o.turnos_busca) : o.turnos_busca) : null,
      fechasDisponibles: o.fechas_disponibles ? (typeof o.fechas_disponibles === 'string' ? JSON.parse(o.fechas_disponibles) : o.fechas_disponibles) : null,
      descripcion: o.descripcion,
      prioridad: o.prioridad,
      publicado: o.publicado,
      estado: o.estado,
    }));

    return NextResponse.json(ofertasFormateadas);
  } catch (error) {
    console.error('❌ Error fetching ofertas:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: 'Error al obtener ofertas',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}

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
    
    // Construir turnoOfrece, turnosBusca, fechasDisponibles según modalidad
    let turnoOfrece = null;
    let turnosBusca = null;
    let fechasDisponibles = null;

    if (body.modalidadBusqueda === 'INTERCAMBIO') {
      // Para intercambio, siempre hay un turno que se ofrece
      if (body.fechaOfrece) {
        turnoOfrece = {
          fecha: body.fechaOfrece,
          horario: usuario.horario,
          grupoTurno: usuario.grupo_turno
        };
      }
      
      // Y uno o varios turnos que se buscan
      if (body.fechasBusca && body.fechasBusca.length > 0) {
        turnosBusca = body.fechasBusca;
      }
    } else if (body.modalidadBusqueda === 'ABIERTO') {
      // Para abierto, solo fechas disponibles
      if (body.fechasDisponibles && body.fechasDisponibles.length > 0) {
        fechasDisponibles = body.fechasDisponibles;
      }
    }

    console.log('📅 Datos procesados:', {
      turnoOfrece,
      turnosBusca,
      fechasDisponibles
    });
    
    const [oferta] = await sql`
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
        publicado
      ) VALUES (
        ${userId}::uuid,
        ${body.tipo},
        ${body.modalidadBusqueda},
        ${turnoOfrece ? JSON.stringify(turnoOfrece) : null}::jsonb,
        ${turnosBusca ? JSON.stringify(turnosBusca) : null}::jsonb,
        ${fechasDisponibles ? JSON.stringify(fechasDisponibles) : null}::jsonb,
        ${body.descripcion},
        ${body.prioridad},
        'DISPONIBLE',
        NOW()
      )
      RETURNING *;
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
        ) as ofertante
      FROM ofertas o
      JOIN users u ON o.ofertante_id = u.id
      WHERE o.id = ${oferta.id};
    `;

    console.log('✅ Oferta completa:', ofertaCompleta);

    return NextResponse.json({
      id: ofertaCompleta.id,
      ofertante: ofertaCompleta.ofertante,
      tipo: ofertaCompleta.tipo,
      modalidadBusqueda: ofertaCompleta.modalidad_busqueda,
      turnoOfrece: ofertaCompleta.turno_ofrece ? 
        (typeof ofertaCompleta.turno_ofrece === 'string' ? 
          JSON.parse(ofertaCompleta.turno_ofrece) : 
          ofertaCompleta.turno_ofrece
        ) : null,
      turnosBusca: ofertaCompleta.turnos_busca ? 
        (typeof ofertaCompleta.turnos_busca === 'string' ? 
          JSON.parse(ofertaCompleta.turnos_busca) : 
          ofertaCompleta.turnos_busca
        ) : null,
      fechasDisponibles: ofertaCompleta.fechas_disponibles ? 
        (typeof ofertaCompleta.fechas_disponibles === 'string' ? 
          JSON.parse(ofertaCompleta.fechas_disponibles) : 
          ofertaCompleta.fechas_disponibles
        ) : null,
      descripcion: ofertaCompleta.descripcion,
      prioridad: ofertaCompleta.prioridad,
      estado: ofertaCompleta.estado,
      publicado: ofertaCompleta.publicado,
    }, { status: 201 });
    
  } catch (error) {
    console.error('💥 Error creating oferta:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: 'Error al crear oferta',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}