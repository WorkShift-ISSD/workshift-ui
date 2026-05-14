// app/api/licencias/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/app/lib/postgres";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "Workshift25");

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  const { payload } = await jwtVerify(token, SECRET_KEY);
  return payload.id as string;
}

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

    if (!licencia) return NextResponse.json({ error: "Licencia no encontrada" }, { status: 404 });
    return NextResponse.json(licencia);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener licencia" }, { status: 500 });
  }
}

// PUT - editar licencia
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const [licencia] = await sql`
      SELECT id, tipo, estado, fecha_desde, empleado_id::text
      FROM licencias WHERE id = ${id}::uuid;
    `;

    if (!licencia) return NextResponse.json({ error: "Licencia no encontrada" }, { status: 404 });
    if (licencia.empleado_id !== userId) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const hoy = new Date().toISOString().split('T')[0];
    const esOrdinaria = licencia.tipo === 'ORDINARIA';
    const esPendiente = licencia.estado === 'PENDIENTE';
    const noEmpezó = licencia.fecha_desde > hoy;

    if (esOrdinaria && !esPendiente) {
      return NextResponse.json({ error: "Solo podés modificar licencias ordinarias pendientes de aprobación" }, { status: 400 });
    }
    if (!esOrdinaria && !noEmpezó) {
      return NextResponse.json({ error: "No podés modificar una licencia que ya inició" }, { status: 400 });
    }

    const body = await request.json();
    const { fecha_desde, fecha_hasta, observaciones } = body;

    if (fecha_desde && fecha_desde < hoy) {
      return NextResponse.json({ error: "La fecha de inicio no puede ser anterior a hoy" }, { status: 400 });
    }

    const [updated] = await sql`
      UPDATE licencias SET
        fecha_desde = COALESCE(${fecha_desde ?? null}::date, fecha_desde),
        fecha_hasta = COALESCE(${fecha_hasta ?? null}::date, fecha_hasta),
        dias = CASE
          WHEN ${fecha_desde ?? null} IS NOT NULL AND ${fecha_hasta ?? null} IS NOT NULL
          THEN (${fecha_hasta ?? null}::date - ${fecha_desde ?? null}::date) + 1
          ELSE dias
        END,
        observaciones = COALESCE(${observaciones ?? null}, observaciones),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id::text;
    `;

    // Si es ORDINARIA PENDIENTE, actualizar la autorización vinculada también
    if (esOrdinaria && esPendiente && (fecha_desde || fecha_hasta)) {
      await sql`
        UPDATE autorizaciones SET updated_at = NOW()
        WHERE licencia_id = ${id}::uuid AND estado = 'PENDIENTE';
      `;
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ Error PUT /api/licencias/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar licencia" }, { status: 500 });
  }
}

// DELETE - borrar licencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const [licencia] = await sql`
      SELECT id, tipo, estado, fecha_desde, empleado_id::text
      FROM licencias WHERE id = ${id}::uuid;
    `;

    if (!licencia) return NextResponse.json({ error: "Licencia no encontrada" }, { status: 404 });
    if (licencia.empleado_id !== userId) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const hoy = new Date().toISOString().split('T')[0];
    const esOrdinaria = licencia.tipo === 'ORDINARIA';
    const esPendiente = licencia.estado === 'PENDIENTE';
    const noEmpezó = licencia.fecha_desde > hoy;

    if (esOrdinaria && !esPendiente) {
      return NextResponse.json({ error: "Solo podés eliminar licencias ordinarias pendientes de aprobación" }, { status: 400 });
    }
    if (!esOrdinaria && !noEmpezó) {
      return NextResponse.json({ error: "No podés eliminar una licencia que ya inició" }, { status: 400 });
    }

    // Cancelar autorización vinculada si existe
    if (esOrdinaria && esPendiente) {
      await sql`
        UPDATE autorizaciones SET estado = 'CANCELADA', updated_at = NOW()
        WHERE licencia_id = ${id}::uuid AND estado = 'PENDIENTE';
      `;
    }

    await sql`DELETE FROM licencias WHERE id = ${id}::uuid;`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Error DELETE /api/licencias/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar licencia" }, { status: 500 });
  }
}
