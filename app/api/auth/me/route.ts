import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { sql } from '@/app/lib/postgres';



const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar token
    const { payload } = await jwtVerify(token, SECRET_KEY);

    // Obtener datos actualizados del usuario
    const [user] = await sql`
      SELECT 
        id::text,
        legajo,
        email,
        nombre,
        apellido,
        rol,
        grupo_turno as "grupoTurno",
        activo
      FROM users 
      WHERE id = ${payload.id} AND activo = true
    `;

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    );
  }
}