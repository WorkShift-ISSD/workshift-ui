// app/api/empleados/[id]/route.ts
import { sql } from '@/app/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const id = params.id;
  
  try {
    const [empleado] = await sql`
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
      WHERE id::text = ${id}
    `;
    
    if (!empleado) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(empleado);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const id = params.id;
  
  try {
    const updates = await request.json();
    
    const [updated] = await sql`
      UPDATE users 
      SET 
        legajo = COALESCE(${updates.legajo || null}, legajo),
        email = COALESCE(${updates.email || null}, email),
        nombre = COALESCE(${updates.nombre || null}, nombre),
        apellido = COALESCE(${updates.apellido || null}, apellido),
        rol = COALESCE(${updates.rol || null}, rol),
        telefono = COALESCE(${updates.telefono || null}, telefono),
        direccion = COALESCE(${updates.direccion || null}, direccion),
        horario = COALESCE(${updates.horario || null}, horario),
        fecha_nacimiento = COALESCE(${updates.fechaNacimiento || null}::date, fecha_nacimiento),
        activo = COALESCE(${updates.activo !== undefined ? updates.activo : null}, activo),
        grupo_turno = COALESCE(${updates.grupoTurno || null}, grupo_turno),
        updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING 
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
        created_at::text as "createdAt",
        updated_at::text as "updatedAt"
    `;
    
    if (!updated) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const id = params.id;
  
  try {
    const [deleted] = await sql`
      DELETE FROM users 
      WHERE id::text = ${id}
      RETURNING id::text, nombre, apellido
    `;
    
    if (!deleted) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}