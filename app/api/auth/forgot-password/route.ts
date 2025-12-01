// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { sendPasswordResetEmail } from '@/app/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'El email es requerido' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const [user] = await sql`
      SELECT id::text, nombre, apellido, email 
      FROM users 
      WHERE email = ${email} AND activo = true
    `;

    // Por seguridad, siempre devolver éxito (aunque el usuario no exista)
    // Esto evita que se puedan enumerar emails válidos
    if (!user) {
      console.log('Usuario no encontrado:', email);
      return NextResponse.json({
        message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña'
      });
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora

    // Invalidar tokens anteriores del usuario
    await sql`
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE user_id = ${user.id}::uuid AND used = false
    `;

    // Guardar nuevo token
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}::uuid, ${resetToken}, ${expiresAt.toISOString()})
    `;

    // Enviar email
    await sendPasswordResetEmail(
      user.email,
      resetToken,
      `${user.nombre} ${user.apellido}`
    );

    return NextResponse.json({
      message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña'
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}