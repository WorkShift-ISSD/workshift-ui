// app/api/turnos/route.ts
import { sql } from '@/app/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const turnos = await sql`
      SELECT * FROM turnos 
      ORDER BY tipo, hora_inicio
    `;
    
    // Transformar snake_case a camelCase para el frontend
    const turnosFormatted = turnos.map(turno => ({
      id: turno.id,
      nombre: turno.nombre,
      tipo: turno.tipo,
      horaInicio: turno.hora_inicio,
      horaFin: turno.hora_fin
    }));
    
    return NextResponse.json(turnosFormatted);
  } catch (error) {
    console.error('Error fetching turnos:', error);
    return NextResponse.json(
      { error: 'Error al leer turnos' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const turno = await request.json();
    
    const [newTurno] = await sql`
      INSERT INTO turnos (nombre, tipo, hora_inicio, hora_fin)
      VALUES (${turno.nombre}, ${turno.tipo}, ${turno.horaInicio}, ${turno.horaFin})
      RETURNING *
    `;
    
    return NextResponse.json({
      id: newTurno.id,
      nombre: newTurno.nombre,
      tipo: newTurno.tipo,
      horaInicio: newTurno.hora_inicio,
      horaFin: newTurno.hora_fin
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating turno:', error);
    return NextResponse.json(
      { error: 'Error al crear turno' },
      { status: 500 }
    );
  }
}