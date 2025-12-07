// app/api/auth/reset-password/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { sendPasswordChangedEmail } from '@/app/lib/email';
import bcryptjs from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
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

    // Hashear nueva contraseña
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Actualizar contraseña
    await sql`
      UPDATE users 
      SET 
        password = ${hashedPassword},
        primer_ingreso = false,
        ultimo_cambio_password = NOW(),
        updated_at = NOW()
      WHERE id = ${resetToken.user_id}::uuid
    `;

    // Marcar token como usado
    await sql`
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE id = ${resetToken.id}
    `;

    // Enviar email de confirmación
    await sendPasswordChangedEmail(
      resetToken.email,
      `${resetToken.nombre} ${resetToken.apellido}`
    );

    return NextResponse.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la contraseña' },
      { status: 500 }
    );
  }
}