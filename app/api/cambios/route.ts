// app/api/cambios/route.ts
import { sql } from '@/app/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {  // ← SIN parámetros
  try {
    const cambios = await sql`
      SELECT 
        id::text,
        fecha::text,
        turno,
        solicitante,
        destinatario,
        estado,
        created_at,
        updated_at
      FROM cambios 
      ORDER BY fecha DESC
    `;
    
    return NextResponse.json(cambios);
  } catch (error) {
    console.error('❌ Error fetching cambios:', error);
    return NextResponse.json(
      { 
        error: 'Error al leer cambios', 
        details: String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {  // ← SIN parámetros
  try {
    const cambio = await request.json();
    
    const [newCambio] = await sql`
      INSERT INTO cambios (fecha, turno, solicitante, destinatario, estado)
      VALUES (${cambio.fecha}, ${cambio.turno}, ${cambio.solicitante}, 
              ${cambio.destinatario}, ${cambio.estado})
      RETURNING 
        id::text,
        fecha::text,
        turno,
        solicitante,
        destinatario,
        estado,
        created_at,
        updated_at
    `;
    
    return NextResponse.json(newCambio, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating cambio:', error);
    return NextResponse.json(
      { error: 'Error al crear cambio', details: String(error) },
      { status: 500 }
    );
  }
}