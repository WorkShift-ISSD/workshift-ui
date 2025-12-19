// app/api/licencias/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/app/lib/postgres";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "Workshift25"
);

// GET - listar licencias
export async function GET() {
  try {
    const licencias = await sql`
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
      ORDER BY created_at DESC;
    `;

    return NextResponse.json(licencias);
  } catch (error) {
    console.error("❌ Error GET /api/licencias:", error);
    return NextResponse.json(
      { error: "Error al obtener licencias" },
      { status: 500 }
    );
  }
}

// POST - crear licencia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { tipo, articulo, fecha_desde, fecha_hasta, observaciones } = body;

    if (!tipo || !fecha_desde || !fecha_hasta) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Usuario logueado (empleado)
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const empleadoId = payload.id as string;

    // Calcular días
    const dias =
      Math.ceil(
        (new Date(fecha_hasta).getTime() -
          new Date(fecha_desde).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    const estado = tipo === "ORDINARIA" ? "PENDIENTE" : "APROBADA";

    const [licencia] = await sql`
      INSERT INTO licencias (
        empleado_id,
        tipo,
        articulo,
        fecha_desde,
        fecha_hasta,
        dias,
        estado,
        observaciones,
        created_at,
        updated_at
      )
      VALUES (
        ${empleadoId}::uuid,
        ${tipo},
        ${articulo || null},
        ${fecha_desde}::date,
        ${fecha_hasta}::date,
        ${dias},
        ${estado},
        ${observaciones || null},
        NOW(),
        NOW()
      )
      RETURNING
        id::text,
        empleado_id::text,
        tipo,
        articulo,
        to_char(fecha_desde, 'YYYY-MM-DD') as fecha_desde,
        to_char(fecha_hasta, 'YYYY-MM-DD') as fecha_hasta,
        dias,
        estado,
        observaciones;
    `;

    return NextResponse.json(licencia, { status: 201 });
  } catch (error) {
    console.error("❌ Error POST /api/licencias:", error);
    return NextResponse.json(
      { error: "Error al crear licencia" },
      { status: 500 }
    );
  }
}
