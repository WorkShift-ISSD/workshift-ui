// app/api/ofertas/[id]/tomar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json(); // ✅ LEER EL BODY
    const { turnoSeleccionado } = body; // ✅ EXTRAER TURNO SELECCIONADO

    // ✅ VALIDAR que se envió el turno seleccionado
    if (!turnoSeleccionado || !turnoSeleccionado.fecha || !turnoSeleccionado.horario) {
      return NextResponse.json(
        { error: 'Debe seleccionar un turno' },
        { status: 400 }
      );
    }

    console.log('🎯 Turno seleccionado por el tomador:', turnoSeleccionado);

    // Verificar autenticación
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const tomadorId = payload.id as string;

    console.log('🟢 ID de oferta:', id);
    console.log('🟢 ID del tomador:', tomadorId);

    // Verificar la oferta
    const [oferta] = await sql`
      SELECT * FROM ofertas 
      WHERE id = ${id} 
        AND estado IN ('DISPONIBLE', 'SOLICITADO')
        AND tomador_id IS NULL
    `;

    if (!oferta) {
      const [ofertaExistente] = await sql`
        SELECT estado, tomador_id FROM ofertas WHERE id = ${id}
      `;
      
      if (!ofertaExistente) {
        return NextResponse.json(
          { error: 'Oferta no encontrada' },
          { status: 404 }
        );
      }

      if (ofertaExistente.tomador_id) {
        return NextResponse.json(
          { error: 'Esta oferta ya fue tomada por otro usuario' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Oferta no disponible',
          estadoActual: ofertaExistente.estado,
          mensaje: `Esta oferta tiene estado "${ofertaExistente.estado}" y no puede ser tomada`
        },
        { status: 400 }
      );
    }

    // Verificar que el tomador no sea el mismo que el ofertante
    if (oferta.ofertante_id === tomadorId) {
      return NextResponse.json(
        { error: 'No puedes tomar tu propia oferta' },
        { status: 400 }
      );
    }

    // ✅ VALIDAR: Verificar sanciones y licencias activas del ofertante
    const hoy = new Date().toISOString().split('T')[0];

    const [sancionActiva] = await sql`
      SELECT 1 FROM sanciones
      WHERE empleado_id = ${oferta.ofertante_id}::uuid
        AND estado = 'ACTIVA'
        AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;

    if (sancionActiva) {
      return NextResponse.json(
        { error: 'El ofertante tiene una sanción activa y no puede realizar cambios' },
        { status: 400 }
      );
    }

    const [licenciaActiva] = await sql`
      SELECT 1 FROM licencias
      WHERE empleado_id = ${oferta.ofertante_id}::uuid
        AND estado IN ('APROBADA', 'ACTIVA')
        AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;

    if (licenciaActiva) {
      return NextResponse.json(
        { error: 'El ofertante tiene una licencia activa y no puede realizar cambios' },
        { status: 400 }
      );
    }

    // ✅ Obtener grupo_turno del tomador
    const [tomador] = await sql`
      SELECT grupo_turno FROM users WHERE id = ${tomadorId}::uuid;
    `;

    // ✅ Construir el objeto completo del turno seleccionado
    const turnoSeleccionadoCompleto = {
      fecha: turnoSeleccionado.fecha,
      horario: turnoSeleccionado.horario,
      grupoTurno: tomador?.grupo_turno || 'N/A'
    };

    console.log('💾 Guardando turno seleccionado:', turnoSeleccionadoCompleto);

    // ✅ ACTUALIZAR OFERTA CON TURNO SELECCIONADO
    await sql`
      UPDATE ofertas 
      SET 
        tomador_id = ${tomadorId},
        turno_seleccionado = ${JSON.stringify(turnoSeleccionadoCompleto)}::jsonb,
        estado = 'APROBADO',
        updated_at = NOW()
      WHERE id = ${id};
    `;

    // ✅ CREAR AUTORIZACIÓN AUTOMÁTICAMENTE
    console.log('📄 Creando autorización para oferta:', id);

    try {
      const [autorizacion] = await sql`
        INSERT INTO autorizaciones (
          tipo,
          empleado_id,
          oferta_id,
          estado
        ) VALUES (
          'CAMBIO_TURNO',
          ${oferta.ofertante_id}::uuid,
          ${id}::uuid,
          'PENDIENTE'
        )
        RETURNING id::text;
      `;

      console.log('✅ Autorización creada:', autorizacion.id);
    } catch (authError) {
      console.error('❌ Error creando autorización:', authError);
      
      // Revertir la actualización de la oferta
      await sql`
        UPDATE ofertas 
        SET 
          tomador_id = NULL,
          turno_seleccionado = NULL,
          estado = 'DISPONIBLE',
          updated_at = NOW()
        WHERE id = ${id};
      `;

      return NextResponse.json(
        { error: 'Error al crear la autorización. La oferta no fue tomada.' },
        { status: 500 }
      );
    }

    console.log('✅ Oferta tomada exitosamente con turno seleccionado');

    return NextResponse.json({
      message: '✅ Oferta tomada exitosamente. Pendiente de autorización del Jefe.',
      estado: 'APROBADO',
      turnoSeleccionado: turnoSeleccionadoCompleto
    });
  } catch (error: any) {
    console.error('💥 Error al tomar oferta:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud', details: error.message },
      { status: 500 }
    );
  }
}