import { sql } from '@/app/lib/postgres';
import { NextResponse } from 'next/server';

// GET /api/users - Obtener todos los usuarios
export async function GET() {
  try {
    const usuarios = await sql`
      SELECT 
        id::text, 
        legajo,
        nombre, 
        apellido,
        email,
        rol,
        grupo_turno as "grupoTurno",
        horario,
        activo
      FROM users 
      WHERE activo = true
      ORDER BY nombre, apellido;
    `;
    
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST /api/users - Crear nuevo usuario (opcional)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      legajo,
      email,
      nombre,
      apellido,
      password,
      rol,
      telefono,
      direccion,
      horario,
      fecha_nacimiento,
      grupo_turno
    } = body;

    // Validación básica
    if (!legajo || !email || !nombre || !apellido || !rol) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    const [nuevoUsuario] = await sql`
      INSERT INTO users (
        id,
        legajo,
        email,
        nombre,
        apellido,
        password,
        rol,
        telefono,
        direccion,
        horario,
        fecha_nacimiento,
        activo,
        grupo_turno,
        calificacion,
        total_intercambios
      ) VALUES (
        gen_random_uuid(),
        ${legajo},
        ${email},
        ${nombre},
        ${apellido},
        ${password || 'password123'},
        ${rol},
        ${telefono || null},
        ${direccion || null},
        ${horario || '04:00-14:00'},
        ${fecha_nacimiento || null},
        true,
        ${grupo_turno || 'A'},
        0,
        0
      )
      RETURNING id::text, legajo, nombre, apellido, email, rol;
    `;

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}