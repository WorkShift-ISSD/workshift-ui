// app/api/data/route.ts
import { NextRequest } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function listCambios() {
  const data = await sql`
    SELECT 
      cambios.*,
      to_char(cambios.fecha, 'YYYY-MM-DD') as fecha_formatted
    FROM cambios
    ORDER BY cambios.fecha DESC
    LIMIT 10;
  `;

  return data;
}

async function listCambiosConDetalles() {
  const data = await sql`
    SELECT 
      cambios.id,
      cambios.fecha,
      cambios.turno,
      cambios.solicitante,
      cambios.destinatario,
      cambios.estado,
      cambios.created_at
    FROM cambios
    WHERE cambios.estado = 'PENDIENTE'
    ORDER BY cambios.fecha ASC;
  `;

  return data;
}

async function getStatsDelMes() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const [stats] = await sql`
    SELECT 
      turnos_oferta,
      aprobados,
      pendientes,
      rechazados
    FROM stats
    WHERE mes = ${currentMonth};
  `;

  return stats;
}

async function getTurnosDataUsuario() {
  // En producción esto vendría de la sesión del usuario
  const userId = '410544b2-4001-4271-9855-fec4b6a6442a'; // Emanuel
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const [turnosData] = await sql`
    SELECT 
      td.mis_guardias,
      td.guardias_cubiertas,
      td.guardias_que_me_cubrieron,
      td.total,
      u.nombre as usuario_nombre
    FROM turnos_data td
    JOIN users u ON td.user_id = u.id
    WHERE td.user_id = ${userId} 
    AND td.mes = ${currentMonth};
  `;

  return turnosData;
}

async function getDashboardCompleto() {
  const userId = '410544b2-4001-4271-9855-fec4b6a6442a';
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Query completa con JOIN para obtener todo el dashboard
  const data = await sql`
    WITH user_stats AS (
      SELECT 
        turnos_oferta,
        aprobados,
        pendientes,
        rechazados
      FROM stats
      WHERE mes = ${currentMonth}
    ),
    user_turnos_data AS (
      SELECT 
        mis_guardias,
        guardias_cubiertas,
        guardias_que_me_cubrieron,
        total
      FROM turnos_data
      WHERE user_id = ${userId} AND mes = ${currentMonth}
    ),
    proximos_cambios AS (
      SELECT 
        id,
        fecha,
        turno,
        solicitante,
        destinatario,
        estado
      FROM cambios
      WHERE fecha >= CURRENT_DATE
      ORDER BY fecha ASC
      LIMIT 10
    )
    SELECT 
      (SELECT row_to_json(user_stats.*) FROM user_stats) as stats,
      (SELECT row_to_json(user_turnos_data.*) FROM user_turnos_data) as turnos_data,
      (SELECT json_agg(proximos_cambios.*) FROM proximos_cambios) as cambios;
  `;

  return data[0];
}

async function getCambiosPorEstado() {
  const data = await sql`
    SELECT 
      estado,
      COUNT(*) as total,
      json_agg(
        json_build_object(
          'id', id,
          'fecha', fecha,
          'turno', turno,
          'solicitante', solicitante,
          'destinatario', destinatario
        )
      ) as cambios
    FROM cambios
    GROUP BY estado
    ORDER BY 
      CASE estado
        WHEN 'PENDIENTE' THEN 1
        WHEN 'APROBADO' THEN 2
        WHEN 'RECHAZADO' THEN 3
      END;
  `;

  return data;
}

async function getResumenMensual() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const data = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE estado = 'APROBADO') as total_aprobados,
      COUNT(*) FILTER (WHERE estado = 'PENDIENTE') as total_pendientes,
      COUNT(*) FILTER (WHERE estado = 'RECHAZADO') as total_rechazados,
      COUNT(DISTINCT solicitante) as usuarios_activos,
      COUNT(*) as total_cambios
    FROM cambios
    WHERE to_char(created_at, 'YYYY-MM') = ${currentMonth};
  `;

  return data[0];
}

// Función principal que combina todo
async function getAllDashboardData() {
  const [
    cambios,
    cambiosPendientes,
    stats,
    turnosData,
    dashboardCompleto,
    cambiosPorEstado,
    resumenMensual
  ] = await Promise.all([
    listCambios(),
    listCambiosConDetalles(),
    getStatsDelMes(),
    getTurnosDataUsuario(),
    getDashboardCompleto(),
    getCambiosPorEstado(),
    getResumenMensual()
  ]);

  return {
    cambios,
    cambiosPendientes,
    stats,
    turnosData,
    dashboardCompleto,
    cambiosPorEstado,
    resumenMensual
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Obtener parámetro de query para filtrar qué datos obtener
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'cambios':
        return Response.json(await listCambios());
      
      case 'cambios-pendientes':
        return Response.json(await listCambiosConDetalles());
      
      case 'stats':
        return Response.json(await getStatsDelMes());
      
      case 'turnos-data':
        return Response.json(await getTurnosDataUsuario());
      
      case 'dashboard':
        return Response.json(await getDashboardCompleto());
      
      case 'cambios-estado':
        return Response.json(await getCambiosPorEstado());
      
      case 'resumen':
        return Response.json(await getResumenMensual());
      
      case 'all':
      default:
        return Response.json(await getAllDashboardData());
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}