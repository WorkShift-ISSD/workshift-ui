// app/api/solicitudes-directas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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
    const userId = payload.id as string;

    // Verificar que la solicitud existe
    const [solicitudExistente] = await sql`
      SELECT * FROM solicitudes_directas 
      WHERE id = ${id}::uuid;
    `;

    if (!solicitudExistente) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Determinar qué tipo de actualización es
    if (body.estado && Object.keys(body).length === 1) {
      // ✅ CASO 1: Solo actualizar estado (aceptar/rechazar solicitud)
      // El destinatario puede cambiar el estado
      if (solicitudExistente.destinatario_id !== userId) {
        return NextResponse.json(
          { error: 'No tienes permiso para cambiar el estado de esta solicitud' },
          { status: 403 }
        );
      }

      const [solicitudActualizada] = await sql`
        UPDATE solicitudes_directas 
        SET 
          estado = ${body.estado},
          updated_at = NOW()
        WHERE id = ${id}::uuid
        RETURNING *;
      `;

      return NextResponse.json(solicitudActualizada);

    } else {
      // ✅ CASO 2: Editar campos de la solicitud (fechas, motivo, etc.)
      // Solo el solicitante puede editar
      if (solicitudExistente.solicitante_id !== userId) {
        return NextResponse.json(
          { error: 'Solo puedes editar tus propias solicitudes' },
          { status: 403 }
        );
      }

      // Solo se puede editar si está en estado SOLICITADO
      if (solicitudExistente.estado !== 'SOLICITADO') {
        return NextResponse.json(
          { error: 'Solo puedes editar solicitudes pendientes' },
          { status: 400 }
        );
      }

      const {
        fechaSolicitante,
        horarioSolicitante,
        grupoSolicitante,
        fechaDestinatario,
        horarioDestinatario,
        grupoDestinatario,
        motivo,
        prioridad,
      } = body;

      // Validar campos obligatorios
      if (
        !fechaSolicitante ||
        !horarioSolicitante ||
        !grupoSolicitante ||
        !fechaDestinatario ||
        !horarioDestinatario ||
        !grupoDestinatario ||
        !motivo ||
        !prioridad
      ) {
        return NextResponse.json(
          { error: 'Faltan campos obligatorios' },
          { status: 400 }
        );
      }

      // Actualizar la solicitud
      const [solicitudActualizada] = await sql`
        UPDATE solicitudes_directas
        SET
          fecha_solicitante = ${fechaSolicitante},
          horario_solicitante = ${horarioSolicitante},
          grupo_solicitante = ${grupoSolicitante},
          fecha_destinatario = ${fechaDestinatario},
          horario_destinatario = ${horarioDestinatario},
          grupo_destinatario = ${grupoDestinatario},
          motivo = ${motivo},
          prioridad = ${prioridad},
          updated_at = NOW()
        WHERE id = ${id}::uuid
        RETURNING *;
      `;

      return NextResponse.json({
        message: 'Solicitud actualizada correctamente',
        solicitud: solicitudActualizada,
      });
    }
  } catch (error) {
    console.error('Error en PATCH /api/solicitudes-directas/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar solicitud',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const userId = payload.id as string;

    // Verificar que la solicitud existe y pertenece al usuario
    const [solicitud] = await sql`
      SELECT * FROM solicitudes_directas 
      WHERE id = ${id}::uuid AND solicitante_id = ${userId}::uuid;
    `;

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada o no tienes permiso para eliminarla' },
        { status: 404 }
      );
    }

    // Solo se puede eliminar si está en estado SOLICITADO
    if (solicitud.estado !== 'SOLICITADO') {
      return NextResponse.json(
        { error: 'Solo puedes eliminar solicitudes pendientes' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM solicitudes_directas
      WHERE id = ${id}::uuid;
    `;

    return NextResponse.json({ message: 'Solicitud eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    return NextResponse.json(
      { 
        error: 'Error al eliminar solicitud',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}