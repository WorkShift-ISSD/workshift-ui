// app/api/mensajes/conversaciones/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    const conversaciones = await sql`
            SELECT DISTINCT ON (oferta_id, otro_participante_id)
                oferta_id::text,
                ofertante_id::text,
                oferta_estado,
                oferta_tipo,
                modalidad_busqueda,
                turno_ofrece,
                fecha_desde,
                fecha_hasta,
                fechas_disponibles,
                ultimo_mensaje,
                ultimo_mensaje_at,
                otro_participante_id,
                sin_leer,
                otro_nombre,
                otro_apellido,
                otro_ultimo_login,
                conversacion_estado,
                visto,
                ultimo_mensaje_mio_leido
            FROM (
                SELECT 
                    m.oferta_id,
                    o.ofertante_id,
                    o.estado as oferta_estado,
                    o.tipo as oferta_tipo,
                    o.modalidad_busqueda,
                    o.turno_ofrece,
                    o.fecha_desde,
                    o.fecha_hasta,
                    o.fechas_disponibles,
                    m.contenido as ultimo_mensaje,
                    m.created_at as ultimo_mensaje_at,
                    CASE 
                        WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id
                        ELSE m.emisor_id
                    END as otro_participante_id,
                    (
                        SELECT COUNT(*)::int 
                        FROM mensajes 
                        WHERE oferta_id = m.oferta_id 
                            AND receptor_id = ${userId}::uuid
                            AND emisor_id = CASE WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id ELSE m.emisor_id END
                            AND leido = false
                    ) as sin_leer,
                    (
                        SELECT m2.leido
                        FROM mensajes m2
                        WHERE m2.oferta_id = m.oferta_id
                          AND m2.emisor_id = ${userId}::uuid
                          AND m2.receptor_id = CASE WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id ELSE m.emisor_id END
                        ORDER BY m2.created_at DESC
                        LIMIT 1
                    ) as ultimo_mensaje_mio_leido,
                    u.nombre as otro_nombre,
                    u.apellido as otro_apellido,
                    u.ultimo_login as otro_ultimo_login,
                    COALESCE(c.estado, 'ACTIVA') as conversacion_estado,
                    c.visto
                FROM mensajes m
                JOIN ofertas o ON m.oferta_id = o.id
                JOIN users u ON u.id = CASE 
                    WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id
                    ELSE m.emisor_id
                END
                LEFT JOIN conversaciones c ON c.oferta_id = m.oferta_id 
                  AND c.participante_id = ${userId}::uuid
                  AND c.otro_participante_id = CASE 
                    WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id
                    ELSE m.emisor_id
                  END
                WHERE m.emisor_id = ${userId}::uuid 
                    OR m.receptor_id = ${userId}::uuid
                ORDER BY m.oferta_id, 
                    CASE WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id ELSE m.emisor_id END,
                    m.created_at DESC
            ) sub
            ORDER BY oferta_id, otro_participante_id, ultimo_mensaje_at DESC;
        `;

    return NextResponse.json(conversaciones.map((c: any) => ({
      id: `${c.oferta_id}-${c.otro_participante_id}`,
      ofertaId: c.oferta_id,
      ofertaEstado: c.oferta_estado,
      conversacionEstado: c.conversacion_estado,
      ofertaTipo: c.oferta_tipo,
      modalidadBusqueda: c.modalidad_busqueda,
      turnoOfrece: c.turno_ofrece ? (typeof c.turno_ofrece === 'string' ? JSON.parse(c.turno_ofrece) : c.turno_ofrece) : null,
      fechasDisponibles: c.fechas_disponibles ? (typeof c.fechas_disponibles === 'string' ? JSON.parse(c.fechas_disponibles) : c.fechas_disponibles) : null,
      fechaDesde: c.fecha_desde || null,
      fechaHasta: c.fecha_hasta || null,
      ultimoMensaje: c.ultimo_mensaje,
      ultimoMensajeAt: c.ultimo_mensaje_at,
      sinLeer: c.sin_leer,
      ofertanteId: c.ofertante_id,
      visto: c.visto,
      ultimoMensajeMioLeido: c.ultimo_mensaje_mio_leido,
      otroParticipante: {
        id: c.otro_participante_id,
        nombre: c.otro_nombre,
        apellido: c.otro_apellido,
        ultimoLogin: c.otro_ultimo_login,
      },
    })));

  } catch (error) {
    console.error('❌ Error fetching conversaciones:', error);
    return NextResponse.json({ error: 'Error al obtener conversaciones' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    // Marcar todas las conversaciones cerradas del usuario como vistas
    await sql`
      UPDATE conversaciones
      SET visto = true
      WHERE participante_id = ${userId}::uuid
        AND estado != 'ACTIVA'
        AND visto = false;
    `;

    return NextResponse.json({ message: 'Marcado como visto' });
  } catch (error) {
    console.error('❌ Error marcando como visto:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}