// api/ofertas/[id]/tomar/route.ts
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

    // ✅ SOLUCIÓN FINAL: Solo verificar IS NULL (no comparar con string vacío)
    const [oferta] = await sql`
      SELECT * FROM ofertas 
      WHERE id = ${id} 
        AND estado IN ('DISPONIBLE', 'SOLICITADO')
        AND tomador_id IS NULL
    `;

    if (!oferta) {
      // Verificar si existe pero con otro estado
      const [ofertaExistente] = await sql`
        SELECT estado, tomador_id FROM ofertas WHERE id = ${id}
      `;
      
      if (!ofertaExistente) {
        return NextResponse.json(
          { error: 'Oferta no encontrada' },
          { status: 404 }
        );
      }

      if (ofertaExistente.tomador_id) {
        return NextResponse.json(
          { error: 'Esta oferta ya fue tomada por otro usuario' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Oferta no disponible',
          estadoActual: ofertaExistente.estado,
          mensaje: `Esta oferta tiene estado "${ofertaExistente.estado}" y no puede ser tomada`
        },
        { status: 400 }
      );
    }

    // Verificar que el tomador no sea el mismo que el ofertante
    if (oferta.ofertante_id === tomadorId) {
      return NextResponse.json(
        { error: 'No puedes tomar tu propia oferta' },
        { status: 400 }
      );
    }

    // ✅ ACTUALIZAR: Cambiar a APROBADO cuando alguien toma la oferta
    await sql`
      UPDATE ofertas 
      SET 
        tomador_id = ${tomadorId},
        estado = 'APROBADO',
        updated_at = NOW()
      WHERE id = ${id};
    `;

    console.log('✅ Oferta tomada exitosamente');

    return NextResponse.json({
      message: '✅ Oferta tomada exitosamente',
      estado: 'APROBADO'
    });
  } catch (error: any) {
    console.error('💥 Error al tomar oferta:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud', details: error.message },
      { status: 500 }
    );
  }
}