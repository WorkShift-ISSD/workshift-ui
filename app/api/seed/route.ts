// app/api/seed/route.ts
import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { cambios, users, turnos, stats, turnosData } from '../../lib/placeholder-data';
import { NextRequest } from 'next/server';
import { Cambio, Turno } from '../types';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      legajo INTEGER UNIQUE NOT NULL,
      email TEXT NOT NULL UNIQUE,
      nombre VARCHAR(255) NOT NULL,
      apellido VARCHAR(255) NOT NULL,
      password TEXT NOT NULL,
      rol VARCHAR(50) NOT NULL DEFAULT 'INSPECTOR' CHECK (rol IN ('SUPERVISOR', 'INSPECTOR', 'JEFE', 'ADMINISTRADOR')),
      telefono VARCHAR(50),
      direccion TEXT,
      horario VARCHAR(50),
      fecha_nacimiento DATE,
      activo BOOLEAN DEFAULT true,
      grupo_turno VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (grupo_turno IN ('A', 'B')),
      foto_perfil TEXT,
      ultimo_login TIMESTAMP,
      calificacion DECIMAL(3,2) DEFAULT 4.5,
      total_intercambios INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Crear índices
  await sql`CREATE INDEX IF NOT EXISTS idx_users_legajo ON users(legajo)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_activo ON users(activo)`;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.legajo?.toString() || 'password123', 10);
      return sql`
        INSERT INTO users (
          id, 
          legajo,
          email, 
          nombre, 
          apellido,
          password, 
          rol,
          telefono,
          direccion,
          horario,
          fecha_nacimiento,
          activo,
          grupo_turno,
          calificacion,
          total_intercambios
        )
        VALUES (
          ${user.id}, 
          ${user.legajo || 1000 + Math.floor(Math.random() * 9000)},
          ${user.email}, 
          ${user.nombre}, 
          ${user.apellido || user.nombre.split(' ')[1] || 'Apellido'},
          ${hashedPassword}, 
          ${user.rol},
          ${user.telefono || null},
          ${user.direccion || null},
          ${user.horario || '06:00-16:00'},
          ${user.fechaNacimiento || null},
          ${user.activo !== undefined ? user.activo : true},
          ${user.grupoTurno || 'A'},
          ${4.5},
          ${0}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );
  // 🔹 Crear usuario administrador
  const hashedAdminPassword = await bcrypt.hash('Workshift25', 10);
  await sql`
  INSERT INTO users (
    id,
    legajo,
    email,
    nombre,
    apellido,
    password,
    rol,
    telefono,
    direccion,
    horario,
    fecha_nacimiento,
    activo,
    grupo_turno,
    calificacion,
    total_intercambios
  )
  VALUES (
    uuid_generate_v4(),
    300001,
    'admin@workshift.com',
    'Admin',
    'General',
    ${hashedAdminPassword},
    'ADMINISTRADOR',
    NULL,
    NULL,
    '',
    NULL,
    TRUE,
    'ADMIN',
    5.0,
    0
  )
  ON CONFLICT (email) DO NOTHING;
`;

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
      (turno: any) => sql`
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

  await sql`CREATE INDEX IF NOT EXISTS idx_cambios_fecha ON cambios(fecha)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cambios_estado ON cambios(estado)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cambios_solicitante ON cambios(solicitante)`;

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

//Crea Tablas Faltas
async function seedFaltas() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS faltas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empleado_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      causa TEXT NOT NULL,
      observaciones TEXT,
      justificada BOOLEAN DEFAULT false,
      registrado_por TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_faltas_empleado ON faltas(empleado_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_faltas_fecha ON faltas(fecha)`;

  console.log("✅ Tabla faltas creada");
  return true;
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

  const currentMonth = new Date().toISOString().slice(0, 7);

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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const firstUser = users[0];

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

// ✨ NUEVA FUNCIÓN: Crear tablas de ofertas y solicitudes
async function seedOfertas() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  // Crear tabla ofertas
  await sql`
    CREATE TABLE IF NOT EXISTS ofertas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ofertante_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INTERCAMBIO', 'ABIERTO')),
      fecha_ofrece DATE,
      horario_ofrece VARCHAR(20),
      grupo_ofrece VARCHAR(1) CHECK (grupo_ofrece IN ('A', 'B')),
      fecha_busca DATE,
      horario_busca VARCHAR(20),
      grupo_busca VARCHAR(1) CHECK (grupo_busca IN ('A', 'B')),
      fecha_desde DATE,
      fecha_hasta DATE,
      descripcion TEXT NOT NULL,
      prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN ('NORMAL', 'URGENTE')),
      estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'SOLICITADO', 'APROBADO', 'COMPLETADO', 'CANCELADO')),
      valido_hasta TIMESTAMP NOT NULL,
      publicado TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  // Crear índices para ofertas
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_ofertante ON ofertas(ofertante_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON ofertas(estado)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_publicado ON ofertas(publicado DESC)`;

  console.log('✅ Tabla ofertas creada');
  return true;
}

// ✨ NUEVA FUNCIÓN: Crear tabla de solicitudes directas
async function seedSolicitudesDirectas() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  // Crear tabla solicitudes_directas
  await sql`
    CREATE TABLE IF NOT EXISTS solicitudes_directas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      solicitante_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      destinatario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fecha_solicitante DATE NOT NULL,
      horario_solicitante VARCHAR(20) NOT NULL,
      grupo_solicitante VARCHAR(1) NOT NULL CHECK (grupo_solicitante IN ('A', 'B')),
      fecha_destinatario DATE NOT NULL,
      horario_destinatario VARCHAR(20) NOT NULL,
      grupo_destinatario VARCHAR(1) NOT NULL CHECK (grupo_destinatario IN ('A', 'B')),
      motivo TEXT NOT NULL,
      prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN ('NORMAL', 'URGENTE')),
      estado VARCHAR(20) NOT NULL DEFAULT 'SOLICITADO' CHECK (estado IN ('SOLICITADO', 'APROBADO', 'COMPLETADO', 'CANCELADO')),
      fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  // Crear índices para solicitudes
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_solicitante ON solicitudes_directas(solicitante_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_destinatario ON solicitudes_directas(destinatario_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_directas(estado)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes_directas(fecha_solicitud DESC)`;

  console.log('✅ Tabla solicitudes_directas creada');
  return true;
}

async function createRelations() {
  console.log('✅ Tablas creadas con índices y relaciones');
  return true;
}

async function dropAllTables() {
  console.log('🗑️  Eliminando tablas existentes...');

  await sql`DROP TABLE IF EXISTS solicitudes_directas CASCADE`;
  await sql`DROP TABLE IF EXISTS ofertas CASCADE`;
  await sql`DROP TABLE IF EXISTS turnos_data CASCADE`;
  await sql`DROP TABLE IF EXISTS cambios CASCADE`;
  await sql`DROP TABLE IF EXISTS stats CASCADE`;
  await sql`DROP TABLE IF EXISTS turnos CASCADE`;
  await sql`DROP TABLE IF EXISTS faltas CASCADE`;
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

      await seedFaltas();  
      console.log('✅ Faltas creadas');

      await seedTurnos();
      console.log('✅ Turnos creados');

      await seedCambios();
      console.log('✅ Cambios creados');

      await seedStats();
      console.log('✅ Estadísticas creadas');

      await seedTurnosData();
      console.log('✅ Datos de turnos creados');

      // ✨ AGREGAR: Crear tablas de ofertas y solicitudes
      await seedOfertas();
      await seedSolicitudesDirectas();

      await createRelations();
    });

    return Response.json({
      message: 'Database seeded successfully',
      tables: ['users', 'faltas', 'turnos', 'cambios', 'stats', 'turnos_data', 'ofertas', 'solicitudes_directas'],

      schema: {
        users: {
          campos: [
            'id', 'legajo', 'email', 'nombre', 'apellido', 'password',
            'rol', 'telefono', 'direccion', 'horario', 'fecha_nacimiento',
            'activo', 'grupo_turno', 'foto_perfil', 'ultimo_login',
            'calificacion', 'total_intercambios',
            'created_at', 'updated_at'
          ]
        },
        ofertas: {
          campos: [
            'id', 'ofertante_id', 'tipo', 'fecha_ofrece', 'horario_ofrece',
            'grupo_ofrece', 'fecha_busca', 'horario_busca', 'grupo_busca',
            'fecha_desde', 'fecha_hasta', 'descripcion', 'prioridad', 'estado',
            'valido_hasta', 'publicado', 'created_at', 'updated_at'
          ]
        },
        solicitudes_directas: {
          campos: [
            'id', 'solicitante_id', 'destinatario_id', 'fecha_solicitante',
            'horario_solicitante', 'grupo_solicitante', 'fecha_destinatario',
            'horario_destinatario', 'grupo_destinatario', 'motivo', 'prioridad',
            'estado', 'fecha_solicitud', 'created_at', 'updated_at'
          ]
        }
      }
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
