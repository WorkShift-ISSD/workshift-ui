// app/api/auth/verify-reset-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }

    // Buscar token
    const [resetToken] = await sql`
      SELECT 
        prt.id,
        prt.user_id::text,
        prt.expires_at,
        prt.used,
        u.nombre,
        u.apellido,
        u.email
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = ${token}
    `;

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 404 }
      );
    }

    // Verificar si ya fue usado
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'Este enlace ya fue utilizado' },
        { status: 400 }
      );
    }

    // Verificar si expiró
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Este enlace ha expirado' },
        { status: 400 }
      );
    }

    // Token válido
    return NextResponse.json({
      valid: true,
      user: {
        nombre: resetToken.nombre,
        apellido: resetToken.apellido,
        email: resetToken.email
      }
    });

  } catch (error) {
    console.error('Error verificando token:', error);
    return NextResponse.json(
      { error: 'Error al verificar el token' },
      { status: 500 }
    );
  }
}