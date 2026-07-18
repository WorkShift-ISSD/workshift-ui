import { sql } from '@/app/lib/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

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
        username,
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

// POST /api/users - Crear nuevo usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      legajo,
      email,
      nombre,
      apellido,
      password,
      username,
      rol,
      telefono,
      direccion,
      horario,
      fecha_nacimiento,
      grupo_turno
    } = body;

    if (!legajo || !email || !nombre || !apellido || username || !rol) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Generar contraseña: iniciales del nombre en mayúscula + apellido con inicial mayúscula + "25"
    const inicialesNombre = nombre.trim().split(/\s+/).map((n: string) => n[0].toUpperCase()).join('');
    const apellidoCapital = apellido.trim().charAt(0).toUpperCase() + apellido.trim().slice(1);
    const passwordFinal = password || `${inicialesNombre}${apellidoCapital}25`;
    const hashedPassword = await bcrypt.hash(passwordFinal, 10);

    const [nuevoUsuario] = await sql`
      INSERT INTO users (
        id,
        legajo,
        email,
        nombre,
        apellido,
        password,
        rol,
        username,
        telefono,
        direccion,
        horario,
        fecha_nacimiento,
        activo,
        grupo_turno,
        calificacion,
        total_intercambios,
        primer_ingreso
      ) VALUES (
        gen_random_uuid(),
        ${legajo},
        ${email},
        ${nombre},
        ${apellido},
        ${hashedPassword},
        ${rol},
        ${username},
        ${telefono || null},
        ${direccion || null},
        ${horario || '04:00-14:00'},
        ${fecha_nacimiento || null},
        true,
        ${grupo_turno || 'A'},
        0,
        0,
        true
      )
      RETURNING id::text, legajo, nombre, apellido, email, rol, username;
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