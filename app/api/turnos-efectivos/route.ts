// app/api/turnos-efectivos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/postgres';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.id as string;

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const targetUserId = searchParams.get('userId') || userId;

    // Si se pasa ?fecha= sin userId, devolver todos los turnos efectivos del día para todos los empleados
    if (fecha && !searchParams.get('userId')) {
      const ganados = await sql`
        SELECT
          te.empleado_id::text as "empleadoId",
          te.empleado_intercambio_id::text as "intercambioId",
          TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
          te.horario_efectivo as "horarioEfectivo",
          te.grupo_efectivo as "grupoEfectivo",
          te.tipo_cambio as "tipoCambio",
          'GANADO' as tipo,
          u.nombre, u.apellido, u.horario, u.grupo_turno as "grupoTurno",
          uc.apellido || ', ' || uc.nombre as "companero"
        FROM turnos_efectivos te
        JOIN users u ON te.empleado_id = u.id
        LEFT JOIN users uc ON te.empleado_intercambio_id = uc.id
        WHERE te.fecha = ${fecha}::date AND te.estado IN ('PENDIENTE', 'REALIZADO')
      `;

      // Mapa para rastrear la cadena: empleadoId -> { intercambioId, companero }
      const mapaGanados = new Map(
        ganados.map((t: any) => [t.empleadoId, { intercambioId: t.intercambioId, companero: t.companero }])
      );

      // Para cada GANADO, seguir la cadena hasta el titular original
      const ganadosConCadena = ganados.map((t: any) => {
        const cadena: string[] = [];
        const visitados = new Set([t.empleadoId]);
        let currentId: string | null = t.intercambioId;

        while (currentId && !visitados.has(currentId)) {
          const siguiente = mapaGanados.get(currentId) as any;
          if (!siguiente) break;
          visitados.add(currentId);
          if (visitados.has(siguiente.intercambioId)) break; // cierra el círculo: no es una cadena real
          cadena.push(siguiente.companero);
          currentId = siguiente.intercambioId;
        }

        return { ...t, cadena };
      });

      const cedidos = await sql`
        SELECT
          te.empleado_intercambio_id::text as "empleadoId",
          TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
          te.horario_original as "horarioEfectivo",
          te.grupo_original as "grupoEfectivo",
          te.tipo_cambio as "tipoCambio",
          'CEDIDO' as tipo,
          u.nombre, u.apellido, u.horario, u.grupo_turno as "grupoTurno"
        FROM turnos_efectivos te
        JOIN users u ON te.empleado_intercambio_id = u.id
        WHERE te.fecha = ${fecha}::date
          AND te.estado IN ('PENDIENTE', 'REALIZADO')
          AND te.empleado_intercambio_id IS NOT NULL
      `;

      return NextResponse.json([...ganadosConCadena, ...cedidos]);
    }

    const turnosGanados = await sql`
      SELECT
        te.id::text,
        TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
        te.horario_original,
        te.horario_efectivo,
        te.grupo_original,
        te.grupo_efectivo,
        te.tipo_cambio,
        te.estado,
        'GANADO' as tipo,
        uc.nombre || ' ' || uc.apellido as companero,
        COALESCE(sd.motivo, of.descripcion) as motivo
      FROM turnos_efectivos te
      LEFT JOIN users uc ON te.empleado_intercambio_id = uc.id
      LEFT JOIN autorizaciones a ON te.autorizacion_id = a.id
      LEFT JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      LEFT JOIN ofertas of ON a.oferta_id = of.id
      WHERE te.empleado_id = ${targetUserId}::uuid
        AND te.estado IN ('PENDIENTE', 'REALIZADO');
    `;

    const turnosCedidos = await sql`
      SELECT
        te.id::text,
        TO_CHAR(te.fecha, 'YYYY-MM-DD') as fecha,
        te.horario_original,
        te.horario_efectivo,
        te.grupo_original,
        te.grupo_efectivo,
        te.tipo_cambio,
        te.estado,
        'CEDIDO' as tipo,
        uc.nombre || ' ' || uc.apellido as companero,
        COALESCE(sd.motivo, of.descripcion) as motivo
      FROM turnos_efectivos te
      LEFT JOIN users uc ON te.empleado_id = uc.id
      LEFT JOIN autorizaciones a ON te.autorizacion_id = a.id
      LEFT JOIN solicitudes_directas sd ON a.solicitud_id = sd.id
      LEFT JOIN ofertas of ON a.oferta_id = of.id
      WHERE te.empleado_intercambio_id = ${targetUserId}::uuid
        AND te.estado IN ('PENDIENTE', 'REALIZADO');
    `;

    return NextResponse.json({
      ganados: turnosGanados,
      cedidos: turnosCedidos,
    });

  } catch (error) {
    console.error('❌ Error fetching turnos efectivos:', error);
    return NextResponse.json(
      { error: 'Error al obtener turnos efectivos', details: String(error) },
      { status: 500 }
    );
  }
}