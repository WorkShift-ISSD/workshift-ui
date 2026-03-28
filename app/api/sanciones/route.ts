import postgres from "postgres";
import { NextResponse } from "next/server";
import { EstadoSancion } from "@/app/lib/enum";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

async function actualizarSancionesVencidas() {
  await sql`
    UPDATE sanciones
    SET estado = ${EstadoSancion.FINALIZADA},
        updated_at = NOW()
    WHERE estado = ${EstadoSancion.ACTIVA}
      AND CURRENT_DATE > fecha_hasta
  `;
}

export async function GET(req: Request) {
  try {
    await actualizarSancionesVencidas();

    const url = new URL(req.url);
    const fecha = url.searchParams.get("fecha"); // yyyy-mm-dd

    let sanciones;

    if (fecha) {
      // Solo sanciones activas vigentes para la fecha
      sanciones = await sql`
        SELECT *
        FROM sanciones
        WHERE estado = ${EstadoSancion.ACTIVA}
          AND ${fecha}::date BETWEEN fecha_desde AND fecha_hasta
        ORDER BY created_at DESC
      `;
    } else {
      // Todas las sanciones (históricas y activas)
      sanciones = await sql`
        SELECT *
        FROM sanciones
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json(sanciones);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener sanciones" },
      { status: 500 }
    );
  }
}


/**
 * POST /api/sanciones
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      empleado_id,
      fecha_desde,
      fecha_hasta,
      motivo,
    } = body;

    // 🔒 Validación: sanción activa existente
    const sancionActiva = await sql`
      SELECT 1
      FROM sanciones
      WHERE empleado_id = ${empleado_id}
      AND estado = ${EstadoSancion.ACTIVA}
      AND CURRENT_DATE BETWEEN fecha_desde AND fecha_hasta
    `;

    if (sancionActiva.length > 0) {
      return NextResponse.json(
        { error: "El empleado ya tiene una sanción activa" },
        { status: 400 }
      );
    }

    const [nueva] = await sql`
      INSERT INTO sanciones (
        empleado_id,
        fecha_desde,
        fecha_hasta,
        motivo,
        estado
      )
      VALUES (
        ${empleado_id},
        ${fecha_desde},
        ${fecha_hasta},
        ${motivo || null},
        ${EstadoSancion.ACTIVA}
      )
      RETURNING *
    `;

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al crear sanción" },
      { status: 500 }
    );
  }
}
