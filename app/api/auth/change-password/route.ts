// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { sendPasswordChangedEmail } from '@/app/lib/email';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    const { currentPassword, newPassword } = await request.json();

    // Validar nueva contraseña
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Validar que tenga al menos una mayúscula, una minúscula y un número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const [user] = await sql`
      SELECT 
        id::text,
        password,
        nombre,
        apellido,
        email,
        primer_ingreso
      FROM users 
      WHERE id = ${userId}::uuid
    `;

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Si NO es primer ingreso, verificar contraseña actual
    if (!user.primer_ingreso) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Contraseña actual requerida' },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Contraseña actual incorrecta' },
          { status: 401 }
        );
      }
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser diferente a la actual' },
        { status: 400 }
      );
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await sql`
      UPDATE users 
      SET 
        password = ${hashedPassword},
        primer_ingreso = false,
        ultimo_cambio_password = NOW(),
        updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;

    // Enviar email de confirmación
    await sendPasswordChangedEmail(
      user.email,
      `${user.nombre} ${user.apellido}`
    );

    return NextResponse.json({
      message: 'Contraseña actualizada exitosamente',
      primerIngreso: false
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return NextResponse.json(
      { error: 'Error al cambiar la contraseña' },
      { status: 500 }
    );
  }
}