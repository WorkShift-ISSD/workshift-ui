// app/api/licencias/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/app/lib/postgres";


// GET - obtener licencia por id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [licencia] = await sql`
      SELECT
        id::text,
        empleado_id::text,
        tipo,
        articulo,
        to_char(fecha_desde, 'YYYY-MM-DD') as fecha_desde,
        to_char(fecha_hasta, 'YYYY-MM-DD') as fecha_hasta,
        dias,
        estado,
        observaciones,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
        to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
      FROM licencias
      WHERE id = ${id}::uuid;
    `;

    if (!licencia) {
      return NextResponse.json(
        { error: "Licencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(licencia);
  } catch (error) {
    console.error("❌ Error GET /api/licencias/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener licencia" },
      { status: 500 }
    );
  }
}

// PUT - editar licencia
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const tipo = body.tipo ?? null;
    const articulo = body.articulo ?? null;
    const fecha_desde = body.fecha_desde ?? null;
    const fecha_hasta = body.fecha_hasta ?? null;
    const observaciones = body.observaciones ?? null;
    const estado = body.estado ?? null;

    // Recalcular días solo si cambian fechas
    let diasSql = sql`dias`;

    if (fecha_desde && fecha_hasta) {
      diasSql = sql`
        ((${fecha_hasta}::date - ${fecha_desde}::date) + 1)
      `;
    }

    const [updated] = await sql`
      UPDATE licencias SET
        tipo = COALESCE(${tipo}, tipo),
        articulo = COALESCE(${articulo}, articulo),
        fecha_desde = COALESCE(${fecha_desde}::date, fecha_desde),
        fecha_hasta = COALESCE(${fecha_hasta}::date, fecha_hasta),
        dias = ${diasSql},
        estado = COALESCE(${estado}, estado),
        observaciones = COALESCE(${observaciones}, observaciones),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id::text;
    `;

    if (!updated) {
      return NextResponse.json(
        { error: "Licencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ Error PUT /api/licencias/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar licencia" },
      { status: 500 }
    );
  }
}

// DELETE - borrar licencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [deleted] = await sql`
      DELETE FROM licencias
      WHERE id = ${id}::uuid
      RETURNING id::text;
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: "Licencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("❌ Error DELETE /api/licencias/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar licencia" },
      { status: 500 }
    );
  }
}
