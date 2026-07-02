// app/api/autorizaciones/[id]/cancelar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { EstadoAutorizacion } from '@/app/lib/enum';
import Pusher from 'pusher';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
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

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    // Obtener la autorización con datos de la solicitud
    const [autorizacion] = await sql`
      SELECT
        a.*,
        sd.solicitante_id,
        sd.destinatario_id,
        sd.oferta_id as solicitud_oferta_id
      FROM autorizaciones a
      LEFT JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      WHERE a.id = ${id}::uuid;
    `;

    if (!autorizacion) {
      return NextResponse.json({ error: 'Autorización no encontrada' }, { status: 404 });
    }

    if (autorizacion.estado !== EstadoAutorizacion.PENDIENTE) {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar autorizaciones pendientes' },
        { status: 400 }
      );
    }

    // Solo pueden cancelar los involucrados: solicitante o destinatario
    const esInvolucrado =
      autorizacion.solicitante_id === userId ||
      autorizacion.destinatario_id === userId ||
      autorizacion.empleado_id === userId;

    if (!esInvolucrado) {
      return NextResponse.json(
        { error: 'Solo los participantes del cambio pueden cancelar la solicitud' },
        { status: 403 }
      );
    }

    // Cancelar la autorización con auditoría
    await sql`
      UPDATE autorizaciones
      SET estado = ${EstadoAutorizacion.CANCELADA},
          cancelado_por = ${userId}::uuid,
          fecha_cancelacion = NOW(),
          updated_at = NOW()
      WHERE id = ${id}::uuid;
    `;

    // Cancelar la solicitud directa vinculada
    if (autorizacion.solicitud_id) {
      await sql`
        UPDATE solicitudes_directas
        SET estado = 'CANCELADO', updated_at = NOW()
        WHERE id = ${autorizacion.solicitud_id}::uuid;
      `;

      // Cancelar la oferta vinculada
      const ofertaId = autorizacion.solicitud_oferta_id;
      if (ofertaId) {
        await sql`
          UPDATE ofertas
          SET estado = 'CANCELADO', updated_at = NOW()
          WHERE id = ${ofertaId}::uuid
            AND estado = 'COMPLETADO';
        `;
      }
    }

    // Notificar a los involucrados vía Pusher + mensaje en el chat
    const notificar = [
      autorizacion.solicitante_id,
      autorizacion.destinatario_id,
      autorizacion.empleado_id,
    ].filter((uid): uid is string => !!uid && uid !== userId);

    const destinatarios = [...new Set(notificar)];

    // Obtener nombre del que cancela para el mensaje
    const [cancellador] = await sql`SELECT nombre, apellido FROM users WHERE id = ${userId}::uuid`;
    const ofertaId = autorizacion.oferta_id ?? autorizacion.solicitud_oferta_id;
    const contenidoMensaje = `❌ ${cancellador.nombre} ${cancellador.apellido} canceló la solicitud de autorización pendiente.`;

    for (const uid of destinatarios) {
      // Notificación de autorización actualizada
      await pusher.trigger(`usuario-${uid}`, 'autorizacion-actualizada', { autorizacionId: id });

      // Mensaje de aviso en el chat de la oferta
      if (ofertaId) {
        await sql`
          INSERT INTO mensajes (oferta_id, emisor_id, receptor_id, contenido)
          VALUES (${ofertaId}::uuid, ${userId}::uuid, ${uid}::uuid, ${contenidoMensaje});
        `;

        // Conversación del receptor: CERRADA y sin ver
        await sql`
          INSERT INTO conversaciones (oferta_id, participante_id, otro_participante_id, estado, visto)
          VALUES (${ofertaId}::uuid, ${uid}::uuid, ${userId}::uuid, 'CERRADA', false)
          ON CONFLICT (oferta_id, participante_id, otro_participante_id)
          DO UPDATE SET estado = 'CERRADA', visto = false;
        `;

        // Conversación del que cancela: CERRADA y ya vista
        await sql`
          INSERT INTO conversaciones (oferta_id, participante_id, otro_participante_id, estado, visto)
          VALUES (${ofertaId}::uuid, ${userId}::uuid, ${uid}::uuid, 'CERRADA', true)
          ON CONFLICT (oferta_id, participante_id, otro_participante_id)
          DO UPDATE SET estado = 'CERRADA', visto = true;
        `;

        // Notificar nuevo mensaje al receptor
        await pusher.trigger(`usuario-${uid}`, 'nuevo-mensaje', { ofertaId });
      }
    }

    return NextResponse.json({ message: 'Solicitud cancelada' });
  } catch (error) {
    console.error('❌ Error al cancelar autorización:', error);
    return NextResponse.json(
      { error: 'Error al cancelar', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
