// app/api/faltas/[id]/route.ts

import { sql } from '@/app/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obtener una falta por id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- Promise aquí
) {
  const { id } = await params; // <-- await aquí

  try {
    const [falta] = await sql`
      SELECT 
        f.id::text,
        f.empleado_id::text as "empleadoId",
        to_char(f.fecha, 'YYYY-MM-DD') as fecha,
        f.causa,
        f.observaciones,
        f.justificada,
        f.registrado_por as "registradoPor",
        to_char(f.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        to_char(f.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "updatedAt"
      FROM faltas f
      WHERE f.id = ${id}::uuid
    `;

    if (!falta) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(falta);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT - Editar una falta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {

    // Normalizar: convertir undefined → null
    const causa = body.causa ?? null;
    const observaciones = body.observaciones ?? null;
    const justificada =
      body.justificada === undefined ? null : body.justificada;

    // Ejecutar UPDATE
    const [updated] = await sql`
      UPDATE faltas SET
        causa = COALESCE(${causa}, causa),
        observaciones = COALESCE(${observaciones}, observaciones),
        justificada = COALESCE(${justificada}, justificada),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id::text;
    `;

    if (!updated) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(updated);

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


// DELETE - Borrar falta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- Promise aquí
) {
  const { id } = await params; // <-- await aquí

  try {
    const [deleted] = await sql`
      DELETE FROM faltas
      WHERE id = ${id}::uuid
      RETURNING id::text;
    `;

    if (!deleted) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}