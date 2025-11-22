// app/api/ofertas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

// Obtener usuario desde token
async function getUserFromToken(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    throw new Error('No autorizado');
  }

  const { payload } = await jwtVerify(token, SECRET_KEY);
  return payload.id as string;
}

// GET - Obtener todas las ofertas
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request);

    const ofertas = await sql`
      SELECT 
        o.id,
        o.ofertante_id as "ofertanteId",
        o.tomador_id as "tomadorId",
        o.tipo,
        o.modalidad_busqueda as "modalidadBusqueda",
        o.turno_ofrece as "turnoOfrece",
        o.turnos_busca as "turnosBusca",
        o.fechas_disponibles as "fechasDisponibles",
        o.descripcion,
        o.prioridad,
        o.estado,
        to_char(o.publicado, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as publicado,
        o.created_at as "createdAt",
        o.updated_at as "updatedAt",
        -- Datos del ofertante
        jsonb_build_object(
          'id', u_ofertante.id,
          'nombre', u_ofertante.nombre,
          'apellido', u_ofertante.apellido,
          'email', u_ofertante.email,
          'horario', u_ofertante.horario,
          'grupoTurno', u_ofertante.grupo_turno
        ) as ofertante,
        -- Datos del tomador (si existe)
        CASE 
          WHEN o.tomador_id IS NOT NULL THEN
            jsonb_build_object(
              'id', u_tomador.id,
              'nombre', u_tomador.nombre,
              'apellido', u_tomador.apellido,
              'email', u_tomador.email
            )
          ELSE NULL
        END as tomador
      FROM ofertas o
      INNER JOIN users u_ofertante ON o.ofertante_id = u_ofertante.id
      LEFT JOIN users u_tomador ON o.tomador_id = u_tomador.id
      WHERE o.estado IN ('DISPONIBLE', 'TOMADO')
      ORDER BY o.publicado DESC
    `;

    return NextResponse.json(ofertas);
  } catch (error) {
    console.error('❌ Error al obtener ofertas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener ofertas' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva oferta
export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Iniciando POST /api/ofertas');
    
    const userId = await getUserFromToken(request);
    console.log('✅ Usuario autenticado:', userId);

    const body = await request.json();
    console.log('📥 Body recibido:', JSON.stringify(body, null, 2));

    // ✅ IMPORTANTE: Verificar que la query obtenga los datos correctamente
    const userResult = await sql`
      SELECT id, grupo_turno, horario 
      FROM users 
      WHERE id = ${userId}::uuid
    `;
    
    console.log('🔍 Query result:', userResult);
    
    const user = userResult[0];
    
    if (!user) {
      console.error('❌ Usuario no encontrado en DB');
      return NextResponse.json(
        { error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    }

    console.log('✅ Usuario encontrado:', {
      id: user.id,
      grupo_turno: user.grupo_turno,
      horario: user.horario
    });

    // Validar que el usuario tenga horario y grupo asignados
    if (!user.horario) {
      console.error('❌ Usuario sin horario asignado');
      return NextResponse.json(
        { error: 'Tu usuario no tiene un horario asignado. Contacta al administrador.' },
        { status: 400 }
      );
    }

    if (!user.grupo_turno) {
      console.error('❌ Usuario sin grupo de turno asignado');
      return NextResponse.json(
        { error: 'Tu usuario no tiene un grupo de turno asignado. Contacta al administrador.' },
        { status: 400 }
      );
    }

    // Validar campos requeridos
    if (!body.tipo || !body.modalidadBusqueda || !body.descripcion || !body.prioridad) {
      console.error('❌ Campos faltantes en body');
      return NextResponse.json(
        { error: 'Faltan campos requeridos: tipo, modalidadBusqueda, descripcion, prioridad' },
        { status: 400 }
      );
    }

    // Preparar datos según modalidad
    let turnoOfrece = null;
    let turnosBusca = null;
    let fechasDisponibles = null;

    if (body.modalidadBusqueda === 'INTERCAMBIO') {
      if (!body.turnoOfrece?.fecha) {
        console.error('❌ Falta turnoOfrece.fecha');
        return NextResponse.json(
          { error: 'Para INTERCAMBIO se requiere turnoOfrece.fecha' },
          { status: 400 }
        );
      }

      if (!body.turnosBusca || body.turnosBusca.length === 0) {
        console.error('❌ Falta turnosBusca');
        return NextResponse.json(
          { error: 'Para INTERCAMBIO se requiere al menos un turno en turnosBusca' },
          { status: 400 }
        );
      }

      // ✅ Completar turnoOfrece con datos del usuario
      turnoOfrece = {
        fecha: body.turnoOfrece.fecha,
        horario: user.horario,
        grupoTurno: user.grupo_turno
      };

      turnosBusca = body.turnosBusca;

      console.log('✅ turnoOfrece construido:', turnoOfrece);
      console.log('✅ turnosBusca:', turnosBusca);

    } else if (body.modalidadBusqueda === 'ABIERTO') {
      if (!body.fechasDisponibles || body.fechasDisponibles.length === 0) {
        return NextResponse.json(
          { error: 'Para ABIERTO se requiere al menos una fecha en fechasDisponibles' },
          { status: 400 }
        );
      }
      
      fechasDisponibles = body.fechasDisponibles;
      console.log('✅ fechasDisponibles:', fechasDisponibles);
    }

    console.log('📦 Datos finales para INSERT:');
    console.log('  - ofertante_id:', userId);
    console.log('  - tipo:', body.tipo);
    console.log('  - modalidad_busqueda:', body.modalidadBusqueda);
    console.log('  - turno_ofrece:', JSON.stringify(turnoOfrece));
    console.log('  - turnos_busca:', JSON.stringify(turnosBusca));
    console.log('  - fechas_disponibles:', JSON.stringify(fechasDisponibles));

    // Insertar en base de datos
    const insertResult = await sql`
      INSERT INTO ofertas (
        ofertante_id,
        tipo,
        modalidad_busqueda,
        turno_ofrece,
        turnos_busca,
        fechas_disponibles,
        descripcion,
        prioridad,
        estado
      ) VALUES (
        ${userId}::uuid,
        ${body.tipo},
        ${body.modalidadBusqueda},
        ${turnoOfrece ? sql.json(turnoOfrece) : null},
        ${turnosBusca ? sql.json(turnosBusca) : null},
        ${fechasDisponibles ? sql.json(fechasDisponibles) : null},
        ${body.descripcion},
        ${body.prioridad},
        'DISPONIBLE'
      )
      RETURNING id
    `;
    
    const nuevaOferta = insertResult[0];
    console.log('✅ Oferta creada con ID:', nuevaOferta.id);

    // Obtener oferta completa
    const ofertaCompletaResult = await sql`
      SELECT 
        o.id,
        o.ofertante_id as "ofertanteId",
        o.tomador_id as "tomadorId",
        o.tipo,
        o.modalidad_busqueda as "modalidadBusqueda",
        o.turno_ofrece as "turnoOfrece",
        o.turnos_busca as "turnosBusca",
        o.fechas_disponibles as "fechasDisponibles",
        o.descripcion,
        o.prioridad,
        o.estado,
        to_char(o.publicado, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as publicado,
        o.created_at as "createdAt",
        o.updated_at as "updatedAt",
        jsonb_build_object(
          'id', u.id,
          'nombre', u.nombre,
          'apellido', u.apellido,
          'email', u.email,
          'horario', u.horario,
          'grupoTurno', u.grupo_turno
        ) as ofertante
      FROM ofertas o
      INNER JOIN users u ON o.ofertante_id = u.id
      WHERE o.id = ${nuevaOferta.id}
    `;

    const ofertaCompleta = ofertaCompletaResult[0];
    console.log('✅ Oferta completa obtenida:', JSON.stringify(ofertaCompleta, null, 2));
    
    return NextResponse.json(ofertaCompleta, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error completo:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error al crear oferta',
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}