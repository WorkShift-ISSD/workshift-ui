// app/api/ofertas/[id]/tomar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import Pusher from 'pusher';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { turnoSeleccionado, cancelarOferta } = body;

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

    console.log('turnoOfertanteRaw:', turnoOfertanteRaw);
    console.log('oferta.turno_ofrece raw:', oferta.turno_ofrece);

    // Para cobertura, la fecha viene del turnoSeleccionado o de fechas_disponibles
    const fechaDisponibles = oferta.fechas_disponibles
      ? (typeof oferta.fechas_disponibles === 'string'
        ? JSON.parse(oferta.fechas_disponibles)
        : oferta.fechas_disponibles)
      : null;

    const fechaTurnoOfertante = turnoOfertanteRaw?.fecha
      || turnoSeleccionado?.fecha
      || fechaDisponibles?.[0]?.fecha
      || hoy;

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

    // 3. Para cobertura: validar sanción/licencia en la fecha que va a cubrir
    const esCobertura = oferta.modalidad_busqueda === 'ABIERTO';
    if (esCobertura) {
      const fechaCobertura = turnoSeleccionado?.fecha || fechaTurnoOfertante;

      const [sancionTomadorEnFecha] = await sql`
    SELECT 1 FROM sanciones
    WHERE empleado_id = ${tomadorId}::uuid
      AND estado = 'ACTIVA'
      AND ${fechaCobertura}::date BETWEEN fecha_desde AND fecha_hasta
    LIMIT 1;
  `;
      if (sancionTomadorEnFecha) {
        return NextResponse.json(
          { error: 'El compañero tiene una sanción para ese día y no puede cubrir ese turno' },
          { status: 400 }
        );
      }

      const [licenciaTomadorEnFecha] = await sql`
    SELECT 1 FROM licencias
    WHERE empleado_id = ${tomadorId}::uuid
      AND estado IN ('APROBADA', 'ACTIVA')
      AND ${fechaCobertura}::date BETWEEN fecha_desde AND fecha_hasta
    LIMIT 1;
  `;
      if (licenciaTomadorEnFecha) {
        return NextResponse.json(
          { error: 'El compañero tiene una licencia para ese día y no puede cubrir ese turno' },
          { status: 400 }
        );
      }
    }

    // ── Validaciones del OFERTANTE ────────────────────────────────────────

    // 4. Sanción en la fecha de su turno
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

    // 5. Licencia en la fecha de su turno
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

    const esBusco = oferta.tipo === 'BUSCO';

    const turnosBuscaRaw = oferta.turnos_busca
      ? (typeof oferta.turnos_busca === 'string'
        ? JSON.parse(oferta.turnos_busca)
        : oferta.turnos_busca)
      : null;

    // solicitanteId/destinatarioId según quién inició la búsqueda:
    //   BUSCO (esBusco=true)  → solicitante = ofertante (ej. Patricia), destinatario = tomador (ej. Emanuel)
    //   OFREZCO (esBusco=false) → solicitante = tomador, destinatario = ofertante
    //
    // turnoSolicitante = turno que CEDE el solicitante
    // turnoDestinatario = turno que CEDE el destinatario
    const turnoSolicitanteObj = !esCobertura
      ? esBusco
        ? {
            // BUSCO_INTERCAMBIO: solicitante = ofertante (Patricia), cede su turno (turnoOfrece)
            fecha: turnoOfertanteRaw?.fecha || fechaTurnoOfertante,
            horario: turnoOfertanteRaw?.horario,
            grupoTurno: turnoOfertanteRaw?.grupoTurno,
          }
        : {
            // OFREZCO_INTERCAMBIO: solicitante = tomador, cede el día que el ofertante le pidió
            fecha: turnosBuscaRaw?.[0]?.fecha || turnoSeleccionado?.fecha || fechaTurnoOfertante,
            horario: turnosBuscaRaw?.[0]?.horario || turnoSeleccionado?.horario || tomador.horario,
            grupoTurno: tomador.grupo_turno,
          }
      : esBusco
        ? {
            // BUSCO_COBERTURA: solicitante = ofertante, su turno a cubrir (grupo y horario del ofertante)
            fecha: turnoOfertanteRaw?.fecha || turnoSeleccionado?.fecha || fechaTurnoOfertante,
            horario: turnoOfertanteRaw?.horario || tomador.horario,
            grupoTurno: turnoOfertanteRaw?.grupoTurno || tomador.grupo_turno,
          }
        : {
            // OFREZCO_COBERTURA: solicitante = tomador, su turno propio
            fecha: turnoSeleccionado?.fecha || fechaTurnoOfertante,
            horario: tomador.horario,
            grupoTurno: tomador.grupo_turno,
          };

    const turnoDestinatarioObj = !esCobertura
      ? esBusco
        ? {
            // BUSCO_INTERCAMBIO: destinatario = tomador (Emanuel), cede el día que eligió del rango
            fecha: turnoSeleccionado?.fecha,
            horario: tomador.horario,
            grupoTurno: tomador.grupo_turno,
          }
        : turnoOfertanteRaw
          ? {
              // OFREZCO_INTERCAMBIO: destinatario = ofertante, cede su turnoOfrece
              fecha: turnoOfertanteRaw.fecha,
              horario: turnoOfertanteRaw.horario,
              grupoTurno: turnoOfertanteRaw.grupoTurno,
            }
          : null
      : null; // cobertura: unidireccional, sin turnoDestinatario

    // ── Validaciones de duplicado ─────────────────────────────────────────

    // Para BUSCO_INTERCAMBIO el tomador cede turnoDestinatario; en el resto, turnoSolicitante
    const fechaSeleccionada = (!esCobertura && esBusco)
      ? (turnoDestinatarioObj?.fecha ?? turnoSolicitanteObj.fecha)
      : turnoSolicitanteObj.fecha;

    // 6. Turno efectivo ya existente para el tomador en esa fecha
    const [turnoEfectivoExistente] = await sql`
      SELECT 1 FROM turnos_efectivos
      WHERE empleado_id = ${tomadorId}::uuid
        AND fecha = ${fechaSeleccionada}::date
        AND estado = 'PENDIENTE'
      LIMIT 1;
    `;
    if (turnoEfectivoExistente) {
      return NextResponse.json(
        { error: 'Ya existe una cobertura aprobada para esa fecha' },
        { status: 400 }
      );
    }

    // 7. Autorización pendiente para la misma fecha
    const [autorizacionPendienteExistente] = await sql`
      SELECT 1 FROM autorizaciones a
      JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      WHERE a.empleado_id = ${tomadorId}::uuid
        AND a.estado = 'PENDIENTE'
        AND sd.fecha_solicitante = ${fechaSeleccionada}::date
      LIMIT 1;
    `;
    if (autorizacionPendienteExistente) {
      return NextResponse.json(
        { error: 'Ya tenés una solicitud pendiente de aprobación para esa fecha' },
        { status: 400 }
      );
    }

    // ── Marcar oferta como COMPLETADO ─────────────────────────────────────

    if (cancelarOferta) {
      // Cancelar la oferta completa
      await sql`
        UPDATE ofertas 
        SET 
          tomador_id = ${tomadorId},
          estado = 'COMPLETADO',
          updated_at = NOW()
        WHERE id = ${id};
      `;

      // Limpiar fechas_disponibles cuando se completa la oferta
      await sql`
        UPDATE ofertas 
        SET fechas_disponibles = NULL
        WHERE id = ${id};
      `;

      // Marcar todas las conversaciones de la oferta como CANCELADA (excepto la del aceptado que va como ACEPTADA)
      await sql`
        UPDATE conversaciones
        SET estado = CASE 
          WHEN participante_id = ${tomadorId}::uuid 
            OR (participante_id = ${oferta.ofertante_id}::uuid AND otro_participante_id = ${tomadorId}::uuid)
          THEN 'ACEPTADA'
          ELSE 'CANCELADA'
        END,
        visto = false,
        updated_at = NOW()
        WHERE oferta_id = ${id}::uuid;
      `;

      // Notificar a todos los participantes que el estado cambió
      await pusher.trigger(
        `usuario-${oferta.ofertante_id}`,
        'conversacion-actualizada',
        { ofertaId: id }
      );

    } else {
      // Mantener oferta activa pero sacar la fecha aceptada de fechasDisponibles
      const fechaAceptada = turnoSeleccionado?.fecha;
      await sql`
  UPDATE ofertas 
  SET 
    fechas_disponibles = (
      SELECT jsonb_agg(f)
      FROM jsonb_array_elements(
        CASE 
          WHEN jsonb_typeof(fechas_disponibles::jsonb) = 'array' 
          THEN fechas_disponibles::jsonb
          ELSE (fechas_disponibles#>>'{}')::jsonb
        END
      ) f
      WHERE f->>'fecha' != ${fechaAceptada}
    ),
    updated_at = NOW()
  WHERE id = ${id};
`;
      // Marcar conversación del tomador y del ofertante como ACEPTADA
      await sql`
        UPDATE conversaciones
        SET estado = 'ACEPTADA', updated_at = NOW(), visto = false
        WHERE oferta_id = ${id}::uuid
          AND (
            (participante_id = ${tomadorId}::uuid)
            OR
            (participante_id = ${oferta.ofertante_id}::uuid AND otro_participante_id = ${tomadorId}::uuid)
          );
      `;

      // Cerrar otras conversaciones ACTIVAS de la misma oferta con la misma fecha acordada
      await sql`
        UPDATE conversaciones
        SET estado = 'CANCELADA', updated_at = NOW()
        WHERE oferta_id = ${id}::uuid
          AND estado = 'ACTIVA'
          AND fecha_acordada = ${fechaSeleccionada}::date;
      `;

    }

    // Notificar al tomador que fue aceptado
    await pusher.trigger(
      `usuario-${tomadorId}`,
      'oferta-completada',
      { ofertaId: id }
    );

    // ── Crear solicitud directa entre tomador y ofertante ─────────────────
    // Estado APROBADO porque ambos ya acordaron — va directo al jefe

    const solicitanteId = esBusco ? oferta.ofertante_id : tomadorId;
    const destinatarioId = esBusco ? tomadorId : oferta.ofertante_id;


console.log('solicitanteId:', solicitanteId);
console.log('destinatarioId:', destinatarioId);
console.log('esBusco:', esBusco);
console.log('oferta.tipo:', oferta.tipo);



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
          oferta_id,
          motivo,
          origen,
          prioridad,
          estado,
          fecha_solicitud
        ) VALUES (
          ${solicitanteId}::uuid, 
          ${destinatarioId}::uuid,
          ${turnoSolicitanteObj ? JSON.stringify(turnoSolicitanteObj) : null},
          ${turnoDestinatarioObj ? JSON.stringify(turnoDestinatarioObj) : null},
          ${turnoSolicitanteObj?.fecha || null},
          ${turnoSolicitanteObj?.horario || null},
          ${turnoSolicitanteObj?.grupoTurno || null},
          ${turnoDestinatarioObj?.fecha || null},
          ${turnoDestinatarioObj?.horario || null},
          ${turnoDestinatarioObj?.grupoTurno || null},
          ${id}::uuid,
          ${oferta.descripcion || 'Cambio acordado a través del tablero de ofertas'},
          'TABLERO',
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

      // Notificar a los otros interesados que la oferta fue tomada
      const otrosInteresados = await sql`
  SELECT DISTINCT 
    CASE WHEN emisor_id = ${oferta.ofertante_id}::uuid THEN receptor_id ELSE emisor_id END as interesado_id
  FROM mensajes
  WHERE oferta_id = ${id}::uuid
    AND emisor_id != ${oferta.ofertante_id}::uuid
    AND receptor_id != ${tomadorId}::uuid
    AND emisor_id != ${tomadorId}::uuid;
`;

      for (const otro of otrosInteresados) {
        // Insertar mensaje automático
        await sql`
    INSERT INTO mensajes (oferta_id, emisor_id, receptor_id, contenido)
    VALUES (
      ${id}::uuid,
      ${oferta.ofertante_id}::uuid,
      ${otro.interesado_id}::uuid,
      'El ofertante ya acordó con otra persona. Esta conversación está cerrada.'
    );
  `;

        // Notificar por Pusher
        await pusher.trigger(
          `oferta-${id}`,
          'nuevo-mensaje',
          {
            id: 'auto',
            contenido: 'El ofertante ya acordó con otra persona. Esta conversación está cerrada.',
            leido: false,
            created_at: new Date().toISOString(),
            emisor: { id: oferta.ofertante_id, nombre: 'Sistema', apellido: '' }
          }
        );
      }


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