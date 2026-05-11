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

    console.log('🔍 [AUTH/ME] Verificando autenticación...');
    console.log('🔍 [AUTH/ME] Token encontrado:', token ? 'SI' : 'NO');
    console.log('🔍 [AUTH/ME] Cookies disponibles:', cookieStore.getAll().map(c => c.name));

    if (!token) {
      console.log('❌ [AUTH/ME] No hay token en cookies');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar token
    console.log('🔍 [AUTH/ME] Verificando token JWT...');
    const { payload } = await jwtVerify(token, SECRET_KEY);
    console.log('✅ [AUTH/ME] Token válido. Payload:', payload);

    // Extraer y validar el ID del usuario
    const userId = payload.id as string;

    if (!userId) {
      console.log('❌ [AUTH/ME] No hay ID en el payload');
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    console.log('🔍 [AUTH/ME] Buscando usuario con ID:', userId);

    // Obtener datos actualizados del usuario
    const [user] = await sql`
      SELECT 
        id::text,
        legajo,
        email,
        nombre,
        apellido,
        horario,
        rol,
        grupo_turno as "grupoTurno",
        horario,
        activo,
        foto_perfil as imagen,
        cloudinary_public_id,
        telefono,
        direccion,
        fecha_nacimiento as "fechaNacimiento",
        COALESCE(
          (SELECT ROUND(AVG(c.promedio)::numeric, 1) FROM calificaciones c WHERE c.calificado_id = u.id),
          0
        ) as calificacion
      FROM users u
      WHERE u.id = ${userId}::uuid AND u.activo = true
    `;

    if (!user) {
      console.log('❌ [AUTH/ME] Usuario no encontrado en BD');
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ [AUTH/ME] Usuario encontrado:', user.email);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('❌ [AUTH/ME] Error:', error);
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    );
  }
}