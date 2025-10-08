import { sql } from '@/app/lib/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    return NextResponse.json({ 
      success: true,
      connection: 'OK',
      data: result[0]
    });
  } catch (error) {
    console.error('Error de conexión:', error);
    return NextResponse.json({ 
      success: false,
      error: String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}