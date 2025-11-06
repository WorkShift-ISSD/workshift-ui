import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tomadorId } = await request.json();
    const { id } = await params;

    if (!tomadorId) {
      return NextResponse.json(
        { error: 'ID del tomador es requerido' },
        { status: 400 }
      );
    }

    console.log('🟢 ID de oferta:', id);
    console.log('🟢 ID del tomador:', tomadorId);

    // Verificar que la oferta existe y esté disponible
    const [oferta] = await sql`
      SELECT * FROM ofertas 
      WHERE id = ${id} AND estado = 'DISPONIBLE'
    `;

    if (!oferta) {
      return NextResponse.json(
        { error: 'Oferta no disponible o ya tomada' },
        { status: 404 }
      );
    }

    // Actualizar la oferta (solo columnas existentes)
    await sql`
      UPDATE ofertas 
      SET 
        tomador_id = ${tomadorId},
        estado = 'ACEPTADA',
        updated_at = NOW()
      WHERE id = ${id};
    `;

    return NextResponse.json({
      message: '✅ Oferta tomada exitosamente',
    });
  } catch (error: any) {
    console.error('💥 Error al tomar oferta:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud', details: error.message },
      { status: 500 }
    );
  }
}