// app/api/auth/login/route.ts (ACTUALIZADO)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import bcryptjs from 'bcryptjs';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario en la BD
    const [user] = await sql`
      SELECT 
        id::text,
        legajo,
        email,
        nombre,
        apellido,
        password,
        rol,
        grupo_turno as "grupoTurno",
        horario,
        activo,
        primer_ingreso as "primerIngreso"
      FROM users 
      WHERE email = ${email} AND activo = true
    `;

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar contraseña con bcryptjs
    const isValidPassword = await bcryptjs.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Determinar duración del token según "recordarme"
    const tokenDuration = rememberMe ? '30d' : '24h'; // 30 días o 24 horas
    const cookieMaxAge = rememberMe 
      ? 60 * 60 * 24 * 30  // 30 días en segundos
      : 60 * 60 * 24;      // 24 horas en segundos

    // Crear JWT token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      rol: user.rol,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(tokenDuration)
      .sign(SECRET_KEY);

    // Guardar token en cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    // Actualizar último login
    await sql`
      UPDATE users 
      SET ultimo_login = NOW() 
      WHERE id = ${user.id}::uuid
    `;

    // Retornar datos del usuario (sin password)
    const { password: _, ...userData } = user;

    return NextResponse.json({
      message: 'Login exitoso',
      user: userData,
      primerIngreso: user.primerIngreso || false,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error al procesar login' },
      { status: 500 }
    );
  }
}