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
      // ✅ CASO 1: Solo actualizar estado (aceptar/rechazar/cancelar solicitud)
      
      const nuevoEstado = body.estado;
      
      // Validar permisos según el rol y estado
      if (nuevoEstado === 'CANCELADO') {
        // El solicitante puede cancelar su propia solicitud
        if (solicitudExistente.solicitante_id !== userId && solicitudExistente.destinatario_id !== userId) {
          return NextResponse.json(
            { error: 'No tienes permiso para cancelar esta solicitud' },
            { status: 403 }
          );
        }
      } else if (nuevoEstado === 'APROBADO') {
        // Solo el destinatario puede aprobar
        if (solicitudExistente.destinatario_id !== userId) {
          return NextResponse.json(
            { error: 'Solo el destinatario puede aprobar la solicitud' },
            { status: 403 }
          );
        }
      } else {
        // Otros estados solo el destinatario
        if (solicitudExistente.destinatario_id !== userId) {
          return NextResponse.json(
            { error: 'No tienes permiso para cambiar el estado de esta solicitud' },
            { status: 403 }
          );
        }
      }

      await sql`
        UPDATE solicitudes_directas 
        SET 
          estado = ${nuevoEstado},
          updated_at = NOW()
        WHERE id = ${id}::uuid;
      `;

      // ✅ Obtener la solicitud actualizada con el formato correcto
      const [solicitudFormateada] = await sql`
        SELECT 
          sd.id,
          sd.estado,
          sd.motivo,
          sd.prioridad,
          sd.fecha_solicitud as "fechaSolicitud",
          json_build_object(
            'id', us.id,
            'nombre', us.nombre,
            'apellido', us.apellido,
            'rol', us.rol,
            'horario', us.horario
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido,
            'rol', ud.rol,
            'horario', ud.horario
          ) as destinatario,
          json_build_object(
            'fecha', sd.fecha_solicitante,
            'horario', sd.horario_solicitante,
            'grupoTurno', sd.grupo_solicitante
          ) as "turnoSolicitante",
          json_build_object(
            'fecha', sd.fecha_destinatario,
            'horario', sd.horario_destinatario,
            'grupoTurno', sd.grupo_destinatario
          ) as "turnoDestinatario"
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        WHERE sd.id = ${id}::uuid;
      `;

      return NextResponse.json(solicitudFormateada);

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

      // ✅ Construir objetos JSONB para actualizar también esos campos
      const turnoSolicitante = {
        fecha: fechaSolicitante,
        horario: horarioSolicitante,
        grupoTurno: grupoSolicitante
      };

      const turnoDestinatario = {
        fecha: fechaDestinatario,
        horario: horarioDestinatario,
        grupoTurno: grupoDestinatario
      };

      // ✅ Actualizar la solicitud (incluyendo campos JSONB)
      await sql`
        UPDATE solicitudes_directas
        SET
          fecha_solicitante = ${fechaSolicitante},
          horario_solicitante = ${horarioSolicitante},
          grupo_solicitante = ${grupoSolicitante},
          fecha_destinatario = ${fechaDestinatario},
          horario_destinatario = ${horarioDestinatario},
          grupo_destinatario = ${grupoDestinatario},
          turno_solicitante = ${JSON.stringify(turnoSolicitante)}::jsonb,
          turno_destinatario = ${JSON.stringify(turnoDestinatario)}::jsonb,
          motivo = ${motivo},
          prioridad = ${prioridad},
          updated_at = NOW()
        WHERE id = ${id}::uuid;
      `;

      // ✅ Obtener la solicitud actualizada con el formato correcto
      const [solicitudFormateada] = await sql`
        SELECT 
          sd.id,
          sd.estado,
          sd.motivo,
          sd.prioridad,
          sd.fecha_solicitud as "fechaSolicitud",
          json_build_object(
            'id', us.id,
            'nombre', us.nombre,
            'apellido', us.apellido,
            'rol', us.rol,
            'horario', us.horario
          ) as solicitante,
          json_build_object(
            'id', ud.id,
            'nombre', ud.nombre,
            'apellido', ud.apellido,
            'rol', ud.rol,
            'horario', ud.horario
          ) as destinatario,
          json_build_object(
            'fecha', sd.fecha_solicitante,
            'horario', sd.horario_solicitante,
            'grupoTurno', sd.grupo_solicitante
          ) as "turnoSolicitante",
          json_build_object(
            'fecha', sd.fecha_destinatario,
            'horario', sd.horario_destinatario,
            'grupoTurno', sd.grupo_destinatario
          ) as "turnoDestinatario"
        FROM solicitudes_directas sd
        JOIN users us ON sd.solicitante_id = us.id
        JOIN users ud ON sd.destinatario_id = ud.id
        WHERE sd.id = ${id}::uuid;
      `;

      // ✅ Devolver la solicitud directamente (sin wrapper)
      return NextResponse.json(solicitudFormateada);
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