import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

// GET — turnos efectivos pasados del usuario que puede calificar
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    // Turnos efectivos pasados donde el usuario participó (como ganador o cedente)
    // y todavía no calificó
    const pendientes = await sql`
      SELECT 
        te.id::text,
        TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
        te.horario_efectivo as horario,
        te.tipo_cambio,
        -- El otro participante
        CASE 
          WHEN te.empleado_id = ${userId}::uuid THEN te.empleado_intercambio_id::text
          ELSE te.empleado_id::text
        END as otro_id,
        CASE 
          WHEN te.empleado_id = ${userId}::uuid THEN u2.nombre || ' ' || u2.apellido
          ELSE u1.nombre || ' ' || u1.apellido
        END as otro_nombre,
        CASE
          WHEN te.empleado_id = ${userId}::uuid THEN CONCAT(LEFT(u2.nombre, 1), LEFT(u2.apellido, 1))
          ELSE CONCAT(LEFT(u1.nombre, 1), LEFT(u1.apellido, 1))
        END as otro_iniciales
      FROM turnos_efectivos te
      JOIN users u1 ON u1.id = te.empleado_id
      JOIN users u2 ON u2.id = te.empleado_intercambio_id
      -- Solo turnos pasados dentro de la ventana de 7 días
      WHERE te.fecha < NOW()::date
        AND te.fecha >= NOW()::date - INTERVAL '7 days'
        AND te.estado = 'REALIZADO'
        -- El usuario participó
        AND (te.empleado_id = ${userId}::uuid OR te.empleado_intercambio_id = ${userId}::uuid)
        -- Todavía no calificó
        AND NOT EXISTS (
          SELECT 1 FROM calificaciones c
          WHERE c.turno_efectivo_id = te.id
            AND c.calificador_id = ${userId}::uuid
        )
        -- Solo intercambios (no coberturas unilaterales sin contraparte)
        AND te.empleado_intercambio_id IS NOT NULL
      ORDER BY te.fecha DESC;
    `;

    // Historial de calificaciones dadas y recibidas
    const historial = await sql`
      SELECT
        c.id::text,
        TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
        te.horario_efectivo as horario,
        c.comunicacion,
        c.responsabilidad,
        c.recomendacion,
        c.promedio,
        c.cumplimiento,
        c.comentario,
        -- Si yo califiqué a otro = 'dada', si me calificaron = 'recibida'
        CASE WHEN c.calificador_id = ${userId}::uuid THEN 'dada' ELSE 'recibida' END as direccion,
        -- El otro participante
        CASE 
          WHEN c.calificador_id = ${userId}::uuid 
          THEN u_calificado.nombre || ' ' || u_calificado.apellido
          ELSE u_calificador.nombre || ' ' || u_calificador.apellido
        END as otro_nombre,
        CASE 
          WHEN c.calificador_id = ${userId}::uuid 
          THEN CONCAT(LEFT(u_calificado.nombre, 1), LEFT(u_calificado.apellido, 1))
          ELSE CONCAT(LEFT(u_calificador.nombre, 1), LEFT(u_calificador.apellido, 1))
        END as otro_iniciales,
        -- Editable si fue hace menos de 24hs y fue dada por mí
        (c.calificador_id = ${userId}::uuid AND c.created_at > NOW() - INTERVAL '24 hours') as editable,
        c.created_at::text
      FROM calificaciones c
      JOIN turnos_efectivos te ON te.id = c.turno_efectivo_id
      JOIN users u_calificador ON u_calificador.id = c.calificador_id
      JOIN users u_calificado ON u_calificado.id = c.calificado_id
      WHERE c.calificador_id = ${userId}::uuid OR c.calificado_id = ${userId}::uuid
      ORDER BY te.fecha DESC
      LIMIT 20;
    `;

    // Mi score actual — calculado en tiempo real desde la tabla de calificaciones
    const [miScore] = await sql`
      SELECT COALESCE(ROUND(AVG(promedio)::numeric, 1), 0) as score
      FROM calificaciones
      WHERE calificado_id = ${userId}::uuid;
    `;

    return NextResponse.json({ pendientes, historial, miScore: Number(miScore?.score) || 0 });

  } catch (error) {
    console.error('❌ Error GET /api/calificaciones:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST — crear calificación
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const calificadorId = payload.id as string;

    const body = await request.json();
    const { turnoEfectivoId, calificadoId, comunicacion, responsabilidad, recomendacion, cumplimiento, comentario } = body;

    if (!turnoEfectivoId || !calificadoId || !comunicacion || !responsabilidad || !recomendacion || cumplimiento === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que el turno existe y el usuario participó
    const [turno] = await sql`
      SELECT id, empleado_id, empleado_intercambio_id
      FROM turnos_efectivos
      WHERE id = ${turnoEfectivoId}::uuid
        AND (empleado_id = ${calificadorId}::uuid OR empleado_intercambio_id = ${calificadorId}::uuid)
        AND fecha < NOW()::date;
    `;

    if (!turno) return NextResponse.json({ error: 'Turno no válido' }, { status: 400 });

    // Verificar que no calificó antes
    const [yaCalificó] = await sql`
      SELECT id FROM calificaciones
      WHERE turno_efectivo_id = ${turnoEfectivoId}::uuid
        AND calificador_id = ${calificadorId}::uuid;
    `;
    if (yaCalificó) return NextResponse.json({ error: 'Ya calificaste este turno' }, { status: 409 });

    // Insertar calificación
    const [nueva] = await sql`
      INSERT INTO calificaciones (
        turno_efectivo_id, calificador_id, calificado_id,
        comunicacion, responsabilidad, recomendacion,
        cumplimiento, comentario
      ) VALUES (
        ${turnoEfectivoId}::uuid, ${calificadorId}::uuid, ${calificadoId}::uuid,
        ${comunicacion}, ${responsabilidad}, ${recomendacion},
        ${cumplimiento}, ${comentario || null}
      )
      RETURNING id::text, promedio;
    `;

    // Actualizar promedio en users
    await sql`
      UPDATE users SET
        calificacion = (
          SELECT ROUND(AVG(promedio), 1)
          FROM calificaciones
          WHERE calificado_id = ${calificadoId}::uuid
        ),
        total_intercambios = (
          SELECT COUNT(DISTINCT turno_efectivo_id)
          FROM calificaciones
          WHERE calificado_id = ${calificadoId}::uuid
        )
      WHERE id = ${calificadoId}::uuid;
    `;

    return NextResponse.json(nueva, { status: 201 });

  } catch (error) {
    console.error('❌ Error POST /api/calificaciones:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}