// app/api/seed/route.ts
import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { cambios, users, turnos, stats, turnosData } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      rol VARCHAR(50) NOT NULL DEFAULT 'inspector',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password || 'password123', 10);
      return sql`
        INSERT INTO users (id, nombre, email, password, rol)
        VALUES (${user.id}, ${user.nombre}, ${user.email}, ${hashedPassword}, ${user.rol})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  return insertedUsers;
}

async function seedTurnos() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS turnos (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('mañana', 'tarde', 'nocturno')),
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const insertedTurnos = await Promise.all(
    turnos.map(
      (turno) => sql`
        INSERT INTO turnos (id, nombre, tipo, hora_inicio, hora_fin)
        VALUES (${turno.id}, ${turno.nombre}, ${turno.tipo}, ${turno.horaInicio}, ${turno.horaFin})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedTurnos;
}

async function seedCambios() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS cambios (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      fecha DATE NOT NULL,
      turno VARCHAR(255) NOT NULL,
      solicitante VARCHAR(255) NOT NULL,
      destinatario VARCHAR(255) NOT NULL,
      estado VARCHAR(50) NOT NULL CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Crear índices para mejorar el rendimiento
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cambios_fecha ON cambios(fecha);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cambios_estado ON cambios(estado);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cambios_solicitante ON cambios(solicitante);
  `;

  const insertedCambios = await Promise.all(
    cambios.map(
      (cambio) => sql`
        INSERT INTO cambios (id, fecha, turno, solicitante, destinatario, estado)
        VALUES (${cambio.id}, ${cambio.fecha}, ${cambio.turno}, ${cambio.solicitante}, ${cambio.destinatario}, ${cambio.estado})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedCambios;
}

async function seedStats() {
  await sql`
    CREATE TABLE IF NOT EXISTS stats (
      id SERIAL PRIMARY KEY,
      turnos_oferta INT NOT NULL DEFAULT 0,
      aprobados INT NOT NULL DEFAULT 0,
      pendientes INT NOT NULL DEFAULT 0,
      rechazados INT NOT NULL DEFAULT 0,
      mes VARCHAR(7) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Insertar stats del mes actual
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  await sql`
    INSERT INTO stats (turnos_oferta, aprobados, pendientes, rechazados, mes)
    VALUES (${stats.turnosOferta}, ${stats.aprobados}, ${stats.pendientes}, ${stats.rechazados}, ${currentMonth})
    ON CONFLICT (mes) DO UPDATE SET
      turnos_oferta = EXCLUDED.turnos_oferta,
      aprobados = EXCLUDED.aprobados,
      pendientes = EXCLUDED.pendientes,
      rechazados = EXCLUDED.rechazados,
      updated_at = NOW();
  `;

  return true;
}

async function seedTurnosData() {
  await sql`
    CREATE TABLE IF NOT EXISTS turnos_data (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mis_guardias INT NOT NULL DEFAULT 0,
      guardias_cubiertas INT NOT NULL DEFAULT 0,
      guardias_que_me_cubrieron INT NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 0,
      mes VARCHAR(7) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, mes)
    );
  `;

  // Insertar turnos data para el primer usuario (Emanuel)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const firstUser = users[0]; // Emanuel
  
  await sql`
    INSERT INTO turnos_data (
      user_id, 
      mis_guardias, 
      guardias_cubiertas, 
      guardias_que_me_cubrieron, 
      total, 
      mes
    )
    VALUES (
      ${firstUser.id}, 
      ${turnosData.misGuardias}, 
      ${turnosData.guardiasCubiertas}, 
      ${turnosData.guardiasQueMeCubrieron}, 
      ${turnosData.total}, 
      ${currentMonth}
    )
    ON CONFLICT (user_id, mes) DO UPDATE SET
      mis_guardias = EXCLUDED.mis_guardias,
      guardias_cubiertas = EXCLUDED.guardias_cubiertas,
      guardias_que_me_cubrieron = EXCLUDED.guardias_que_me_cubrieron,
      total = EXCLUDED.total,
      updated_at = NOW();
  `;

  return true;
}

async function createRelations() {
  // Agregar foreign keys si quieres relacionar datos
  // Por ahora mantengo el diseño simple sin FKs estrictas
  // para que sea compatible con tu db.json
  
  console.log('✅ Tablas creadas con índices');
  return true;
}

async function dropAllTables() {
  console.log('🗑️  Eliminando tablas existentes...');
  
  await sql`DROP TABLE IF EXISTS turnos_data CASCADE`;
  await sql`DROP TABLE IF EXISTS cambios CASCADE`;
  await sql`DROP TABLE IF EXISTS stats CASCADE`;
  await sql`DROP TABLE IF EXISTS turnos CASCADE`;
  await sql`DROP TABLE IF EXISTS users CASCADE`;
  
  console.log('✅ Tablas eliminadas');
}

export async function GET() {
  try {
    await sql.begin(async (sql) => {
      console.log('🌱 Iniciando seed de la base de datos...');
      
      // IMPORTANTE: Eliminar tablas existentes primero
      await dropAllTables();
      
      await seedUsers();
      console.log('✅ Usuarios creados');
      
      await seedTurnos();
      console.log('✅ Turnos creados');
      
      await seedCambios();
      console.log('✅ Cambios creados');
      
      await seedStats();
      console.log('✅ Estadísticas creadas');
      
      await seedTurnosData();
      console.log('✅ Datos de turnos creados');
      
      await createRelations();
    });

    return Response.json({ 
      message: 'Database seeded successfully',
      tables: ['users', 'turnos', 'cambios', 'stats', 'turnos_data']
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// También puedes ejecutarlo directamente desde CLI
export async function POST() {
  return GET();
}