import { sql } from '@/app/lib/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { usuarios } = await request.json();
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return NextResponse.json({ error: 'No hay usuarios para importar' }, { status: 400 });
    }

    const creados: any[] = [];
    const errores: { fila: number; error: string }[] = [];

    for (const u of usuarios) {
      try {
        const inicialesNombre = u.nombre.trim().split(/\s+/).map((n: string) => n[0].toUpperCase()).join('');
        const apellidoCapital = u.apellido.trim().charAt(0).toUpperCase() + u.apellido.trim().slice(1);
        const password = `${inicialesNombre}${apellidoCapital}25`;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [nuevo] = await sql`
          INSERT INTO users (
            id, legajo, email, nombre, apellido, password, rol, username,
            telefono, direccion, horario, activo, grupo_turno,
            calificacion, total_intercambios, primer_ingreso
          ) VALUES (
            gen_random_uuid(), ${u.legajo}, ${u.email}, ${u.nombre}, ${u.apellido},
            ${hashedPassword}, ${u.rol}, ${u.username},
            ${u.telefono || null}, ${u.direccion || null},
            ${u.horario || '04:00-14:00'}, true, ${u.grupo_turno || 'A'},
            0, 0, true
          )
          RETURNING id::text, legajo, nombre, apellido, email, username, rol
        `;
        creados.push(nuevo);
      } catch (err: any) {
        const msg = err.message || '';
        errores.push({
          fila: u.legajo,
          error: msg.includes('unique') || msg.includes('duplicate')
            ? 'Legajo, email o username duplicado'
            : 'Error al crear usuario',
        });
      }
    }

    return NextResponse.json({ creados: creados.length, errores });
  } catch (error) {
    console.error('Error en bulk import:', error);
    return NextResponse.json({ error: 'Error al importar usuarios' }, { status: 500 });
  }
}
