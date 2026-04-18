// app/api/licencias/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/app/lib/postgres";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "Workshift25"
);

// GET - listar licencias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");

    // =========================
    // MODO 1: licencias por fecha (FALTAS / ADMIN)
    // =========================
    if (fecha) {
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
          observaciones
        FROM licencias
        WHERE ${fecha}::date BETWEEN fecha_desde AND fecha_hasta
          AND estado IN ('APROBADA', 'ACTIVA')
        ORDER BY fecha_desde ASC;
      `;

      return NextResponse.json(licencias);
    }

    // =========================
    // MODO 2: licencias DEL USUARIO LOGUEADO
    // =========================
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const empleadoId = payload.id as string;

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
      WHERE empleado_id = ${empleadoId}::uuid
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

    // ✅ VALIDAR: Verificar sanciones y licencias activas
    const hoy = new Date().toISOString().split('T')[0];

    const [sancionActiva] = await sql`
      SELECT 1 FROM sanciones
      WHERE empleado_id = ${empleadoId}::uuid
        AND estado = 'ACTIVA'
        AND ${hoy}::date BETWEEN fecha_desde AND fecha_hasta
      LIMIT 1;
    `;

    if (sancionActiva) {
      return NextResponse.json(
        { error: 'Tienes una sanción activa y no puedes solicitar licencias' },
        { status: 400 }
      );
    }

    // Verificar si ya tiene una licencia en esas fechas
    const [licenciaSuperpuesta] = await sql`
      SELECT 1 FROM licencias
      WHERE empleado_id = ${empleadoId}::uuid
        AND estado IN ('PENDIENTE', 'APROBADA', 'ACTIVA')
        AND (
          (fecha_desde <= ${fecha_desde}::date AND fecha_hasta >= ${fecha_desde}::date) OR
          (fecha_desde <= ${fecha_hasta}::date AND fecha_hasta >= ${fecha_hasta}::date) OR
          (fecha_desde >= ${fecha_desde}::date AND fecha_hasta <= ${fecha_hasta}::date)
        )
      LIMIT 1;
    `;

    if (licenciaSuperpuesta) {
      return NextResponse.json(
        { error: 'Ya tienes una licencia solicitada o activa en esas fechas' },
        { status: 400 }
      );
    }

    // Calcular días
    const dias =
      Math.ceil(
        (new Date(fecha_hasta).getTime() -
          new Date(fecha_desde).getTime()) /
        (1000 * 60 * 60 * 24)
      ) + 1;

    // ✅ DETERMINAR ESTADO
    // ORDINARIA → PENDIENTE (requiere autorización del Jefe)
    // Otras → APROBADA (no requieren autorización)
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

    // ✅ CREAR AUTORIZACIÓN AUTOMÁTICAMENTE SI ES ORDINARIA
    if (tipo === "ORDINARIA") {
      console.log('🔄 Creando autorización para licencia ordinaria:', licencia.id);

      try {
        const [autorizacion] = await sql`
          INSERT INTO autorizaciones (
            tipo,
            empleado_id,
            licencia_id,
            estado
          ) VALUES (
            'LICENCIA_ORDINARIA',
            ${empleadoId}::uuid,
            ${licencia.id}::uuid,
            'PENDIENTE'
          )
          RETURNING id::text;
        `;

        console.log('✅ Autorización creada:', autorizacion.id);
      } catch (authError) {
        console.error('❌ Error creando autorización:', authError);
        
        // Eliminar la licencia si falla la autorización
        await sql`
          DELETE FROM licencias WHERE id = ${licencia.id}::uuid;
        `;

        return NextResponse.json(
          { error: 'Error al crear la autorización. La licencia no fue registrada.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(licencia, { status: 201 });
  } catch (error) {
    console.error("❌ Error POST /api/licencias:", error);
    return NextResponse.json(
      { error: "Error al crear licencia" },
      { status: 500 }
    );
  }
}