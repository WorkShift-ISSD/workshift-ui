// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { sendPasswordChangedEmail } from '@/app/lib/email';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcryptjs from 'bcryptjs';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function POST(request: NextRequest) {
  // Crear conexión DENTRO de la función
  const sql = postgres(process.env.POSTGRES_URL || '', { ssl: 'require' });

  try {
    // Verificar autenticación
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      await sql.end();
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
      await sql.end();
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Validar que tenga al menos una mayúscula, una minúscula y un número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      await sql.end();
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
      await sql.end();
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Si NO es primer ingreso, verificar contraseña actual
    if (!user.primer_ingreso) {
      if (!currentPassword) {
        await sql.end();
        return NextResponse.json(
          { error: 'Contraseña actual requerida' },
          { status: 400 }
        );
      }

      const isValidPassword = await bcryptjs.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        await sql.end();
        return NextResponse.json(
          { error: 'Contraseña actual incorrecta' },
          { status: 401 }
        );
      }
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcryptjs.compare(newPassword, user.password);
    if (isSamePassword) {
      await sql.end();
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser diferente a la actual' },
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
      WHERE id = ${userId}::uuid
    `;

    // Enviar email de confirmación
    try {
      await sendPasswordChangedEmail(
        user.email,
        `${user.nombre} ${user.apellido}`
      );
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      // No fallar si el email no se envía
    }

    // Cerrar conexión
    await sql.end();

    return NextResponse.json({
      message: 'Contraseña actualizada exitosamente',
      primerIngreso: false
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    
    // Cerrar conexión en caso de error
    try {
      await sql.end();
    } catch (e) {
      // Ignorar errores al cerrar
    }

    return NextResponse.json(
      { error: 'Error al cambiar la contraseña' },
      { status: 500 }
    );
  }
}