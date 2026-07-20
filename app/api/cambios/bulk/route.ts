import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'Workshift25');

function normalizar(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const rol = payload.rol as string;
    if (rol !== 'ADMINISTRADOR' && rol !== 'JEFE') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    const adminId = payload.id as string;

    const { cambios } = await request.json();
    if (!Array.isArray(cambios) || cambios.length === 0) {
      return NextResponse.json({ error: 'No hay cambios para importar' }, { status: 400 });
    }

    // Cargar todos los usuarios activos para hacer matching en memoria
    const usuarios = await sql`
      SELECT id::text, nombre, apellido, horario, grupo_turno as "grupoTurno"
      FROM users WHERE activo = true
    `;

    const mapaUsuarios = new Map<string, any>();
    for (const u of usuarios) {
      mapaUsuarios.set(normalizar(`${u.apellido} ${u.nombre}`), u);
      mapaUsuarios.set(normalizar(`${u.nombre} ${u.apellido}`), u);
    }

    const hoy = new Date().toISOString().split('T')[0];
    const creados: any[] = [];
    const errores: { fila: string; error: string }[] = [];

    for (const c of cambios) {
      const tipo = c.tipo?.toString().toUpperCase().trim();
      const filaId = `${tipo} ${c.solicitante} ↔ ${c.destinatario} (${c.fecha})`;

      if (!c.fecha || !tipo || !c.solicitante || !c.destinatario) {
        errores.push({ fila: filaId, error: 'Faltan campos requeridos (fecha, tipo, solicitante, destinatario)' });
        continue;
      }
      if (tipo !== 'INTERCAMBIO' && tipo !== 'COBERTURA') {
        errores.push({ fila: filaId, error: 'Tipo inválido — debe ser INTERCAMBIO o COBERTURA' });
        continue;
      }

      const solicitante = mapaUsuarios.get(normalizar(c.solicitante));
      const destinatario = mapaUsuarios.get(normalizar(c.destinatario));

      if (!solicitante) {
        errores.push({ fila: filaId, error: `No se encontró "${c.solicitante}" en el sistema` });
        continue;
      }
      if (!destinatario) {
        errores.push({ fila: filaId, error: `No se encontró "${c.destinatario}" en el sistema` });
        continue;
      }
      if (solicitante.id === destinatario.id) {
        errores.push({ fila: filaId, error: 'Solicitante y destinatario son la misma persona' });
        continue;
      }

      const horarioSolicitante = c.horario?.trim() || solicitante.horario;
      const horarioDestinatario = c.horario?.trim() || destinatario.horario;
      // Datos históricos entran como REALIZADO para que el cron no los reprocese
      const estadoTurno = c.fecha < hoy ? 'REALIZADO' : 'PENDIENTE';

      // Verificar conflicto UNIQUE(empleado_id, fecha) en turnos_efectivos
      const idsAVerificar = tipo === 'INTERCAMBIO'
        ? [solicitante.id, destinatario.id]
        : [destinatario.id];

      let hayConflicto = false;
      for (const empId of idsAVerificar) {
        const [conflicto] = await sql`
          SELECT id FROM turnos_efectivos
          WHERE empleado_id = ${empId}::uuid AND fecha = ${c.fecha}::date
        `;
        if (conflicto) {
          const nombreConflicto = empId === solicitante.id
            ? `${solicitante.apellido} ${solicitante.nombre}`
            : `${destinatario.apellido} ${destinatario.nombre}`;
          errores.push({ fila: filaId, error: `${nombreConflicto} ya tiene un cambio registrado para ${c.fecha}` });
          hayConflicto = true;
          break;
        }
      }
      if (hayConflicto) continue;

      try {
        if (tipo === 'INTERCAMBIO') {
          await sql`
            WITH nueva_solicitud AS (
              INSERT INTO solicitudes_directas (
                solicitante_id, destinatario_id, oferta_id,
                turno_solicitante, turno_destinatario,
                fecha_solicitante, horario_solicitante, grupo_solicitante,
                fecha_destinatario, horario_destinatario, grupo_destinatario,
                motivo, prioridad, estado, origen, fecha_solicitud
              ) VALUES (
                ${solicitante.id}::uuid, ${destinatario.id}::uuid, NULL,
                ${JSON.stringify({ fecha: c.fecha, horario: horarioSolicitante, grupoTurno: solicitante.grupoTurno })},
                ${JSON.stringify({ fecha: c.fecha, horario: horarioDestinatario, grupoTurno: destinatario.grupoTurno })},
                ${c.fecha}::date, ${horarioSolicitante}, ${solicitante.grupoTurno},
                ${c.fecha}::date, ${horarioDestinatario}, ${destinatario.grupoTurno},
                'Intercambio de guardia', 'NORMAL', 'COMPLETADO', 'DIRECTA', NOW()
              ) RETURNING id
            ),
            nueva_autorizacion AS (
              INSERT INTO autorizaciones (
                tipo, empleado_id, solicitud_id, estado,
                aprobado_por, fecha_aprobacion, observaciones
              )
              SELECT
                'CAMBIO_TURNO', ${solicitante.id}::uuid, nueva_solicitud.id, 'APROBADA',
                ${adminId}::uuid, NOW(), 'Cambio aprobado por administrador, migrado al sistema'
              FROM nueva_solicitud
              RETURNING id
            )
            INSERT INTO turnos_efectivos (
              empleado_id, empleado_intercambio_id, autorizacion_id, fecha,
              horario_original, horario_efectivo, grupo_original, grupo_efectivo,
              tipo_cambio, estado
            )
            SELECT * FROM (
              SELECT
                ${destinatario.id}::uuid, ${solicitante.id}::uuid, nueva_autorizacion.id, ${c.fecha}::date,
                ${horarioDestinatario}, ${horarioSolicitante}, ${destinatario.grupoTurno}, ${solicitante.grupoTurno},
                'INTERCAMBIO', ${estadoTurno}
              FROM nueva_autorizacion
              UNION ALL
              SELECT
                ${solicitante.id}::uuid, ${destinatario.id}::uuid, nueva_autorizacion.id, ${c.fecha}::date,
                ${horarioSolicitante}, ${horarioDestinatario}, ${solicitante.grupoTurno}, ${destinatario.grupoTurno},
                'INTERCAMBIO', ${estadoTurno}
              FROM nueva_autorizacion
            ) AS filas
          `;
        } else {
          await sql`
            WITH nueva_solicitud AS (
              INSERT INTO solicitudes_directas (
                solicitante_id, destinatario_id, oferta_id,
                turno_solicitante, turno_destinatario,
                fecha_solicitante, horario_solicitante, grupo_solicitante,
                fecha_destinatario, horario_destinatario, grupo_destinatario,
                motivo, prioridad, estado, origen, fecha_solicitud
              ) VALUES (
                ${solicitante.id}::uuid, ${destinatario.id}::uuid, NULL,
                ${JSON.stringify({ fecha: c.fecha, horario: horarioSolicitante, grupoTurno: solicitante.grupoTurno })},
                NULL,
                ${c.fecha}::date, ${horarioSolicitante}, ${solicitante.grupoTurno},
                NULL, ${horarioSolicitante}, ${destinatario.grupoTurno},
                'Necesito cobertura de guardia', 'NORMAL', 'COMPLETADO', 'DIRECTA', NOW()
              ) RETURNING id
            ),
            nueva_autorizacion AS (
              INSERT INTO autorizaciones (
                tipo, empleado_id, solicitud_id, estado,
                aprobado_por, fecha_aprobacion, observaciones
              )
              SELECT
                'CAMBIO_TURNO', ${solicitante.id}::uuid, nueva_solicitud.id, 'APROBADA',
                ${adminId}::uuid, NOW(), 'Cambio aprobado por administrador, migrado al sistema'
              FROM nueva_solicitud
              RETURNING id
            )
            INSERT INTO turnos_efectivos (
              empleado_id, empleado_intercambio_id, autorizacion_id, fecha,
              horario_original, horario_efectivo, grupo_original, grupo_efectivo,
              tipo_cambio, estado
            )
            SELECT
              ${destinatario.id}::uuid, ${solicitante.id}::uuid, nueva_autorizacion.id, ${c.fecha}::date,
              ${horarioDestinatario}, ${horarioSolicitante}, ${destinatario.grupoTurno}, ${solicitante.grupoTurno},
              'COBERTURA', ${estadoTurno}
            FROM nueva_autorizacion
          `;
        }
        creados.push({ tipo, fecha: c.fecha, solicitante: c.solicitante, destinatario: c.destinatario });
      } catch (err: any) {
        errores.push({ fila: filaId, error: `Error al insertar: ${err.message}` });
      }
    }

    return NextResponse.json({ creados: creados.length, errores });
  } catch (error) {
    console.error('Error en bulk cambios:', error);
    return NextResponse.json({ error: 'Error al importar cambios' }, { status: 500 });
  }
}
