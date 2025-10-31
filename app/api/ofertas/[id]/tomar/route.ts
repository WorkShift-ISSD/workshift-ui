import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';

export async function POST(
  request: NextRequest,
  { params }: { params: { ofertaId: string } }
) {
  try {
    const { tomadorId } = await request.json();
    const { ofertaId } = params;

    if (!tomadorId) {
      return NextResponse.json(
        { error: 'ID del tomador es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la oferta existe y está disponible
    const [oferta] = await sql`
      SELECT * FROM ofertas 
      WHERE id = ${ofertaId} AND estado = 'DISPONIBLE'
    `;

    if (!oferta) {
      return NextResponse.json(
        { error: 'Oferta no disponible' },
        { status: 404 }
      );
    }

    // Actualizar la oferta
    await sql`
      UPDATE ofertas 
      SET 
        tomador_id = ${tomadorId},
        estado = 'ACEPTADA',
        fecha_aceptacion = NOW()
      WHERE id = ${ofertaId}
    `;

    // Aquí podrías crear un registro en la tabla de cambios_turnos
    // o solicitudes_autorizacion si es necesario

    return NextResponse.json({
      message: 'Oferta tomada exitosamente',
    });
  } catch (error) {
    console.error('Error al tomar oferta:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}