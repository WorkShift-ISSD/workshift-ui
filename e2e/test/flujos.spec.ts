import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectDate } from '../helpers/datepicker';

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

        await selectDate(page, 'rango-disponibles-desde', '2026-09-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-09-07');

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
            page.locator('#seccion-mensajes').getByText('Patricia', { exact: false }).first()
        ).toBeVisible({ timeout: 5000 });
    });

    test('Flujo cobertura con rango', async ({ page }) => {
        // Patricia publica con rango 2026-09-01 al 2026-09-07
        await login(page, 'inspector2');
        await page.goto('/dashboard/cambios');

        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').last().click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-09-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-09-07');

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
            page.locator('#seccion-mensajes').getByText('Patricia', { exact: false }).first()
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

        await selectDate(page, 'rango-busca-desde', '2026-09-01');
        await selectDate(page, 'rango-busca-hasta', '2026-09-07');

        // Turno que quiero que me cubran — día A de Emanuel
        await selectDate(page, 'fecha-ofrece', '2026-09-03');

        await page.fill('textarea', 'Test flujo intercambio completo');
        await page.getByRole('button', { name: /publicar oferta/i }).click();
        await expect(page.getByText('Oferta publicada')).toBeVisible();

        // Patricia va a Disponibles y hace "Me interesa"
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
