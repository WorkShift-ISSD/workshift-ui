// app/api/empleados/route.ts
import { sql } from '@/app/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const empleados = await sql`
      SELECT 
        id::text,
        legajo,
        email,
        nombre,
        apellido,
        rol,
        telefono,
        direccion,
        horario,
        fecha_nacimiento::text as "fechaNacimiento",
        activo,
        grupo_turno as "grupoTurno",
        foto_perfil as "fotoPerfil",
        ultimo_login::text as "ultimoLogin",
        created_at::text as "createdAt",
        updated_at::text as "updatedAt"
      FROM users 
      ORDER BY apellido, nombre
    `;
    
    return NextResponse.json(empleados);
  } catch (error) {
    console.error('Error fetching empleados:', error);
    return NextResponse.json(
      { error: 'Error al leer empleados', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const empleado = await request.json();


    
    const [newEmpleado] = await sql`
      INSERT INTO users (
        legajo, email, nombre, apellido, password, rol, telefono, 
        direccion, horario, fecha_nacimiento, activo, grupo_turno
      )
      VALUES (
        ${empleado.legajo}, ${empleado.email}, ${empleado.nombre}, 
        ${empleado.apellido},  ${empleado.password}, ${empleado.rol}, ${empleado.telefono || null},
        ${empleado.direccion || null}, ${empleado.horario || null}, 
        ${empleado.fechaNacimiento || null}, ${empleado.activo}, ${empleado.grupoTurno}
      )
      RETURNING 
        id::text,
        legajo,
        email,
        nombre,
        apellido,
        password,
        rol,
        telefono,
        direccion,
        horario,
        fecha_nacimiento::text as "fechaNacimiento",
        activo,
        grupo_turno as "grupoTurno",
        created_at::text as "createdAt",
        updated_at::text as "updatedAt"
    `;
    
    return NextResponse.json(newEmpleado, { status: 201 });
  } catch (error) {
    console.error('Error creating empleado:', error);
    return NextResponse.json(
      { error: 'Error al crear empleado', details: String(error) },
      { status: 500 }
    );
  }
}