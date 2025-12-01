// app/api/seed/route.ts
import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { cambios, users, turnos, stats, turnosData } from '../../lib/placeholder-data';
import { NextRequest } from 'next/server';
import { Cambio, Turno } from '../types';
import {
  EstadoSolicitud,
  EstadoOferta,
  RolUsuario,
  GrupoTurno,
  TipoTurno,
  TipoOferta,
  Prioridad,
  EstadoCambio,
  getEnumSqlString,
  TipoSolicitud
} from '../../lib/enum';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Usuarios del sistema
const systemUsers = [
  {
    legajo: 300001,
    email: 'admin@workshift.com',
    nombre: 'Admin',
    apellido: 'General',
    password: 'Workshift25',
    rol: RolUsuario.ADMINISTRADOR,
    grupoTurno: GrupoTurno.ADMIN,
    horario: '00:00-23:59'
  },
  {
    legajo: 300002,
    email: 'jefe3@workshift.com',
    nombre: 'Jefe',
    apellido: 'Principal',
    password: 'Password.666!',
    rol: RolUsuario.JEFE,
    grupoTurno: GrupoTurno.A,
    horario: '05:00-17:00'
  },
  {
    legajo: 300003,
    email: 'supervisor3@workshift.com',
    nombre: 'Supervisor',
    apellido: 'Uno',
    password: 'Password.1234',
    rol: RolUsuario.SUPERVISOR,
    grupoTurno: GrupoTurno.A,
    horario: '23:00-05:00'
  },
  {
    legajo: 300004,
    email: 'maria.lopez@workshift.com',
    nombre: 'Maria',
    apellido: 'Lopez',
    password: 'familia100%!',
    rol: RolUsuario.SUPERVISOR,
    grupoTurno: GrupoTurno.B,
    horario: '05:00-14:00'
  },
  {
    legajo: 300005,
    email: 'emanuel@workshift.com',
    nombre: 'Emanuel',
    apellido: 'Rodriguez',
    password: 'elcrackDelTrabajo!!',
    rol: RolUsuario.INSPECTOR,
    grupoTurno: GrupoTurno.A,
    horario: '19:00-05:00'
  },
  {
    legajo: 300006,
    email: 'juan.garcia@workshift.com',
    nombre: 'Juan',
    apellido: 'Garcia',
    password: 'Gorreadisimo!!!',
    rol: RolUsuario.INSPECTOR,
    grupoTurno: GrupoTurno.B,
    horario: '14:00-23:00'
  }
];

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      legajo INTEGER UNIQUE NOT NULL,
      email TEXT NOT NULL UNIQUE,
      nombre VARCHAR(255) NOT NULL,
      apellido VARCHAR(255) NOT NULL,
      password TEXT NOT NULL,
      rol VARCHAR(50) NOT NULL DEFAULT '${RolUsuario.INSPECTOR}' CHECK (rol IN (${getEnumSqlString(RolUsuario)})),
      telefono VARCHAR(50),
      direccion TEXT,
      horario VARCHAR(50),
      fecha_nacimiento DATE,
      activo BOOLEAN DEFAULT true,
      grupo_turno VARCHAR(10) NOT NULL DEFAULT '${GrupoTurno.A}' CHECK (grupo_turno IN (${getEnumSqlString(GrupoTurno)})),
      foto_perfil TEXT,
      ultimo_login TIMESTAMP,
      calificacion DECIMAL(3,2) DEFAULT 4.5,
      total_intercambios INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql.unsafe(createTableQuery);

  await sql`CREATE INDEX IF NOT EXISTS idx_users_legajo ON users(legajo)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_activo ON users(activo)`;

  // Insertar usuarios del sistema primero
  console.log('👥 Insertando usuarios del sistema...');
  const insertedSystemUsers = await Promise.all(
    systemUsers.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      try {
        return await sql`
          INSERT INTO users (
            legajo,
            email, 
            nombre, 
            apellido,
            password, 
            rol,
            grupo_turno,
            horario,
            activo,
            calificacion,
            total_intercambios
          )
          VALUES (
            ${user.legajo},
            ${user.email}, 
            ${user.nombre}, 
            ${user.apellido},
            ${hashedPassword}, 
            ${user.rol},
            ${user.grupoTurno},
            ${user.horario},
            ${true},
            ${5.0},
            ${0}
          )
          ON CONFLICT (email) DO UPDATE SET
            password = EXCLUDED.password,
            updated_at = NOW();
        `;
      } catch (error) {
        console.log(`⚠️  Usuario ${user.email} ya existe o error: ${error}`);
        return null;
      }
    }),
  );

  console.log(`✅ ${systemUsers.length} usuarios del sistema procesados`);

  // Insertar usuarios de placeholder-data
  console.log('👥 Insertando usuarios de placeholder...');
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.legajo?.toString() || 'password123', 10);
      try {
        return await sql`
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
            ${user.grupoTurno || GrupoTurno.A},
            ${4.5},
            ${0}
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
        `;
      } catch (error) {
        console.log(`⚠️  Usuario ${user.email} ya existe o error`);
        return null;
      }
    }),
  );

  console.log(`✅ ${users.length} usuarios de placeholder procesados`);

  return [...insertedSystemUsers, ...insertedUsers].filter(Boolean);
}

async function seedTurnos() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS turnos (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      tipo VARCHAR(50) NOT NULL CHECK (tipo IN (${getEnumSqlString(TipoTurno)})),
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql.unsafe(createTableQuery);

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

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS cambios (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      fecha DATE NOT NULL,
      turno VARCHAR(255) NOT NULL,
      solicitante VARCHAR(255) NOT NULL,
      destinatario VARCHAR(255) NOT NULL,
      estado VARCHAR(50) NOT NULL CHECK (estado IN (${getEnumSqlString(EstadoCambio)})),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql.unsafe(createTableQuery);

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
  
  // Obtener un usuario real de la base de datos
  const existingUsers = await sql`
    SELECT id FROM users LIMIT 1
  `;

  if (existingUsers.length === 0) {
    console.log('⚠️  No hay usuarios en la base de datos, saltando turnos_data');
    return true;
  }

  const userId = existingUsers[0].id;

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
      ${userId}, 
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

  console.log('✅ Datos de turnos creados para usuario:', userId);
  return true;
}

async function seedOfertas() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  
  // Eliminar tabla existente
  await sql`DROP TABLE IF EXISTS ofertas CASCADE`;

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ofertas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ofertante_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tomador_id UUID REFERENCES users(id) ON DELETE SET NULL,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN (${getEnumSqlString(TipoOferta)})),
      modalidad_busqueda VARCHAR(20) CHECK (modalidad_busqueda IN (${getEnumSqlString(TipoSolicitud)})),
      turno_ofrece JSONB,
      turnos_busca JSONB,
      fechas_disponibles JSONB,
      fecha_ofrece DATE,
      horario_ofrece VARCHAR(20),
      grupo_ofrece VARCHAR(1) CHECK (grupo_ofrece IN (${getEnumSqlString(GrupoTurno)})),
      fecha_busca DATE,
      horario_busca VARCHAR(20),
      grupo_busca VARCHAR(1) CHECK (grupo_busca IN (${getEnumSqlString(GrupoTurno)})),
      fecha_desde DATE,
      fecha_hasta DATE,
      descripcion TEXT NOT NULL,
      prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN (${getEnumSqlString(Prioridad)})),
      estado VARCHAR(20) NOT NULL DEFAULT '${EstadoOferta.DISPONIBLE}' CHECK (estado IN (${getEnumSqlString(EstadoOferta)})),
      valido_hasta TIMESTAMP NOT NULL,
      publicado TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql.unsafe(createTableQuery);

  // Crear índices para ofertas
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_ofertante ON ofertas(ofertante_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_tomador ON ofertas(tomador_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON ofertas(estado)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_publicado ON ofertas(publicado DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_tipo ON ofertas(tipo)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_prioridad ON ofertas(prioridad)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofertas_valido_hasta ON ofertas(valido_hasta)`;

  console.log('✅ Tabla ofertas creada');
  return true;
}

async function seedSolicitudesDirectas() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS solicitudes_directas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      solicitante_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      destinatario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      turno_solicitante JSONB NOT NULL,
      turno_destinatario JSONB NOT NULL,
      fecha_solicitante DATE NOT NULL,
      horario_solicitante VARCHAR(20) NOT NULL,
      grupo_solicitante VARCHAR(1) NOT NULL CHECK (grupo_solicitante IN (${getEnumSqlString(GrupoTurno)})),
      fecha_destinatario DATE NOT NULL,
      horario_destinatario VARCHAR(20) NOT NULL,
      grupo_destinatario VARCHAR(1) NOT NULL CHECK (grupo_destinatario IN (${getEnumSqlString(GrupoTurno)})),
      motivo TEXT NOT NULL,
      prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN (${getEnumSqlString(Prioridad)})),
      estado VARCHAR(20) NOT NULL DEFAULT '${EstadoSolicitud.SOLICITADO}' CHECK (estado IN (${getEnumSqlString(EstadoSolicitud)})),
      fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql.unsafe(createTableQuery);

  // Crear índices para solicitudes
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_solicitante ON solicitudes_directas(solicitante_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_destinatario ON solicitudes_directas(destinatario_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_directas(estado)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes_directas(fecha_solicitud DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_solicitudes_prioridad ON solicitudes_directas(prioridad)`;

  console.log('✅ Tabla solicitudes_directas creada');
  return true;
}

async function seedDocsHelp() {
  // Crear extensión vector (si existe en tu PostgreSQL)
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  // Crear tabla
  const createDocsTable = `
    CREATE TABLE IF NOT EXISTS docs_help (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT,
      content TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      embedding vector(1536),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql.unsafe(createDocsTable);

  // Crear índice para búsquedas vectoriales
  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_docs_help_embedding 
    ON docs_help 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 64);
  `;

  await sql.unsafe(createIndexQuery);

  console.log("Tabla docs_help creada correctamente.");
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

      await seedOfertas();
      await seedSolicitudesDirectas();

      await seedDocsHelp();

      await createRelations();
    });

    return Response.json({
      message: 'Database seeded successfully',
      systemUsers: systemUsers.map(u => ({ legajo: u.legajo, email: u.email, rol: u.rol })),
      tables: ['users', 'faltas', 'turnos', 'cambios', 'stats', 'turnos_data', 'ofertas', 'solicitudes_directas'],
      enums: {
        EstadoSolicitud: Object.values(EstadoSolicitud),
        EstadoOferta: Object.values(EstadoOferta),
        RolUsuario: Object.values(RolUsuario),
        GrupoTurno: Object.values(GrupoTurno),
        TipoTurno: Object.values(TipoTurno),
        TipoOferta: Object.values(TipoOferta),
        Prioridad: Object.values(Prioridad),
        EstadoCambio: Object.values(EstadoCambio)
      },
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
            'id', 'ofertante_id', 'tomador_id', 'tipo', 
            'modalidad_busqueda', 'turno_ofrece', 'turnos_busca', 'fechas_disponibles',
            'fecha_ofrece', 'horario_ofrece', 'grupo_ofrece', 
            'fecha_busca', 'horario_busca', 'grupo_busca',
            'fecha_desde', 'fecha_hasta', 'descripcion', 'prioridad', 'estado',
            'valido_hasta', 'publicado', 'created_at', 'updated_at'
          ],
          jsonb_fields: {
            turno_ofrece: '{ fecha, horario, grupo }',
            turnos_busca: '[{ fecha, horario, grupo }]',
            fechas_disponibles: '[{ fecha, disponible }]'
          }
        },
        solicitudes_directas: {
          campos: [
            'id', 'solicitante_id', 'destinatario_id', 
            'turno_solicitante', 'turno_destinatario',
            'fecha_solicitante', 'horario_solicitante', 'grupo_solicitante', 
            'fecha_destinatario', 'horario_destinatario', 'grupo_destinatario', 
            'motivo', 'prioridad', 'estado', 'fecha_solicitud', 
            'created_at', 'updated_at'
          ],
          jsonb_fields: {
            turno_solicitante: '{ fecha, horario, grupo }',
            turno_destinatario: '{ fecha, horario, grupo }'
          }
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