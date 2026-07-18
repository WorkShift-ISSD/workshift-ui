import postgres from "postgres";
import { NextRequest, NextResponse } from "next/server";
import { EstadoSancion } from "@/app/lib/enum";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

/**
 * PUT /api/sanciones/:id
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const {
      fecha_desde,
      fecha_hasta,
      motivo,
    } = await req.json();

    console.log('Valores recibidos:', { fecha_desde, fecha_hasta, motivo });

    const [updated] = await sql`
      UPDATE sanciones
      SET
        fecha_desde = COALESCE(${fecha_desde ?? null}, fecha_desde),
        fecha_hasta = COALESCE(${fecha_hasta ?? null}, fecha_hasta),
        motivo = COALESCE(${motivo ?? null}, motivo),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *,
          fecha_desde::text,
          fecha_hasta::text
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
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await sql`
      DELETE FROM sanciones
      WHERE id = ${id}
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