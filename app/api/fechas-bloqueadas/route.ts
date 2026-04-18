import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'Workshift25'
);

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const { payload } = await jwtVerify(token, SECRET_KEY);
        const userId = payload.id as string;

        // Obtener rangos de licencias aprobadas
        const licencias = await sql`
      SELECT fecha_desde::text, fecha_hasta::text
      FROM licencias
      WHERE empleado_id = ${userId}::uuid
        AND estado IN ('APROBADA', 'ACTIVA')
        AND fecha_hasta >= NOW()::date;
    `;

        // Obtener rangos de sanciones activas
        const sanciones = await sql`
      SELECT fecha_desde::text, fecha_hasta::text
      FROM sanciones
      WHERE empleado_id = ${userId}::uuid
        AND estado = 'ACTIVA'
        AND fecha_hasta >= NOW()::date;
    `;

        // Expandir rangos a fechas individuales
        const fechasBloqueadas: string[] = [];

        const expandirRango = (desde: string, hasta: string) => {
            const inicio = new Date(desde + 'T00:00:00');
            const fin = new Date(hasta + 'T00:00:00');
            const fechas: string[] = [];
            const current = new Date(inicio);
            while (current <= fin) {
                fechas.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
            return fechas;
        };

        for (const l of licencias) {
            fechasBloqueadas.push(...expandirRango(l.fecha_desde, l.fecha_hasta));
        }
        for (const s of sanciones) {
            fechasBloqueadas.push(...expandirRango(s.fecha_desde, s.fecha_hasta));
        }

        // Deduplicar
        return NextResponse.json([...new Set(fechasBloqueadas)]);

    } catch (error) {
        console.error('❌ Error fetching fechas bloqueadas:', error);
        return NextResponse.json({ error: 'Error al obtener fechas bloqueadas' }, { status: 500 });
    }
}