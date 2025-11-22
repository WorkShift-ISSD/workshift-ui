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

    console.log('📅 Parámetros recibidos:', { fecha, empleadoId });

    let query;

    if (fecha) {
      console.log('🔍 Filtrando por fecha:', fecha);
      // IMPORTANTE: Usar la fecha directamente sin conversión
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
          f.fecha::text as fecha,
          f.causa as motivo,
          f.observaciones,
          f.justificada,
          f.registrado_por as "registradoPor",
          f.created_at::text as "createdAt",
          f.updated_at::text as "updatedAt"
        FROM faltas f
        JOIN users e ON f.empleado_id = e.id
        WHERE f.fecha = ${fecha}::date
        ORDER BY f.created_at DESC;
      `;
    } else if (empleadoId) {
      console.log('👤 Filtrando por empleado:', empleadoId);
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
          f.fecha::text as fecha,
          f.causa as motivo,
          f.observaciones,
          f.justificada,
          f.registrado_por as "registradoPor",
          f.created_at::text as "createdAt",
          f.updated_at::text as "updatedAt"
        FROM faltas f
        JOIN users e ON f.empleado_id = e.id
        WHERE f.empleado_id = ${empleadoId}::uuid
        ORDER BY f.fecha DESC;
      `;
    } else {
      console.log('📋 Obteniendo todas las faltas');
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
          f.fecha::text as fecha,
          f.causa as motivo,
          f.observaciones,
          f.justificada,
          f.registrado_por as "registradoPor",
          f.created_at::text as "createdAt",
          f.updated_at::text as "updatedAt"
        FROM faltas f
        JOIN users e ON f.empleado_id = e.id
        ORDER BY f.fecha DESC;
      `;
    }
    
    const faltas = await query;
    console.log(`✅ Faltas encontradas: ${faltas.length}`);
    
    // Normalizar fechas en el resultado
    const faltasNormalizadas = faltas.map(falta => ({
      ...falta,
      // Asegurar que la fecha sea YYYY-MM-DD sin timestamp
      fecha: falta.fecha.split('T')[0]
    }));
    
    return NextResponse.json(faltasNormalizadas);

  } catch (error) {
    console.error('❌ Error en GET /api/faltas:', error);
    return NextResponse.json(
      { error: 'Error al obtener faltas', details: String(error) },
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

    console.log('📝 Creando falta:', body);

    // Soportar tanto 'motivo' como 'causa' para compatibilidad
    const motivo = body.motivo || body.causa;

    if (!body.empleadoId || !body.fecha || !motivo) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: empleadoId, fecha, motivo' },
        { status: 400 }
      );
    }

    // Normalizar fecha (solo YYYY-MM-DD)
    const fechaNormalizada = body.fecha.split('T')[0];
    console.log('📅 Fecha normalizada:', fechaNormalizada);

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
      AND fecha = ${fechaNormalizada}::date;
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
        ${fechaNormalizada}::date,
        ${body.motivo},
        ${body.observaciones || null},
        ${body.justificada || false},
        ${registradoPor},
        NOW(),
        NOW()
      )
      RETURNING 
        id::text,
        empleado_id::text as "empleadoId",
        fecha::text as fecha,
        causa as motivo,
        observaciones,
        justificada,
        registrado_por as "registradoPor",
        created_at::text as "createdAt",
        updated_at::text as "updatedAt";
    `;

    // Normalizar fecha en respuesta
    const faltaCompleta = {
      ...falta,
      fecha: falta.fecha.split('T')[0],
      empleado: {
        id: empleado.id.toString(),
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        legajo: empleado.legajo,
        horario: empleado.horario,
        rol: empleado.rol
      }
    };

    console.log('✅ Falta creada:', faltaCompleta);

    return NextResponse.json(faltaCompleta, { status: 201 });

  } catch (error) {
    console.error("❌ Error al crear falta:", error);
    return NextResponse.json(
      { error: 'Error al crear falta', details: String(error) },
      { status: 500 }
    );
  }
}