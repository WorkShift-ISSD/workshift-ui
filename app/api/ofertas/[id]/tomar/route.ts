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
    const body = await request.json();
    const { turnoSeleccionado } = body; // Opcional — solo para intercambios

    // Verificar autenticación
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const usuarioLogueadoId = payload.id as string;

    // Si el body trae tomadorId y el usuario logueado es el ofertante, usar el del body
    const tomadorId = body.tomadorId && body.tomadorId !== usuarioLogueadoId
      ? body.tomadorId
      : usuarioLogueadoId;


    // Obtener la oferta
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
        return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 });
      }

      if (ofertaExistente.tomador_id) {
        return NextResponse.json(
          { error: 'Esta oferta ya fue tomada por otro usuario' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Oferta no disponible', estadoActual: ofertaExistente.estado },
        { status: 400 }
      );
    }

    // No puede tomar su propia oferta
    if (oferta.ofertante_id === tomadorId) {
      return NextResponse.json(
        { error: 'No podés tomar tu propia oferta' },
        { status: 400 }
      );
    }

    const hoy = new Date().toISOString().split('T')[0];


    const [sancionSolicitante] = await sql`
  SELECT 1 FROM sanciones
  WHERE empleado_id = ${tomadorId}::uuid
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

    // Fecha del turno del ofertante (para validar en esa fecha específica)
    const turnoOfertanteRaw = oferta.turno_ofrece
      ? (typeof oferta.turno_ofrece === 'string'
        ? JSON.parse(oferta.turno_ofrece)
        : oferta.turno_ofrece)
      : null;
    const fechaTurnoOfertante = turnoOfertanteRaw?.fecha || hoy;

    // Fecha que ofrece el tomador a cambio (solo en intercambio)
    const fechaTurnoTomador = turnoSeleccionado?.fecha || null;

    // ── Validaciones del TOMADOR ──────────────────────────────────────────

    // 1. Sanción activa HOY → no puede hacer nada
    const [sancionTomadorHoy] = await sql`
      SELECT 1 FROM sanciones
      WHERE empleado_id = ${tomadorId}::uuid
        AND estado = 'ACTIVA'
        AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;
    if (sancionTomadorHoy) {
      return NextResponse.json(
        { error: 'Tenés una sanción activa y no podés realizar cambios de turno' },
        { status: 400 }
      );
    }

    // 2. Licencia en la fecha que ofrece a cambio (solo intercambio)
    if (fechaTurnoTomador) {
      const [licenciaTomadorEnFecha] = await sql`
        SELECT 1 FROM licencias
        WHERE empleado_id = ${tomadorId}::uuid
          AND estado IN ('APROBADA', 'ACTIVA')
          AND ${fechaTurnoTomador}::date BETWEEN fecha_desde AND fecha_hasta
        LIMIT 1;
      `;
      if (licenciaTomadorEnFecha) {
        return NextResponse.json(
          { error: 'Tenés una licencia aprobada para ese día y no podés ofrecerlo a cambio' },
          { status: 400 }
        );
      }
    }

    // ── Validaciones del OFERTANTE ────────────────────────────────────────

    // 3. Sanción en la fecha de su turno
    const [sancionOfertante] = await sql`
      SELECT 1 FROM sanciones
      WHERE empleado_id = ${oferta.ofertante_id}::uuid
        AND estado = 'ACTIVA'
        AND ${fechaTurnoOfertante}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;
    if (sancionOfertante) {
      return NextResponse.json(
        { error: 'El ofertante tiene una sanción para ese día y no puede realizar cambios' },
        { status: 400 }
      );
    }

    // 4. Licencia en la fecha de su turno
    const [licenciaOfertante] = await sql`
      SELECT 1 FROM licencias
      WHERE empleado_id = ${oferta.ofertante_id}::uuid
        AND estado IN ('APROBADA', 'ACTIVA')
        AND ${fechaTurnoOfertante}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;
    if (licenciaOfertante) {
      return NextResponse.json(
        { error: 'El ofertante tiene una licencia para ese día y no puede realizar cambios' },
        { status: 400 }
      );
    }

    // ── Obtener datos del tomador ─────────────────────────────────────────

    const [tomador] = await sql`
      SELECT id, nombre, apellido, rol, horario, grupo_turno 
      FROM users WHERE id = ${tomadorId}::uuid;
    `;

    if (!tomador) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // ── Construir datos de los turnos ─────────────────────────────────────

    // Turno del tomador (lo que da a cambio — solo en intercambio)
    const turnoSolicitanteObj = turnoSeleccionado ? {
      fecha: turnoSeleccionado.fecha,
      horario: turnoSeleccionado.horario || tomador.horario,
      grupoTurno: tomador.grupo_turno
    } : {
      fecha: fechaTurnoOfertante, // el día que va a cubrir
      horario: tomador.horario,
      grupoTurno: tomador.grupo_turno
    };

    // Turno del ofertante (lo que recibe el tomador)
    const turnoDestinatarioObj = turnoOfertanteRaw ? {
      fecha: turnoOfertanteRaw.fecha,
      horario: turnoOfertanteRaw.horario,
      grupoTurno: turnoOfertanteRaw.grupoTurno
    } : null;

    // ── Marcar oferta como COMPLETADO ─────────────────────────────────────

    await sql`
      UPDATE ofertas 
      SET 
        tomador_id = ${tomadorId},
        estado = 'COMPLETADO',
        updated_at = NOW()
      WHERE id = ${id};
    `;

    // ── Crear solicitud directa entre tomador y ofertante ─────────────────
    // Estado APROBADO porque ambos ya acordaron — va directo al jefe

    try {
      const [nuevaSolicitud] = await sql`
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
          ${tomadorId}::uuid,
          ${oferta.ofertante_id}::uuid,
          ${turnoSolicitanteObj ? JSON.stringify(turnoSolicitanteObj) : null},
          ${turnoDestinatarioObj ? JSON.stringify(turnoDestinatarioObj) : null},
          ${turnoSolicitanteObj?.fecha || null},
          ${turnoSolicitanteObj?.horario || null},
          ${turnoSolicitanteObj?.grupoTurno || null},
          ${turnoDestinatarioObj?.fecha || null},
          ${turnoDestinatarioObj?.horario || null},
          ${turnoDestinatarioObj?.grupoTurno || null},
          ${oferta.descripcion || 'Cambio acordado a través del tablero de ofertas'},
          ${oferta.prioridad || 'NORMAL'},
          'APROBADO',
          NOW()
        )
        RETURNING id::text;
      `;

      // Crear la autorización vinculada a la solicitud directa
      await sql`
        INSERT INTO autorizaciones (
          tipo,
          empleado_id,
          solicitud_id,
          estado
        ) VALUES (
          'CAMBIO_TURNO',
          ${oferta.ofertante_id}::uuid,
          ${nuevaSolicitud.id}::uuid,
          'PENDIENTE'
        );
      `;

    } catch (solicitudError) {
      console.error('❌ Error creando solicitud directa:', solicitudError);

      // Revertir la oferta si falla
      await sql`
        UPDATE ofertas 
        SET tomador_id = NULL, estado = 'DISPONIBLE', updated_at = NOW()
        WHERE id = ${id};
      `;

      return NextResponse.json(
        { error: 'Error al procesar el cambio. La oferta no fue tomada.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Oferta tomada. Pendiente de autorización del jefe.',
      estado: 'COMPLETADO',
    });

  } catch (error: any) {
    console.error('💥 Error al tomar oferta:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud', details: error.message },
      { status: 500 }
    );
  }
}