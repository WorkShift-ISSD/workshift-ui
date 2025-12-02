// app/api/seed/route.ts
import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { cambios, users, turnos, stats, turnosData } from '../../lib/placeholder-data';

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
    horario: '00:00-23:59',
    primerIngreso: false  // ✅ NUEVO - Admin no requiere cambio
  },
  {
    legajo: 300002,
    email: 'jefe3@workshift.com',
    nombre: 'Jefe',
    apellido: 'Principal',
    password: 'Password.666!',
    rol: RolUsuario.JEFE,
    grupoTurno: GrupoTurno.A,
    horario: '05:00-17:00',
    primerIngreso: true  // ✅ NUEVO - Jefe debe cambiar en primer ingreso
  },
  {
    legajo: 300003,
    email: 'supervisor3@workshift.com',
    nombre: 'Supervisor',
    apellido: 'Uno',
    password: 'Password.1234',
    rol: RolUsuario.SUPERVISOR,
    grupoTurno: GrupoTurno.A,
    horario: '23:00-05:00',
    primerIngreso: true  // ✅ NUEVO - Supervisor debe cambiar en primer ingreso
  },
  {
    legajo: 300004,
    email: 'maria.lopez@workshift.com',
    nombre: 'Maria',
    apellido: 'Lopez',
    password: 'familia100%!',
    rol: RolUsuario.SUPERVISOR,
    grupoTurno: GrupoTurno.B,
    horario: '05:00-14:00',
    primerIngreso: true  // ✅ NUEVO - Supervisor debe cambiar en primer ingreso
  },
  {
    legajo: 300005,
    email: 'emanuel@workshift.com',
    nombre: 'Emanuel',
    apellido: 'Rodriguez',
    password: 'elcrackDelTrabajo!!',
    rol: RolUsuario.INSPECTOR,
    grupoTurno: GrupoTurno.A,
    horario: '19:00-05:00',
    primerIngreso: true  // ✅ NUEVO - Inspector debe cambiar en primer ingreso
  },
  {
    legajo: 300006,
    email: 'juan.garcia@workshift.com',
    nombre: 'Juan',
    apellido: 'Garcia',
    password: 'Gorreadisimo!!!',
    rol: RolUsuario.INSPECTOR,
    grupoTurno: GrupoTurno.B,
    horario: '14:00-23:00',
    primerIngreso: true  // ✅ NUEVO - Inspector debe cambiar en primer ingreso
  }
];

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

 // LÍNEA 89-111 (DESPUÉS) - ✅ CON CAMPOS NUEVOS
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
    primer_ingreso BOOLEAN DEFAULT true,            -- ✅ NUEVO
    ultimo_cambio_password TIMESTAMP,               -- ✅ NUEVO
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

  await sql.unsafe(createTableQuery);

  await sql`CREATE INDEX IF NOT EXISTS idx_users_legajo ON users(legajo)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_activo ON users(activo)`;
  // DESPUÉS DE LA LÍNEA 118
  await sql`CREATE INDEX IF NOT EXISTS idx_users_primer_ingreso ON users(primer_ingreso)`;

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
            total_intercambios,
            primer_ingreso,                    -- ✅ NUEVO
            ultimo_cambio_password             -- ✅ NUEVO
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
            ${0},
            ${user.primerIngreso},            -- ✅ NUEVO
            ${user.primerIngreso ? null : sql`NOW()`}      -- ✅ NUEVO
          )
          ON CONFLICT (email) DO UPDATE SET
            password = EXCLUDED.password,
            primer_ingreso = EXCLUDED.primer_ingreso,
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
            total_intercambios,
            primer_ingreso,                    -- ✅ NUEVO
            ultimo_cambio_password
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
            ${0},
            ${true},                           -- ✅ NUEVO (todos requieren cambio)
            ${null}
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



// ✅ NUEVA FUNCIÓN: CREAR TABLA DE PASSWORD RESET TOKENS
async function seedPasswordResetTokens() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql.unsafe(createTableQuery);

  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used)`;

  console.log('✅ Tabla password_reset_tokens creada');
  return true;
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
  // Crear extensión vector (opcional, por si después quieres usar embeddings)
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ Extensión vector verificada');
  } catch (error) {
    console.log('⚠️ Extensión vector no disponible (no es necesaria sin OpenAI)');
  }

  // Crear tabla SIN la columna de embedding
  const createDocsTable = `
    CREATE TABLE IF NOT EXISTS docs_help (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql.unsafe(createDocsTable);
  console.log("✅ Tabla docs_help creada");

  // Crear índices para búsqueda de texto
  await sql`CREATE INDEX IF NOT EXISTS idx_docs_help_title ON docs_help USING gin(to_tsvector('spanish', title))`;
  await sql`CREATE INDEX IF NOT EXISTS idx_docs_help_content ON docs_help USING gin(to_tsvector('spanish', content))`;
  
  console.log("✅ Índices de búsqueda creados");

  // ✅ DOCUMENTACIÓN DEL MANUAL (sin embeddings)
  const docsData = [
    {
      title: 'Introducción a WorkShift',
      content: `WorkShift es un sistema de gestión de turnos laborales que permite a los empleados (Inspectores y Supervisores) realizar cambios de turnos entre sí de manera organizada y con la supervisión del Jefe.

Propósito del Sistema:
- Facilitar el intercambio de turnos entre empleados del mismo rol
- Gestionar licencias y sanciones
- Registrar faltas y asistencias
- Llevar un control de días trabajados
- Mantener un historial completo de cambios

Requisitos Técnicos:
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Conexión a internet
- Accesible desde computadora y dispositivos móviles`
    },
    {
      title: 'Roles y Permisos - Inspector',
      content: `INSPECTOR

Permisos:
- Solicitar cambios de turno con otros Inspectores
- Publicar ofertas de turno
- Tomar ofertas de turno disponibles
- Solicitar licencias ordinarias (requieren autorización)
- Cargar licencias especiales (no requieren autorización)
- Ver su historial de cambios, faltas y licencias
- Calificar a otros Inspectores después de un intercambio

Restricciones:
- No puede cambiar turnos con Supervisores o Jefes
- No puede cambiar turnos si tiene licencia o sanción activa
- No puede aprobar solicitudes de otros`
    },
    {
      title: 'Roles y Permisos - Supervisor',
      content: `SUPERVISOR

Permisos:
- Solicitar cambios de turno con otros Supervisores
- Publicar ofertas de turno
- Tomar ofertas de turno disponibles
- Solicitar licencias ordinarias (requieren autorización)
- Cargar licencias especiales (no requieren autorización)
- Ver su historial de cambios, faltas y licencias
- Calificar a otros Supervisores después de un intercambio
- Gestionar datos de todos los empleados
- Gestionar faltas de empleados
- Cargar Sanciones de los empleados

Restricciones:
- No puede cambiar turnos con Inspectores o Jefes
- No puede cambiar turnos si tiene licencia o sanción activa
- No puede aprobar solicitudes de otros`
    },
    {
      title: 'Roles y Permisos - Jefe y Administrador',
      content: `JEFE

Permisos:
- Aprobar o rechazar cambios de turno
- Aprobar o rechazar licencias ordinarias
- Ver todos los empleados del sistema
- Ver historial completo de cambios, faltas y licencias
- Ver datos de todos los empleados
- Ver informes y reportes completos

Restricciones:
- No participa en cambios de turno
- No puede solicitar cambios ni publicar ofertas

ADMINISTRADOR

Permisos:
- Acceso completo al sistema
- Gestión de usuarios
- Configuración del sistema
- Acceso a todos los módulos`
    },
    {
      title: 'Sistema de Turnos y Horarios',
      content: `GRUPOS DE TURNO

El sistema maneja dos grupos de turno que se alternan:
- GRUPO A: Trabaja en días específicos según calendario rotativo
- GRUPO B: Trabaja en días complementarios al Grupo A

Importante: Cada empleado pertenece a UN grupo (A o B) y puede cambiar turnos dentro o fuera de su grupo. Los cambios de turno son por un día particular, no permanentes.

HORARIOS DE TRABAJO

Inspectores pueden tener:
- 04:00-14:00
- 06:00-16:00
- 10:00-20:00
- 13:00-23:00
- 19:00-05:00

Supervisores pueden tener:
- 05:00-14:00
- 14:00-23:00
- 23:00-05:00

Jefes y Administradores:
- 05:00-17:00
- 17:00-05:00`
    },
    {
      title: 'Cómo Solicitar un Cambio de Turno - Solicitud Directa',
      content: `SOLICITUD DIRECTA

Se utiliza cuando sabes concretamente con quién quieres cambiar.

Paso a paso:
1. Ir a "Ofertas de Turnos"
2. Clic en "Solicitud Directa"
3. Seleccionar el compañero (solo aparecen del mismo rol)
4. Elegir tu turno que ofreces
5. Elegir el turno que quieres recibir
6. Explicar el motivo
7. Marcar prioridad (Normal o Urgente)
8. Enviar solicitud

¿Qué pasa después?
- Tu compañero recibe la solicitud
- Si acepta → Se crea una autorización pendiente para el Jefe
- Si rechaza → Se cancela el cambio
- El Jefe aprueba → El cambio se ejecuta
- El Jefe rechaza → Se cancela el cambio`
    },
    {
      title: 'Ofertas de Turno - Ofrecer y Buscar Guardias',
      content: `OFERTAS DE TURNO

Cuando no conoces a alguien específico para cambiar:

A) OFRECER TU TURNO (Modalidad "Ofrezco"):
1. Ir a "Ofertas de Turnos"
2. Clic en "Nueva Oferta"
3. Seleccionar "Ofrezco Guardia"
4. Elegir modalidad:
   - Intercambio: Especificas qué turno buscas a cambio
   - Abierto: Ofreces tu turno sin pedir nada específico
5. Completar fechas y horarios
6. Agregar descripción
7. Publicar

B) BUSCAR UN TURNO (Modalidad "Busco"):
1. Ir a "Ofertas de Turnos"
2. Clic en "Nueva Oferta"
3. Seleccionar "Busco Guardia"
4. Especificar qué turnos buscas
5. Indicar qué turno ofreces a cambio
6. Agregar descripción
7. Publicar

C) TOMAR UNA OFERTA DISPONIBLE:
1. Ir a "Ofertas de Turnos" → pestaña "Disponibles"
2. Filtrar por fechas, horarios
3. Ver ofertas de otros compañeros
4. Clic en "Tomar Oferta"
5. Confirmar
6. Esperar aprobación del Jefe`
    },
    {
      title: 'Estados y Prioridades de Solicitudes',
      content: `ESTADOS DE LAS SOLICITUDES

- SOLICITADO: Enviada, esperando respuesta del compañero
- APROBADO: Compañero aceptó, pendiente de autorización del Jefe
- COMPLETADO: Jefe aprobó, cambio efectuado
- CANCELADO: Rechazado por compañero o Jefe

PRIORIDADES

- NORMAL: Solicitud regular, sin urgencia
- URGENTE: Solicitud prioritaria (aparece destacada con ícono de llama 🔥)

EDITAR O CANCELAR SOLICITUDES

Editar:
- Solo si está en estado "SOLICITADO"
- Clic en el botón "Editar" (ícono de lápiz)
- Modificar datos necesarios
- Guardar cambios

Cancelar:
- Solo si está en estado "SOLICITADO"
- Clic en "Cancelar"
- Confirmar acción`
    },
    {
      title: 'Gestión de Empleados',
      content: `GESTIÓN DE EMPLEADOS (Solo Supervisores y Jefes)

CREAR NUEVO EMPLEADO:

1. Ir a "Gestión de Empleados"
2. Clic en "Nuevo Empleado"
3. Completar datos obligatorios:
   - Nombre, Apellido, Legajo (único)
   - Email (será el usuario)
   - Rol (Inspector/Supervisor/Jefe)
   - Grupo de Turno (A/B)
   - Horario de trabajo
4. Completar datos opcionales:
   - Teléfono, Dirección, Fecha de nacimiento
5. Marcar si la cuenta está activa
6. Guardar

Importante:
- El sistema genera una contraseña temporal automáticamente
- El empleado DEBE cambiarla en su primer ingreso
- Se envía email con las credenciales de acceso

EDITAR EMPLEADO:
1. Buscar empleado en la lista
2. Clic en ícono de lápiz (Editar)
3. Modificar datos necesarios
4. Guardar cambios

DESACTIVAR EMPLEADO:
1. Editar empleado
2. Desmarcar casilla "Cuenta activa"
3. Guardar

Efecto:
- El empleado no puede iniciar sesión
- No aparece en listados de intercambios
- Sus datos se mantienen en el sistema`
    },
    {
      title: 'Informes y Reportes',
      content: `TIPOS DE INFORMES DISPONIBLES

1. INFORME DE ASISTENCIA
Muestra el porcentaje de asistencia por empleado.
Datos: días trabajados, faltas totales, faltas justificadas/injustificadas, porcentaje de asistencia

2. INFORME DE AUSENTISMO
Analiza los promedios de faltas por grupos.
Datos: ausentismo por rol, por turno, promedio de faltas, nivel de criticidad

3. INFORME COMPARATIVO
Compara Grupo A vs Grupo B.
Datos: cantidad de empleados, faltas totales, faltas justificadas, distribución de roles

4. INFORME INDIVIDUAL
Detalle completo de un empleado específico.
Datos: información personal, total de faltas, detalle de cada falta, días trabajados vs programados

EXPORTAR INFORMES

Formatos disponibles: PDF y Excel

Pasos:
1. Generar el informe deseado
2. Clic en botón "Exportar"
3. Seleccionar formato
4. Se descarga automáticamente`
    },
    {
      title: 'Preguntas Frecuentes - Cambios de Turno',
      content: `PREGUNTAS FRECUENTES SOBRE CAMBIOS

P: ¿Puedo cambiar turno con alguien de otro rol?
R: No. Los Inspectores solo pueden cambiar con Inspectores, y los Supervisores solo con Supervisores.

P: ¿Puedo cambiar de Grupo A a Grupo B?
R: Sí. Puedes cambiar turnos entre grupos, siempre que ambos acuerden.

P: ¿Cuántos cambios puedo hacer por mes?
R: No hay límite, pero todos requieren aprobación del Jefe.

P: ¿Qué pasa si mi compañero no cumple con el cambio?
R: Puedes calificarlo negativamente y reportar al Jefe. Se le contará la falta a él y no a ti.

P: ¿Cómo sé si alguien es confiable para cambiar?
R: Revisa su calificación de intercambios anteriores.`
    },
    {
      title: 'Preguntas Frecuentes - Sistema y Acceso',
      content: `PREGUNTAS FRECUENTES SOBRE EL SISTEMA

P: ¿Funciona en celular?
R: Sí, el sistema es completamente responsive.

P: ¿Qué hago si olvido mi contraseña?
R: Usa la opción "Olvidé mi contraseña" en la pantalla de login.

P: ¿Puedo usar el sistema fuera de la empresa?
R: Sí, solo necesitas internet y tus credenciales.

P: ¿Quién registra las faltas?
R: Los Supervisores tienen este permiso.

P: ¿Puedo justificar una falta después?
R: Sí, contacta a tu supervisor o jefe con la documentación.

P: ¿Las faltas justificadas afectan mi récord?
R: Figuran en tu historial pero no como incumplimiento grave.`
    },
    {
      title: 'Solución de Problemas Comunes',
      content: `SOLUCIÓN DE PROBLEMAS

NO PUEDO INICIAR SESIÓN
Causas: contraseña incorrecta, email mal escrito, cuenta desactivada, primera vez sin cambiar contraseña
Soluciones: verificar email, usar "Olvidé mi contraseña", contactar supervisor

NO APARECEN EMPLEADOS AL BUSCAR
Causas: filtros incorrectos, no hay empleados del mismo rol, empleados en licencia/sanción
Soluciones: revisar filtros, limpiar búsqueda, verificar que busques tu mismo rol

NO PUEDO PUBLICAR OFERTA
Causas: licencia activa, sanción activa, fecha pasada, datos incompletos
Soluciones: verificar estado, revisar fechas futuras, completar campos obligatorios

LA SOLICITUD NO SE ENVÍA
Causas: problemas de conexión, intentando cambiar mismo turno, destinatario con licencia/sanción
Soluciones: verificar conexión, revisar turnos diferentes, verificar disponibilidad`
    },
    {
      title: 'Mejores Prácticas y Recomendaciones',
      content: `MEJORES PRÁCTICAS

PARA CAMBIOS DE TURNO:
✅ HACER:
- Solicitar con anticipación
- Explicar claramente el motivo
- Cumplir con los cambios acordados
- Calificar honestamente
- Mantener comunicación

❌ NO HACER:
- Cancelar de último momento
- Solicitar cambios si tienes licencia
- Hacer acuerdos fuera del sistema
- Ignorar solicitudes

PARA LICENCIAS:
✅ Solicitar con anticipación, adjuntar documentación, especificar fechas exactas
❌ Solicitar licencias superpuestas, omitir información importante

PARA JEFES:
✅ Revisar autorizaciones diariamente, ser consistente, comunicar motivos de rechazo, mantener equidad
❌ Demorar aprobaciones, favorecer empleados, rechazar sin explicación`
    }
  ];

  // Limpiar datos existentes
  await sql`DELETE FROM docs_help`;
  console.log('🧹 Tabla limpiada');

  // Insertar documentos SIN embeddings
  let inserted = 0;
  let failed = 0;

  for (const doc of docsData) {
    try {
      await sql`
        INSERT INTO docs_help (title, content)
        VALUES (
          ${doc.title},
          ${doc.content}
        )
      `;
      
      inserted++;
      console.log(`✅ ${doc.title}`);
    } catch (error) {
      failed++;
      console.error(`❌ Error con ${doc.title}:`, error);
    }
  }

  console.log(`\n📊 Resultado: ${inserted}/${docsData.length} documentos insertados, ${failed} fallidos`);
  
  return true;
}

async function createRelations() {
  console.log('✅ Tablas creadas con índices y relaciones');
  return true;
}

async function dropAllTables() {
  console.log('🗑️  Eliminando tablas existentes...');

  await sql`DROP TABLE IF EXISTS password_reset_tokens CASCADE`;  // ✅ NUEVO
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

      await seedPasswordResetTokens();  // ✅ NUEVO
      console.log('✅ Tabla password_reset_tokens creada');

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