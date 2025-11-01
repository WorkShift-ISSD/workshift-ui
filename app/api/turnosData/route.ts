// app/api/turnosData/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../lib/postgres';

export async function GET(request: NextRequest) {
  try {
    // En producción deberías obtener el user_id del token/sesión
    // Por ahora usamos el primer usuario
    const userId = '410544b2-4001-4271-9855-fec4b6a6442a';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const [turnosData] = await sql`
      SELECT 
        mis_guardias, 
        guardias_cubiertas, 
        guardias_que_me_cubrieron, 
        total
      FROM turnos_data 
      WHERE user_id = ${userId} AND mes = ${currentMonth}
    `;
    
    if (!turnosData) {
      return NextResponse.json({
        misGuardias: 0,
        guardiasCubiertas: 0,
        guardiasQueMeCubrieron: 0,
        total: 0
      });
    }
    
    return NextResponse.json({
      misGuardias: turnosData.mis_guardias,
      guardiasCubiertas: turnosData.guardias_cubiertas,
      guardiasQueMeCubrieron: turnosData.guardias_que_me_cubrieron,
      total: turnosData.total
    });
  } catch (error) {
    console.error('Error fetching turnosData:', error);
    return NextResponse.json(
      { error: 'Error al leer datos de turnos' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    const userId = '410544b2-4001-4271-9855-fec4b6a6442a';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const [updatedData] = await sql`
      INSERT INTO turnos_data (
        user_id, 
        mis_guardias, 
        guardias_cubiertas, 
        guardias_que_me_cubrieron, 
        total, 
        mes
      )
      VALUES (
        ${userId},
        ${updates.misGuardias},
        ${updates.guardiasCubiertas},
        ${updates.guardiasQueMeCubrieron},
        ${updates.total},
        ${currentMonth}
      )
      ON CONFLICT (user_id, mes) DO UPDATE SET
        mis_guardias = EXCLUDED.mis_guardias,
        guardias_cubiertas = EXCLUDED.guardias_cubiertas,
        guardias_que_me_cubrieron = EXCLUDED.guardias_que_me_cubrieron,
        total = EXCLUDED.total,
        updated_at = NOW()
      RETURNING *
    `;
    
    return NextResponse.json({
      misGuardias: updatedData.mis_guardias,
      guardiasCubiertas: updatedData.guardias_cubiertas,
      guardiasQueMeCubrieron: updatedData.guardias_que_me_cubrieron,
      total: updatedData.total
    });
  } catch (error) {
    console.error('Error updating turnosData:', error);
    return NextResponse.json(
      { error: 'Error al actualizar datos de turnos' },
      { status: 500 }
    );
  }
}