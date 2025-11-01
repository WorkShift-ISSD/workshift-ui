// app/api/solicitudes-directas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const [solicitudActualizada] = await sql`
      UPDATE solicitudes_directas 
      SET 
        estado = ${body.estado},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!solicitudActualizada) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' }, 
        { status: 404 }
      );
    }

    return NextResponse.json(solicitudActualizada);
  } catch (error) {
    console.error('Error updating solicitud:', error);
    return NextResponse.json(
      { error: 'Error al actualizar solicitud' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await sql`
      DELETE FROM solicitudes_directas
      WHERE id = ${id};
    `;

    return NextResponse.json({ message: 'Solicitud eliminada' });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    return NextResponse.json(
      { error: 'Error al eliminar solicitud' },
      { status: 500 }
    );
  }
}