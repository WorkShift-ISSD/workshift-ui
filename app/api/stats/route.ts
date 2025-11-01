// app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const [stats] = await sql`
      SELECT turnos_oferta, aprobados, pendientes, rechazados
      FROM stats 
      WHERE mes = ${currentMonth}
    `;
    
    if (!stats) {
      // Retornar stats por defecto si no existe para este mes
      return NextResponse.json({
        turnos_oferta: 0,
        aprobados: 0,
        pendientes: 0,
        rechazados: 0
      });
    }
    
    return NextResponse.json({
      turnosOferta: stats.turnos_oferta,
      aprobados: stats.aprobados,
      pendientes: stats.pendientes,
      rechazados: stats.rechazados
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error al leer estadísticas' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const [updatedStats] = await sql`
      INSERT INTO stats (turnos_oferta, aprobados, pendientes, rechazados, mes)
      VALUES (
        ${updates.turnosOferta}, 
        ${updates.aprobados}, 
        ${updates.pendientes}, 
        ${updates.rechazados}, 
        ${currentMonth}
      )
      ON CONFLICT (mes) DO UPDATE SET
        turnos_oferta = EXCLUDED.turnos_oferta,
        aprobados = EXCLUDED.aprobados,
        pendientes = EXCLUDED.pendientes,
        rechazados = EXCLUDED.rechazados,
        updated_at = NOW()
      RETURNING *
    `;
    
    return NextResponse.json({
      turnosOferta: updatedStats.turnos_oferta,
      aprobados: updatedStats.aprobados,
      pendientes: updatedStats.pendientes,
      rechazados: updatedStats.rechazados
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estadísticas' },
      { status: 500 }
    );
  }
}