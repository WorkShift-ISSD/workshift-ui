// app/api/mensajes/route.ts
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

// GET - Obtener mensajes de una oferta
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ofertaId = searchParams.get('ofertaId');

    if (!ofertaId) {
      return NextResponse.json({ error: 'ofertaId es requerido' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    const mensajes = await sql`
      SELECT 
        m.id::text,
        m.contenido,
        m.leido,
        m.created_at,
        json_build_object(
          'id', u.id,
          'nombre', u.nombre,
          'apellido', u.apellido
        ) as emisor
      FROM mensajes m
      JOIN users u ON m.emisor_id = u.id
      WHERE m.oferta_id = ${ofertaId}::uuid
        AND (m.emisor_id = ${userId}::uuid OR m.receptor_id = ${userId}::uuid)
      ORDER BY m.created_at ASC;
    `;

    // Marcar como leídos los mensajes recibidos
    await sql`
      UPDATE mensajes
      SET leido = true
      WHERE oferta_id = ${ofertaId}::uuid
        AND receptor_id = ${userId}::uuid
        AND leido = false;
    `;

    return NextResponse.json(mensajes);
  } catch (error) {
    console.error('❌ Error fetching mensajes:', error);
    return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 });
  }
}

// POST - Enviar un mensaje
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ofertaId, receptorId, contenido } = body;

    if (!ofertaId || !receptorId || !contenido?.trim()) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const emisorId = payload.id as string;

    // Obtener datos del emisor
    const [emisor] = await sql`
      SELECT id, nombre, apellido FROM users WHERE id = ${emisorId}::uuid;
    `;

    // Guardar mensaje en BD
    const [mensaje] = await sql`
      INSERT INTO mensajes (oferta_id, emisor_id, receptor_id, contenido)
      VALUES (
        ${ofertaId}::uuid,
        ${emisorId}::uuid,
        ${receptorId}::uuid,
        ${contenido.trim()}
      )
      RETURNING id::text, contenido, leido, created_at;
    `;

    const mensajeCompleto = {
      id: mensaje.id,
      contenido: mensaje.contenido,
      leido: mensaje.leido,
      created_at: mensaje.created_at,
      emisor: {
        id: emisor.id,
        nombre: emisor.nombre,
        apellido: emisor.apellido,
      },
    };

    // Enviar en tiempo real por Pusher
    // Enviar en tiempo real por Pusher al canal de la oferta
await pusher.trigger(
  `oferta-${ofertaId}`,
  'nuevo-mensaje',
  mensajeCompleto
);

// Notificar al receptor que tiene un nuevo mensaje
await pusher.trigger(
  `usuario-${receptorId}`,
  'nuevo-mensaje',
  { ofertaId }
);

    return NextResponse.json(mensajeCompleto, { status: 201 });
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
  }
}