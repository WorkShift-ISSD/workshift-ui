import { Client } from 'pg';
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });

export default async function globalSetup() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    console.log('\n🧹 Limpiando datos de tests anteriores...');

    const TEST_OFERTAS = `SELECT id FROM ofertas WHERE descripcion LIKE 'Test%'`;

    await client.query(`DELETE FROM mensajes WHERE oferta_id IN (${TEST_OFERTAS})`);
    await client.query(`DELETE FROM conversaciones WHERE oferta_id IN (${TEST_OFERTAS})`);
    await client.query(`DELETE FROM autorizaciones WHERE solicitud_id IN (SELECT id FROM solicitudes_directas WHERE oferta_id IN (${TEST_OFERTAS}))`);
    await client.query(`DELETE FROM solicitudes_directas WHERE oferta_id IN (${TEST_OFERTAS})`);
    await client.query(`DELETE FROM autorizaciones WHERE oferta_id IN (${TEST_OFERTAS})`);
    await client.query(`DELETE FROM ofertas WHERE descripcion LIKE 'Test%'`);
    await client.query(`DELETE FROM cambios`);

    // Calcular la fecha exacta que usa el test (mismo algoritmo que 04_flujos.spec.ts)
    const FECHA_REF = new Date(2025, 0, 1);
    const base = new Date();
    base.setMonth(base.getMonth() + 7);
    base.setDate(1);
    let diaIntercambio = '';
    for (let d = 8; d <= 14; d++) {
        const fecha = new Date(base.getFullYear(), base.getMonth(), d);
        const diffDays = Math.floor((fecha.getTime() - FECHA_REF.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays % 2 === 0) {
            const y = base.getFullYear();
            const m = String(base.getMonth() + 1).padStart(2, '0');
            diaIntercambio = `${y}-${m}-${String(d).padStart(2, '0')}`;
            break;
        }
    }
    await client.query(`DELETE FROM turnos_efectivos WHERE fecha = $1 AND estado = 'PENDIENTE'`, [diaIntercambio]);

    // Borrar autorizaciones de licencias (cualquier estado) y recrearlas como pendientes
    await client.query(`
        WITH eliminadas AS (
            DELETE FROM autorizaciones
            WHERE estado != 'PENDIENTE'
              AND licencia_id IS NOT NULL
              AND oferta_id IS NULL
            RETURNING licencia_id, empleado_id, tipo
        )
        INSERT INTO autorizaciones (id, tipo, empleado_id, licencia_id, estado, created_at, updated_at)
        SELECT gen_random_uuid(), tipo, empleado_id, licencia_id, 'PENDIENTE', NOW(), NOW()
        FROM eliminadas
    `);

    console.log('✅ Base de datos lista para los tests.\n');

    await client.end();
}
