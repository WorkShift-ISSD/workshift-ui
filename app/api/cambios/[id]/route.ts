import { sql } from '@/app/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const id = params.id;
  
  try {
    const [cambio] = await sql`
      SELECT 
        id::text,
        fecha::text,
        turno,
        solicitante,
        destinatario,
        estado
      FROM cambios 
      WHERE id::text = ${id}
    `;
    
    if (!cambio) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(cambio);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const id = params.id;
  
  try {
    const updates = await request.json();
    
    // ✅ SOLUCIÓN: Query simple con COALESCE
    const [updated] = await sql`
      UPDATE cambios 
      SET 
        fecha = COALESCE(${updates.fecha || null}::date, fecha),
        turno = COALESCE(${updates.turno || null}, turno),
        solicitante = COALESCE(${updates.solicitante || null}, solicitante),
        destinatario = COALESCE(${updates.destinatario || null}, destinatario),
        estado = COALESCE(${updates.estado || null}, estado),
        updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING 
        id::text,
        fecha::text,
        turno,
        solicitante,
        destinatario,
        estado
    `;
    
    if (!updated) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('❌ Error updating cambio:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const id = params.id;
  
  try {
    console.log('🗑️ Eliminando cambio ID:', id);
    
    const [deleted] = await sql`
      DELETE FROM cambios 
      WHERE id::text = ${id}
      RETURNING id::text, turno
    `;
    
    if (!deleted) {
      console.log('❌ Cambio no encontrado:', id);
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    
    console.log('✅ Cambio eliminado:', deleted);
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('❌ Error deleting cambio:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}