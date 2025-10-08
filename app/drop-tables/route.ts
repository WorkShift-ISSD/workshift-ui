import { NextRequest } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function dropAllTables() {
  console.log('🗑️  Eliminando todas las tablas...');
  
  // Eliminar en orden para respetar foreign keys
  await sql`DROP TABLE IF EXISTS turnos_data CASCADE`;
  await sql`DROP TABLE IF EXISTS cambios CASCADE`;
  await sql`DROP TABLE IF EXISTS stats CASCADE`;
  await sql`DROP TABLE IF EXISTS turnos CASCADE`;
  await sql`DROP TABLE IF EXISTS users CASCADE`;
  
  console.log('✅ Todas las tablas eliminadas');
}

async function showTables() {
  const tables = await sql`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;
  
  return tables.map(t => t.tablename);
}


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tablesBefore = await showTables();
    
    await dropAllTables();
    
    const tablesAfter = await showTables();
    
    return Response.json({ 
      message: 'All tables dropped successfully',
      tablesBefore,
      tablesAfter
    });
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// También soporta POST
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return GET(request, context);
}