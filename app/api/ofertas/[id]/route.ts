// app/api/ofertas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import Pusher from 'pusher';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

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

// PATCH - Actualizar oferta (estado o edición completa)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('📝 Actualizando oferta:', id);
    console.log('📦 Body recibido:', body);

    // ✅ CASO 1: Solo actualizar estado
    if (body.estado && Object.keys(body).length === 1) {
      const [ofertaActualizada] = await sql`
        UPDATE ofertas 
        SET 
          estado = ${body.estado},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;

      if (!ofertaActualizada) {
        return NextResponse.json(
          { error: 'Oferta no encontrada' },
          { status: 404 }
        );
      }

      // Si se cancela la oferta, cerrar todas las conversaciones
      if (body.estado === 'CANCELADO') {
        await sql`
          UPDATE conversaciones
          SET estado = 'CANCELADA', visto = false, updated_at = NOW()
          WHERE oferta_id = ${id}::uuid;
        `;

        const [ofertaParaNotificar] = await sql`SELECT ofertante_id FROM ofertas WHERE id = ${id}`;
        await pusher.trigger(
          `usuario-${ofertaParaNotificar.ofertante_id}`,
          'conversacion-actualizada',
          { ofertaId: id }
        );
      }

      return NextResponse.json(ofertaActualizada);
    }

    // ✅ CASO 2: Edición completa de la oferta
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

    const [ofertaExistente] = await sql`
      SELECT ofertante_id FROM ofertas WHERE id = ${id}
    `;

    if (!ofertaExistente) {
      return NextResponse.json(
        { error: 'Oferta no encontrada' },
        { status: 404 }
      );
    }

    if (ofertaExistente.ofertante_id !== userId) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta oferta' },
        { status: 403 }
      );
    }

    const [usuario] = await sql`
      SELECT id, horario, grupo_turno 
      FROM users 
      WHERE id = ${userId}::uuid;
    `;

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!body.descripcion || body.descripcion.trim().length < 10) {
      return NextResponse.json(
        { error: 'La descripción debe tener al menos 10 caracteres' },
        { status: 400 }
      );
    }

    let turnoOfrece = null;
    let turnosBusca = null;
    let fechasDisponibles = null;
    let fechaDesde: string | null = null;
    let fechaHasta: string | null = null;
    let horarioRango: string | null = null;

    if (body.modalidadBusqueda === 'INTERCAMBIO') {
      if (body.tipo === 'OFREZCO') {
        // OFREZCO_INTERCAMBIO
        if (body.fechaOfrece) {
          turnoOfrece = {
            fecha: body.fechaOfrece,
            horario: body.horarioOfrece || usuario.horario,
            grupoTurno: body.grupoOfrece || usuario.grupo_turno,
          };
        }
        if (body.usaRangoBusca && body.rangoBusca?.desde && body.rangoBusca?.hasta) {
          fechaDesde = body.rangoBusca.desde;
          fechaHasta = body.rangoBusca.hasta;
          horarioRango = body.rangoBusca.horario || 'A convenir';
        } else if (body.fechasBusca?.length > 0) {
          turnosBusca = body.fechasBusca.filter((f: any) => f.fecha && f.fecha.trim() !== '');
        }
      } else {
        // BUSCO_INTERCAMBIO
        const fechasBuscaValidas = body.fechasBusca?.filter((f: any) => f.fecha && f.fecha.trim() !== '') ?? [];
        if (fechasBuscaValidas.length > 0) turnosBusca = fechasBuscaValidas;
        const diaQueNecesita = fechasBuscaValidas[0];
        if (diaQueNecesita) {
          turnoOfrece = {
            fecha: diaQueNecesita.fecha,
            horario: diaQueNecesita.horario || usuario.horario,
            grupoTurno: usuario.grupo_turno,
          };
        }
        if (body.usaRangoDisponibles && body.rangoDisponibles?.desde && body.rangoDisponibles?.hasta) {
          fechaDesde = body.rangoDisponibles.desde;
          fechaHasta = body.rangoDisponibles.hasta;
          horarioRango = body.rangoDisponibles.horario || 'A convenir';
        } else if (body.fechasDisponibles?.length > 0) {
          const validas = body.fechasDisponibles.filter((f: any) => f.fecha && f.fecha.trim() !== '');
          if (validas.length > 0) fechasDisponibles = validas;
        }
      }
    } else {
      // ABIERTO (cobertura)
      if (body.fechaOfrece) {
        turnoOfrece = {
          fecha: body.fechaOfrece,
          horario: body.horarioOfrece || usuario.horario,
          grupoTurno: body.grupoOfrece || usuario.grupo_turno,
        };
      }
      if (body.usaRangoDisponibles && body.rangoDisponibles?.desde && body.rangoDisponibles?.hasta) {
        fechaDesde = body.rangoDisponibles.desde;
        fechaHasta = body.rangoDisponibles.hasta;
        horarioRango = body.rangoDisponibles.horario || 'A convenir';
      } else if (body.fechasDisponibles?.length > 0) {
        fechasDisponibles = body.fechasDisponibles.filter((f: any) => f.fecha && f.fecha.trim() !== '');
      }
    }

    console.log('✅ Datos procesados:', { turnoOfrece, turnosBusca, fechasDisponibles, fechaDesde, fechaHasta, horarioRango });

    const [ofertaActualizada] = await sql`
      UPDATE ofertas
      SET
        tipo = ${body.tipo},
        modalidad_busqueda = ${body.modalidadBusqueda},
        turno_ofrece = ${turnoOfrece ? JSON.stringify(turnoOfrece) : null}::jsonb,
        turnos_busca = ${turnosBusca ? JSON.stringify(turnosBusca) : null}::jsonb,
        fechas_disponibles = ${fechasDisponibles ? JSON.stringify(fechasDisponibles) : null}::jsonb,
        fecha_desde = ${fechaDesde},
        fecha_hasta = ${fechaHasta},
        horario_rango = ${horarioRango},
        descripcion = ${body.descripcion},
        prioridad = ${body.prioridad || 'NORMAL'},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!ofertaActualizada) {
      return NextResponse.json(
        { error: 'Error al actualizar la oferta' },
        { status: 500 }
      );
    }

    console.log('✅ Oferta actualizada exitosamente');

    const [ofertaCompleta] = await sql`
      SELECT 
        o.*,
        json_build_object(
          'id', u.id,
          'nombre', u.nombre,
          'apellido', u.apellido,
          'rol', u.rol
        ) as ofertante
      FROM ofertas o
      JOIN users u ON o.ofertante_id = u.id
      WHERE o.id = ${id};
    `;

    return NextResponse.json({
      message: 'Oferta actualizada exitosamente',
      oferta: {
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
        fechaDesde: ofertaCompleta.fecha_desde,
        fechaHasta: ofertaCompleta.fecha_hasta,
        horarioRango: ofertaCompleta.horario_rango,
        descripcion: ofertaCompleta.descripcion,
        prioridad: ofertaCompleta.prioridad,
        estado: ofertaCompleta.estado,
        publicado: ofertaCompleta.publicado,
      }
    });

  } catch (error) {
    console.error('❌ Error updating oferta:', error);
    return NextResponse.json(
      {
        error: 'Error al actualizar oferta',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar oferta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const [oferta] = await sql`
      SELECT ofertante_id FROM ofertas WHERE id = ${id}
    `;

    if (!oferta) {
      return NextResponse.json(
        { error: 'Oferta no encontrada' },
        { status: 404 }
      );
    }

    if (oferta.ofertante_id !== userId) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta oferta' },
        { status: 403 }
      );
    }

    await sql`
      DELETE FROM ofertas 
      WHERE id = ${id};
    `;

    return NextResponse.json({ message: 'Oferta eliminada' });
  } catch (error) {
    console.error('Error deleting oferta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar oferta' },
      { status: 500 }
    );
  }
}