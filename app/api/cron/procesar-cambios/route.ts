import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';

export async function GET(request: NextRequest) {
    try {
        // Verificar que la llamada viene de Vercel Cron
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const hoy = new Date().toISOString().split('T')[0];

        // Marcar ofertas vencidas como EXPIRADO
        await sql`
            UPDATE ofertas
            SET estado = 'EXPIRADO'
            WHERE estado = 'DISPONIBLE'
            AND valido_hasta < NOW();
        `;

        // Marcar como REALIZADO los turnos efectivos con fecha pasada
        const resultado = await sql`
            UPDATE turnos_efectivos
            SET estado = 'REALIZADO'
            WHERE estado = 'PENDIENTE'
            AND fecha < ${hoy}::date
            RETURNING id::text, empleado_id::text, fecha::text;
        `;

        console.log(`✅ Cron ejecutado: ${resultado.length} turnos marcados como REALIZADO`);

        return NextResponse.json({
            message: 'Proceso completado',
            turnosActualizados: resultado.length,
            detalle: resultado
        });

    } catch (error) {
        console.error('❌ Error en cron procesar-cambios:', error);
        return NextResponse.json(
            { error: 'Error al procesar cambios', details: String(error) },
            { status: 500 }
        );
    }
}
