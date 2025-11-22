import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🟢 === INICIANDO TOMAR OFERTA ===');
    
    const { id } = await params;
    console.log('🟢 ID de oferta:', id);

    const body = await request.json();
    console.log('🟢 Body recibido:', body);

    const { tomadorId } = body;

    if (!tomadorId) {
      console.error('❌ Falta tomadorId en el body');
      return NextResponse.json(
        { error: 'ID del tomador es requerido' },
        { status: 400 }
      );
    }

    console.log('🟢 Validación inicial OK');
    console.log('🟢 Buscando oferta...');

    // 1️⃣ Verificar que la oferta existe y está disponible
    const ofertaResult = await sql`
      SELECT 
        o.id,
        o.ofertante_id,
        o.estado,
        o.modalidad_busqueda,
        o.turnos_busca,
        u.horario as ofertante_horario,
        u.grupo_turno as ofertante_grupo
      FROM ofertas o
      INNER JOIN users u ON o.ofertante_id = u.id
      WHERE o.id = ${id}::uuid 
        AND o.estado = 'DISPONIBLE'
    `;

    console.log('🟢 Resultado de búsqueda de oferta:', ofertaResult);

    if (ofertaResult.length === 0) {
      console.error('❌ Oferta no encontrada o no disponible');
      return NextResponse.json(
        { error: 'Oferta no disponible o ya tomada' },
        { status: 404 }
      );
    }

    const oferta = ofertaResult[0];
    console.log('🟢 Oferta encontrada:', oferta);

    // 2️⃣ Obtener datos del tomador
    console.log('🟢 Buscando tomador...');
    const tomadorResult = await sql`
      SELECT id, nombre, apellido, horario, grupo_turno
      FROM users
      WHERE id = ${tomadorId}::uuid
    `;

    console.log('🟢 Resultado de búsqueda de tomador:', tomadorResult);

    if (tomadorResult.length === 0) {
      console.error('❌ Tomador no encontrado');
      return NextResponse.json(
        { error: 'Usuario tomador no encontrado' },
        { status: 404 }
      );
    }

    const tomador = tomadorResult[0];
    console.log('🟢 Tomador encontrado:', tomador);

    // 3️⃣ Validar que el tomador no sea el mismo ofertante
    if (oferta.ofertante_id === tomadorId) {
      console.error('❌ El tomador es el mismo ofertante');
      return NextResponse.json(
        { error: 'No puedes tomar tu propia oferta' },
        { status: 400 }
      );
    }

    // 4️⃣ Validar según modalidad
    if (oferta.modalidad_busqueda === 'INTERCAMBIO') {
      if (!tomador.horario || !tomador.grupo_turno) {
        console.error('❌ Tomador sin horario o grupo');
        return NextResponse.json(
          { error: 'Tu usuario no tiene horario o grupo asignado. Contacta al administrador.' },
          { status: 400 }
        );
      }
      console.log('🟢 Validación de INTERCAMBIO OK');
    }

    // 5️⃣ Actualizar la oferta
    console.log('🟢 Actualizando oferta...');
    const updateResult = await sql`
      UPDATE ofertas 
      SET 
        tomador_id = ${tomadorId}::uuid,
        estado = 'TOMADO',
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, estado
    `;

    console.log('🟢 Resultado de actualización:', updateResult);

    if (updateResult.length === 0) {
      console.error('❌ Error al actualizar la oferta');
      return NextResponse.json(
        { error: 'Error al actualizar la oferta' },
        { status: 500 }
      );
    }

    console.log('✅ Oferta actualizada exitosamente');

    // 6️⃣ Obtener oferta actualizada con todos los datos
    console.log('🟢 Obteniendo oferta actualizada...');
    const ofertaActualizadaResult = await sql`
      SELECT 
        o.id,
        o.tipo,
        o.modalidad_busqueda as "modalidadBusqueda",
        o.estado,
        o.descripcion,
        o.prioridad,
        o.turno_ofrece as "turnoOfrece",
        o.turnos_busca as "turnosBusca",
        o.fechas_disponibles as "fechasDisponibles",
        to_char(o.publicado, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as publicado,
        jsonb_build_object(
          'id', u1.id,
          'nombre', u1.nombre,
          'apellido', u1.apellido,
          'email', u1.email,
          'horario', u1.horario,
          'grupoTurno', u1.grupo_turno
        ) as ofertante,
        jsonb_build_object(
          'id', u2.id,
          'nombre', u2.nombre,
          'apellido', u2.apellido,
          'email', u2.email,
          'horario', u2.horario,
          'grupoTurno', u2.grupo_turno
        ) as tomador
      FROM ofertas o
      INNER JOIN users u1 ON o.ofertante_id = u1.id
      LEFT JOIN users u2 ON o.tomador_id = u2.id
      WHERE o.id = ${id}::uuid
    `;

    const ofertaActualizada = ofertaActualizadaResult[0];
    console.log('✅ Oferta completa obtenida:', ofertaActualizada);

    console.log('✅ === TOMAR OFERTA COMPLETADO ===');

    return NextResponse.json({
      message: '✅ Oferta tomada exitosamente. Pendiente de autorización del jefe.',
      oferta: ofertaActualizada
    }, { status: 200 });

  } catch (error: any) {
    console.error('💥 === ERROR EN TOMAR OFERTA ===');
    console.error('💥 Error completo:', error);
    console.error('💥 Stack:', error.stack);
    console.error('💥 Mensaje:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud', 
        details: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}