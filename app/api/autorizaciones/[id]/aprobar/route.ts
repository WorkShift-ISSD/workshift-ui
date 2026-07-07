// app/api/autorizaciones/[id]/aprobar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { EstadoAutorizacion } from '@/app/lib/enum';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

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
    const { observaciones } = body;

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
    const jefeId = payload.id as string;
    const jefeRol = payload.rol as string;

    // Verificar que sea JEFE
    if (jefeRol !== 'JEFE' && jefeRol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'Solo el Jefe puede aprobar autorizaciones' },
        { status: 403 }
      );
    }

    // Obtener la autorización
    const [autorizacion] = await sql`
      SELECT * FROM autorizaciones WHERE id = ${id}::uuid;
    `;

    if (!autorizacion) {
      return NextResponse.json(
        { error: 'Autorización no encontrada' },
        { status: 404 }
      );
    }

    if (autorizacion.estado !== EstadoAutorizacion.PENDIENTE) {
      return NextResponse.json(
        { error: 'Esta autorización ya fue procesada' },
        { status: 400 }
      );
    }

    // Aprobar autorización
    await sql`
      UPDATE autorizaciones
      SET
        estado = ${EstadoAutorizacion.APROBADA},
        aprobado_por = ${jefeId}::uuid,
        fecha_aprobacion = NOW(),
        observaciones = COALESCE(${observaciones ?? null}, observaciones),
        updated_at = NOW()
      WHERE id = ${id}::uuid;
    `;

    // ✅ ACTUALIZAR ESTADO DE LA SOLICITUD/OFERTA/LICENCIA VINCULADA
    if (autorizacion.solicitud_id) {
      await sql`
    UPDATE solicitudes_directas
    SET estado = 'COMPLETADO', updated_at = NOW()
    WHERE id = ${autorizacion.solicitud_id}::uuid;
  `;

      // Obtener datos de la solicitud para crear los turnos efectivos
      const [solicitud] = await sql`
    SELECT * FROM solicitudes_directas 
    WHERE id = ${autorizacion.solicitud_id}::uuid;
  `;

      if (solicitud) {
        // solicitante = quien NECESITA cobertura (CEDE), destinatario = quien CUBRE (GANA)
        // Para intercambio: solicitante = quien inicia, destinatario = quien responde
        const esCobertura = !solicitud.fecha_destinatario;

        // Para cobertura: fetchear horario del que cubre (destinatario) para horario_original
        let cubridorHorario = solicitud.horario_destinatario;
        let cubridorGrupo = solicitud.grupo_destinatario;
        if (esCobertura) {
          const [cubridor] = await sql`SELECT horario, grupo_turno FROM users WHERE id = ${solicitud.destinatario_id}::uuid`;
          cubridorHorario = cubridor?.horario;
          cubridorGrupo = cubridor?.grupo_turno;
        }

        // Cobertura:   empleado_id = destinatario (GANA/cubre), intercambio_id = solicitante (CEDE/es cubierto)
        // Intercambio: empleado_id = solicitante (GANA su nuevo día), intercambio_id = destinatario (CEDE ese día)
        await sql`
  INSERT INTO turnos_efectivos (
    id, empleado_id, fecha, horario_original, horario_efectivo,
    grupo_original, grupo_efectivo, tipo_cambio, autorizacion_id,
    empleado_intercambio_id, estado, created_at
  ) VALUES (
    gen_random_uuid(),
    ${esCobertura ? solicitud.destinatario_id : solicitud.solicitante_id}::uuid,
    ${esCobertura ? solicitud.fecha_solicitante : solicitud.fecha_destinatario}::date,
    ${esCobertura ? (cubridorHorario || solicitud.horario_solicitante) : solicitud.horario_solicitante},
    ${esCobertura ? solicitud.horario_solicitante : (solicitud.horario_destinatario || solicitud.horario_solicitante)},
    ${esCobertura ? (cubridorGrupo || solicitud.grupo_solicitante) : solicitud.grupo_solicitante},
    ${esCobertura ? solicitud.grupo_solicitante : (solicitud.grupo_destinatario || solicitud.grupo_solicitante)},
    ${esCobertura ? 'COBERTURA' : 'INTERCAMBIO'},
    ${id}::uuid,
    ${esCobertura ? solicitud.solicitante_id : solicitud.destinatario_id}::uuid,
    'PENDIENTE',
    NOW()
  )
  ON CONFLICT (empleado_id, fecha) DO UPDATE SET
    horario_efectivo = EXCLUDED.horario_efectivo,
    grupo_efectivo = EXCLUDED.grupo_efectivo,
    empleado_intercambio_id = EXCLUDED.empleado_intercambio_id,
    tipo_cambio = EXCLUDED.tipo_cambio,
    autorizacion_id = EXCLUDED.autorizacion_id,
    updated_at = NOW();
`;

        // Segundo turno — solo para intercambio (destinatario gana el día del solicitante)
        if (!esCobertura) {
          // Solicitante gana el día del destinatario
          await sql`
            INSERT INTO turnos_efectivos (
              id, empleado_id, fecha, horario_original, horario_efectivo,
              grupo_original, grupo_efectivo, tipo_cambio, autorizacion_id,
              empleado_intercambio_id, estado, created_at
            ) VALUES (
              gen_random_uuid(),
              ${solicitud.solicitante_id}::uuid,
              ${solicitud.fecha_destinatario}::date,
              ${solicitud.horario_solicitante},
              ${solicitud.horario_destinatario || solicitud.horario_solicitante},
              ${solicitud.grupo_solicitante},
              ${solicitud.grupo_destinatario || solicitud.grupo_solicitante},
              'INTERCAMBIO',
              ${id}::uuid,
              ${solicitud.destinatario_id}::uuid,
              'PENDIENTE',
              NOW()
            )
            ON CONFLICT (empleado_id, fecha) DO UPDATE SET
              horario_efectivo = EXCLUDED.horario_efectivo,
              grupo_efectivo = EXCLUDED.grupo_efectivo,
              empleado_intercambio_id = EXCLUDED.empleado_intercambio_id,
              tipo_cambio = EXCLUDED.tipo_cambio,
              autorizacion_id = EXCLUDED.autorizacion_id,
              updated_at = NOW();
          `;

          // Destinatario gana el día del solicitante
          await sql`
            INSERT INTO turnos_efectivos (
              id, empleado_id, fecha, horario_original, horario_efectivo,
              grupo_original, grupo_efectivo, tipo_cambio, autorizacion_id,
              empleado_intercambio_id, estado, created_at
            ) VALUES (
              gen_random_uuid(),
              ${solicitud.destinatario_id}::uuid,
              ${solicitud.fecha_solicitante}::date,
              ${solicitud.horario_destinatario},
              ${solicitud.horario_solicitante},
              ${solicitud.grupo_destinatario},
              ${solicitud.grupo_solicitante},
              'INTERCAMBIO',
              ${id}::uuid,
              ${solicitud.solicitante_id}::uuid,
              'PENDIENTE',
              NOW()
            )
            ON CONFLICT (empleado_id, fecha) DO UPDATE SET
              horario_efectivo = EXCLUDED.horario_efectivo,
              grupo_efectivo = EXCLUDED.grupo_efectivo,
              empleado_intercambio_id = EXCLUDED.empleado_intercambio_id,
              tipo_cambio = EXCLUDED.tipo_cambio,
              autorizacion_id = EXCLUDED.autorizacion_id,
              updated_at = NOW();
          `;
        }
      }
    }


    if (autorizacion.licencia_id) {
      await sql`
        UPDATE licencias
        SET estado = 'APROBADA', updated_at = NOW()
        WHERE id = ${autorizacion.licencia_id}::uuid;
      `;
      console.log('✅ Licencia actualizada a APROBADA');
    }

    // Notificar al solicitante vía Pusher
    const solicitanteId = autorizacion.solicitud_id
      ? (await sql`SELECT solicitante_id FROM solicitudes_directas WHERE id = ${autorizacion.solicitud_id}::uuid`)[0]?.solicitante_id
      : autorizacion.oferta_id
        ? (await sql`SELECT ofertante_id FROM ofertas WHERE id = ${autorizacion.oferta_id}::uuid`)[0]?.ofertante_id
        : null;

    if (solicitanteId) {
      await pusher.trigger(`usuario-${solicitanteId}`, 'autorizacion-actualizada', { autorizacionId: id });
    }

    return NextResponse.json({
      message: 'Autorización aprobada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al aprobar autorización:', error);
    return NextResponse.json(
      {
        error: 'Error al aprobar autorización',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}