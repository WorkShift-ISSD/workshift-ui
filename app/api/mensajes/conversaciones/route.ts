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

        // Traer todas las conversaciones donde participó el usuario
        // Una conversación = una oferta con al menos un mensaje
        const conversaciones = await sql`
      SELECT DISTINCT ON (m.oferta_id)
        m.oferta_id::text as id,
        o.estado as oferta_estado,
        o.tipo as oferta_tipo,
        o.modalidad_busqueda,
        o.turno_ofrece,
        o.fechas_disponibles,
        -- Último mensaje
        m.contenido as ultimo_mensaje,
        m.created_at as ultimo_mensaje_at,
        -- El otro participante
        CASE 
          WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id
          ELSE m.emisor_id
        END as otro_participante_id,
        -- Mensajes sin leer
        (
          SELECT COUNT(*)::int 
          FROM mensajes 
          WHERE oferta_id = m.oferta_id 
            AND receptor_id = ${userId}::uuid 
            AND leido = false
        ) as sin_leer,
        -- Datos del otro participante
        u.nombre as otro_nombre,
        u.apellido as otro_apellido,
        u.ultimo_login as otro_ultimo_login
      FROM mensajes m
      JOIN ofertas o ON m.oferta_id = o.id
      JOIN users u ON u.id = CASE 
        WHEN m.emisor_id = ${userId}::uuid THEN m.receptor_id
        ELSE m.emisor_id
      END
      WHERE m.emisor_id = ${userId}::uuid 
         OR m.receptor_id = ${userId}::uuid
      ORDER BY m.oferta_id, m.created_at DESC;
    `;

        return NextResponse.json(conversaciones.map((c: any) => ({
            id: c.id,
            ofertaEstado: c.oferta_estado,
            ofertaTipo: c.oferta_tipo,
            modalidadBusqueda: c.modalidad_busqueda,
            turnoOfrece: c.turno_ofrece ? (typeof c.turno_ofrece === 'string' ? JSON.parse(c.turno_ofrece) : c.turno_ofrece) : null,
            fechasDisponibles: c.fechas_disponibles ? (typeof c.fechas_disponibles === 'string' ? JSON.parse(c.fechas_disponibles) : c.fechas_disponibles) : null,
            ultimoMensaje: c.ultimo_mensaje,
            ultimoMensajeAt: c.ultimo_mensaje_at,
            sinLeer: c.sin_leer,
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