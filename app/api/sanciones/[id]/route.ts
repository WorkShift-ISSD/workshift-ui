import postgres from "postgres";
import { NextRequest, NextResponse } from "next/server";
import { EstadoSancion } from "@/app/lib/enum";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

/**
 * PUT /api/sanciones/:id
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      motivo,
      estado,
    } = await req.json();

    const [updated] = await sql`
      UPDATE sanciones
      SET
        fecha_desde = COALESCE(${fecha_desde}, fecha_desde),
        fecha_hasta = COALESCE(${fecha_hasta}, fecha_hasta),
        motivo = COALESCE(${motivo}, motivo),
        estado = COALESCE(${estado}, estado),
        updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `;

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al actualizar sanción" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sanciones/:id
 */
export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    await sql`
      DELETE FROM sanciones
      WHERE id = ${params.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al eliminar sanción" },
      { status: 500 }
    );
  }
}
