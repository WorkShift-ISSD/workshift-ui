import { sql } from '@/app/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const [user] = await sql`
      SELECT id::text, nombre, email, rol, created_at, updated_at 
      FROM users 
      WHERE id::text = ${id}
    `;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Error al leer usuario' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updates = await request.json();
    
    const [updated] = await sql`
      UPDATE users 
      SET 
        nombre = COALESCE(${updates.nombre}, nombre),
        email = COALESCE(${updates.email}, email),
        rol = COALESCE(${updates.rol}, rol),
        updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING id::text, nombre, email, rol, created_at, updated_at
    `;
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const [deleted] = await sql`
      DELETE FROM users 
      WHERE id::text = ${id}
      RETURNING id::text, nombre, email, rol
    `;
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}