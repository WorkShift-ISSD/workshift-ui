// app/api/faltas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

// ========================
// GET - obtener faltas
// ========================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const empleadoId = searchParams.get('empleadoId');

    let query;

    if (fecha) {
      query = sql`
        SELECT 
          f.id::text,
          f.empleado_id::text as "empleadoId",
          json_build_object(
            'id', e.id::text,
            'nombre', e.nombre,
            'apellido', e.apellido,
            'legajo', e.legajo,
            'horario', e.horario,
            'rol', e.rol
          ) as empleado,
          to_char(f.fecha, 'YYYY-MM-DD') as fecha,
          f.causa,
          f.observaciones,
          f.justificada,
          f.registrado_por as "registradoPor",
          to_char(f.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
          to_char(f.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
        FROM faltas f
        JOIN users e ON f.empleado_id = e.id
        WHERE DATE(f.fecha) = ${fecha}::date
        ORDER BY f.created_at DESC;
      `;
    } else if (empleadoId) {
      query = sql`
        SELECT 
          f.id::text,
          f.empleado_id::text as "empleadoId",
          json_build_object(
            'id', e.id::text,
            'nombre', e.nombre,
            'apellido', e.apellido,
            'legajo', e.legajo,
            'horario', e.horario,
            'rol', e.rol
          ) as empleado,
          to_char(f.fecha, 'YYYY-MM-DD') as fecha,
          f.causa,
          f.observaciones,
          f.justificada,
          f.registrado_por as "registradoPor",
          to_char(f.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
          to_char(f.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
        FROM faltas f
        JOIN users e ON f.empleado_id = e.id
        WHERE f.empleado_id = ${empleadoId}::uuid
        ORDER BY f.fecha DESC;
      `;
    } else {
      query = sql`
        SELECT 
          f.id::text,
          f.empleado_id::text as "empleadoId",
          json_build_object(
            'id', e.id::text,
            'nombre', e.nombre,
            'apellido', e.apellido,
            'legajo', e.legajo,
            'horario', e.horario,
            'rol', e.rol
          ) as empleado,
          to_char(f.fecha, 'YYYY-MM-DD') as fecha,
          f.causa,
          f.observaciones,
          f.justificada,
          f.registrado_por as "registradoPor",
          to_char(f.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
          to_char(f.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
        FROM faltas f
        JOIN users e ON f.empleado_id = e.id
        ORDER BY f.fecha DESC;
      `;
    }

    const faltas = await query;
    return NextResponse.json(faltas);

  } catch (error) {
    console.error('Error fetching faltas:', error);
    return NextResponse.json(
      { error: 'Error al obtener faltas' },
      { status: 500 }
    );
  }
}

// ========================
// POST - crear falta
// ========================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.empleadoId || !body.fecha || !body.causa) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: empleadoId, fecha, causa' },
        { status: 400 }
      );
    }

    // Obtener usuario que registra la falta
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    let registradoPor = "Sistema";

    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        const [usuario] = await sql`
          SELECT nombre, apellido FROM users WHERE id = ${payload.id as string}::uuid;
        `;
        if (usuario) {
          registradoPor = `${usuario.nombre} ${usuario.apellido}`;
        }
      } catch {}
    }

    // Verificar empleado
    const [empleado] = await sql`
      SELECT id, nombre, apellido, legajo, horario, rol
      FROM users
      WHERE id = ${body.empleadoId}::uuid;
    `;

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya existe falta en ese día
    const [faltaExistente] = await sql`
      SELECT id
      FROM faltas
      WHERE empleado_id = ${body.empleadoId}::uuid
      AND DATE(fecha) = ${body.fecha}::date;
    `;

    if (faltaExistente) {
      return NextResponse.json(
        { error: 'Ya existe una falta registrada para este empleado en esa fecha' },
        { status: 409 }
      );
    }

    // Insertar falta
    const [falta] = await sql`
      INSERT INTO faltas (
        id,
        empleado_id,
        fecha,
        causa,
        observaciones,
        justificada,
        registrado_por,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${body.empleadoId}::uuid,
        ${body.fecha}::date,
        ${body.causa},
        ${body.observaciones || null},
        ${body.justificada || false},
        ${registradoPor},
        NOW(),
        NOW()
      )
      RETURNING 
        id::text,
        empleado_id::text as "empleadoId",
        to_char(fecha, 'YYYY-MM-DD') as fecha,
        causa,
        observaciones,
        justificada,
        registrado_por as "registradoPor",
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
        to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt";
    `;

    // Agregar empleado
    const faltaCompleta = {
      ...falta,
      empleado: {
        id: empleado.id.toString(),
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        legajo: empleado.legajo,
        horario: empleado.horario,
        rol: empleado.rol
      }
    };

    return NextResponse.json(faltaCompleta, { status: 201 });

  } catch (error) {
    console.error("Error creating falta:", error);
    return NextResponse.json(
      { error: 'Error al crear falta', details: String(error) },
      { status: 500 }
    );
  }
}
