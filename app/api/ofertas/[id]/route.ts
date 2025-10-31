// app/api/ofertas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// PATCH - Actualizar estado de oferta
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const [ofertaActualizada] = await sql`
      UPDATE ofertas 
      SET 
        estado = ${body.estado},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!ofertaActualizada) {
      return NextResponse.json(
        { error: 'Oferta no encontrada' }, 
        { status: 404 }
      );
    }

    return NextResponse.json(ofertaActualizada);
  } catch (error) {
    console.error('Error updating oferta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar oferta' }, 
      { status: 500 }
    );
  }
}

// DELETE - Eliminar oferta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await sql`
      DELETE FROM ofertas 
      WHERE id = ${id};
    `;

    return NextResponse.json({ message: 'Oferta eliminada' });
  } catch (error) {
    console.error('Error deleting oferta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar oferta' }, 
      { status: 500 }
    );
  }
}