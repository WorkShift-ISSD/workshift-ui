import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectDate } from '../helpers/datepicker';

// Fechas calculadas dinámicamente: primer día del mes que está 7 meses adelante.
// Así cada run mensual usa un rango distinto y no colisiona con turnos_efectivos previos.
function calcularFechasTest() {
    // Referencia de grupos: 1 ene 2025 = Grupo A, alternan cada día
    const FECHA_REF = new Date(2025, 0, 1);
    const base = new Date();
    base.setMonth(base.getMonth() + 7);
    base.setDate(1);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');

    // Encontrar el primer día Grupo A dentro del rango 8-14 del mes
    // (evita conflicto con los tests de cobertura que usan el rango 1-7)
    let diaIntercambio = '';
    for (let d = 8; d <= 14; d++) {
        const fecha = new Date(year, base.getMonth(), d);
        const diffDays = Math.floor((fecha.getTime() - FECHA_REF.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays % 2 === 0) { // par = Grupo A
            diaIntercambio = `${year}-${month}-${String(d).padStart(2, '0')}`;
            break;
        }
    }

    return {
        desde: `${year}-${month}-01`,
        hasta: `${year}-${month}-07`,
        diaIntercambio,
    };
}

const { desde: DESDE, hasta: HASTA, diaIntercambio: DIA_INTERCAMBIO } = calcularFechasTest();

test.describe('Flujos', () => {
    test.describe.configure({ mode: 'serial' });

    test('Flujo cobertura completo', async ({ page }) => {
        // Usamos rango para evitar el filtro de coincidencia de horario en día concreto
        await login(page, 'inspector2');
        await page.goto('/dashboard/cambios');

        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').last().click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', DESDE);
        await selectDate(page, 'rango-disponibles-hasta', HASTA);

        await page.fill('textarea', 'Test flujo cobertura completo');
        await page.getByRole('button', { name: /publicar oferta/i }).click();
        await expect(page.getByText('Oferta publicada')).toBeVisible();

        // Emanuel va a Disponibles y hace "Me interesa"
        await page.evaluate(() => {
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        await page.waitForTimeout(300);
        await login(page, 'inspector1');
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await page.getByText('Test flujo cobertura completo').waitFor({ timeout: 5000 });
        const ofertaCard = page.locator('div').filter({ hasText: 'Test flujo cobertura completo' }).last();
        await ofertaCard.locator('button:has-text("Me interesa")').click();
        await page.waitForTimeout(500);

        // Se abre el modal de selección de fecha rango — elegir primera y confirmar
        await expect(page.getByText('Seleccioná el día que te conviene')).toBeVisible({ timeout: 3000 });
        await page.locator('.max-h-48 button').first().click();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Confirmar' }).click();
        await page.waitForTimeout(1500);

        // Verificar que aparece el chat en la sección de mensajes
        await page.locator('#seccion-mensajes').scrollIntoViewIfNeeded();
        await expect(
            page.locator('#seccion-mensajes').getByText('Juan', { exact: false }).first()
        ).toBeVisible({ timeout: 5000 });

        // Juan acepta la propuesta desde el chat
        await page.evaluate(() => {
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        await page.waitForTimeout(300);
        await login(page, 'inspector2');
        await page.goto('/dashboard/cambios');
        await page.locator('#seccion-mensajes').scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        // Abrir el chat de Emanuel haciendo click en su card
        const chatCard = page.locator('#seccion-mensajes').locator('button').filter({ hasText: 'Emanuel' }).first();
        await chatCard.click();
        await page.waitForTimeout(2000);
        // Verificar que el chat está expandido buscando el input de mensaje
        await expect(page.locator('input[placeholder="Escribí un mensaje..."]')).toBeVisible({ timeout: 5000 });
        // Recargar para asegurar que llegó el mensaje
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.locator('#seccion-mensajes').scrollIntoViewIfNeeded();
        const chatCard2 = page.locator('#seccion-mensajes').locator('button').filter({ hasText: 'Emanuel' }).first();
        await chatCard2.click();
        await page.waitForTimeout(2000);
        // Aceptar propuesta
        await expect(page.locator('button:has-text("Aceptar propuesta")')).toBeVisible({ timeout: 5000 });
        await page.locator('button:has-text("Aceptar propuesta")').click();
        await page.waitForTimeout(500);
        // Si aparece modal de mantener activa, elegir cerrar
        const modalMantener = page.locator('text=¿Qué hacemos con las otras fechas?');
        if (await modalMantener.isVisible({ timeout: 1000 }).catch(() => false)) {
            await page.locator('button:has-text("Cerrar la oferta completa")').click();
        }
        await page.waitForTimeout(1000);
    });

    test('Flujo cobertura con rango', async ({ page }) => {
        await login(page, 'inspector2');
        await page.goto('/dashboard/cambios');

        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').last().click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', DESDE);
        await selectDate(page, 'rango-disponibles-hasta', HASTA);

        await page.fill('textarea', 'Test flujo cobertura con rango');
        await page.getByRole('button', { name: /publicar oferta/i }).click();
        await expect(page.getByText('Oferta publicada')).toBeVisible();

        // Emanuel va a Disponibles y hace "Me interesa"
        await page.evaluate(() => {
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        await page.waitForTimeout(300);
        await login(page, 'inspector1');
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await page.getByText('Test flujo cobertura con rango').waitFor({ timeout: 5000 });
        const ofertaCard = page.locator('div').filter({ hasText: 'Test flujo cobertura con rango' }).last();
        await ofertaCard.locator('button:has-text("Me interesa")').click();
        await page.waitForTimeout(500);

        // Se abre el modal de selección de fecha rango
        await expect(page.getByText('Seleccioná el día que te conviene')).toBeVisible({ timeout: 3000 });

        // Elegir la primera fecha disponible y confirmar
        await page.locator('.max-h-48 button').first().click();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Confirmar' }).click();
        await page.waitForTimeout(1500);

        // Verificar que aparece el chat en la sección de mensajes
        await page.locator('#seccion-mensajes').scrollIntoViewIfNeeded();
        await expect(
            page.locator('#seccion-mensajes').getByText('Juan', { exact: false }).first()
        ).toBeVisible({ timeout: 5000 });
    });

    test('Flujo intercambio completo', async ({ page }) => {
        // Emanuel publica "Ofrezco intercambio" con rango en turnosBusca
        // para evitar el filtro de coincidencia de horario en día concreto
        await login(page, 'inspector1');
        await page.goto('/dashboard/cambios');

        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.locator('button:has-text("Ofrezco intercambio")').click();
        await page.waitForTimeout(500);

        // Turno que me ofrezco a hacer — rango (evita filtro de horario exacto)
        await page.locator('button:has-text("Rango")').last().click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-busca-desde', DESDE);
        await selectDate(page, 'rango-busca-hasta', HASTA);

        // Turno que quiero que me cubran — día A de Emanuel
        await selectDate(page, 'fecha-ofrece', DIA_INTERCAMBIO);

        await page.fill('textarea', 'Test flujo intercambio completo');
        await page.getByRole('button', { name: /publicar oferta/i }).click();
        await expect(page.getByText('Oferta publicada')).toBeVisible();

        // Juan va a Disponibles y hace "Me interesa"
        await page.evaluate(() => {
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        await page.waitForTimeout(300);
        await login(page, 'inspector2');
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await page.getByText('Test flujo intercambio completo').first().waitFor({ timeout: 5000 });
        const ofertaCard = page.locator('div').filter({ hasText: 'Test flujo intercambio completo' }).last();
        await ofertaCard.locator('button:has-text("Me interesa")').click();
        await page.waitForTimeout(500);

        // Se abre el modal de selección de fecha rango
        await expect(page.getByText('Seleccioná el día que te conviene')).toBeVisible({ timeout: 3000 });
        await page.locator('.max-h-48 button').first().click();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Confirmar' }).click();
        await page.waitForTimeout(1500);

        // Verificar que aparece el chat en la sección de mensajes
        await page.locator('#seccion-mensajes').scrollIntoViewIfNeeded();
        await expect(
            page.locator('#seccion-mensajes').getByText('Emanuel', { exact: false }).first()
        ).toBeVisible({ timeout: 5000 });
    });

});
