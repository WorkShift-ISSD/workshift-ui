import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectDate } from '../helpers/datepicker';

test.describe('Ofertas', () => {
    test.beforeEach(async ({ page }) => {
        await login(page, 'inspector2'); // Patricia - Grupo B
        await page.goto('/dashboard/cambios');
    });

    test('Puede publicar oferta: me ofrezco a cubrir', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await selectDate(page, 'fecha-disponible-0', '2026-08-01');
        await page.fill('textarea', 'Test ofrezco cubrir automatizado');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('Puede publicar oferta: necesito que me cubran', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Necesito que me cubran').click();
        await page.waitForTimeout(500);

        await selectDate(page, 'fecha-disponible-0', '2026-08-03');
        await page.fill('textarea', 'Test necesito cobertura automatizado');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('Puede publicar oferta: ofrezco intercambio', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.locator('button:has-text("Ofrezco intercambio")').click();
        await page.waitForTimeout(500);

        // Turno que me ofrezco a hacer (día libre, cualquier día)
        await selectDate(page, 'fecha-busca-0', '2026-08-02');

        // Turno que quiero que me cubran (día del grupo B)
        await selectDate(page, 'fecha-ofrece', '2026-08-05');

        await page.fill('textarea', 'Test ofrezco intercambio automatizado');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('Puede publicar oferta: necesito intercambio', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.locator('button:has-text("Necesito intercambio")').click();
        await page.waitForTimeout(500);

        // Turno que necesito cambiar (día del grupo B)
        await selectDate(page, 'fecha-busca-0', '2026-08-07');

        // Días que puedo hacer a cambio (cualquier día)
        await selectDate(page, 'fecha-disponible-0', '2026-08-04');

        await page.fill('textarea', 'Test necesito intercambio automatizado');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('Las ofertas aparecen en disponibles para otro inspector', async ({ page }) => {
        await login(page, 'inspector1'); // Emanuel - Grupo A
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await expect(page.getByText('Disponible para cubrir un turno').first()).toBeVisible();
    });

    test('No puede publicar oferta en fecha con sanción activa', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Necesito que me cubran').click();
        await page.waitForTimeout(500);

        await selectDate(page, 'fecha-disponible-0', '2026-09-16');
        await page.fill('textarea', 'Test sanción automatizado descripción larga');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText(/sanción/i)).toBeVisible();
    });

    test('Puede publicar oferta con rango: me ofrezco a cubrir', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-08-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-08-07');

        await page.fill('textarea', 'Test rango ofrezco cubrir automatizado');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('Puede publicar oferta con rango: ofrezco intercambio', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.locator('button:has-text("Ofrezco intercambio")').click();
        await page.waitForTimeout(500);

        // Turno que me ofrezco a hacer — con rango
        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-busca-desde', '2026-08-01');
        await selectDate(page, 'rango-busca-hasta', '2026-08-07');

        // Turno que querés que te cubran — día concreto (día B de Patricia)
        await selectDate(page, 'fecha-ofrece', '2026-08-05');

        await page.fill('textarea', 'Test rango ofrezco intercambio automatizado');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('Puede publicar oferta con rango: necesito intercambio', async ({ page }) => {
        await login(page, 'inspector1'); // Emanuel - Grupo A
        await page.goto('/dashboard/cambios');

        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.locator('button:has-text("Necesito intercambio")').click();
        await page.waitForTimeout(500);

        // Turno que necesito cambiar — día concreto (día A de Emanuel)
        await selectDate(page, 'fecha-busca-0', '2026-08-04');

        // Días que puedo hacer a cambio — con rango
        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-08-10');
        await selectDate(page, 'rango-disponibles-hasta', '2026-08-16');

        await page.fill('textarea', 'Test rango necesito intercambio automatizado');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('Las ofertas con rango aparecen en Mis solicitudes con fechas', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-08-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-08-07');

        await page.fill('textarea', 'Test rango display mis solicitudes');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
        await page.waitForTimeout(1000);

        // La tab "Mis solicitudes" es la default — verificar que muestra el rango
        await expect(page.getByText(/Del/).first()).toBeVisible({ timeout: 5000 });
    });

    test('Las ofertas con rango aparecen correctamente en Disponibles', async ({ page }) => {
        // Patricia publica una oferta con rango
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-08-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-08-07');

        await page.fill('textarea', 'Test rango display disponibles');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();

        // Emanuel va a Disponibles y verifica el rango
        await login(page, 'inspector1');
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await expect(page.getByText(/Entre el/).first()).toBeVisible({ timeout: 5000 });
    });

    test('El histórico muestra el rango', async ({ page }) => {
        // Patricia publica una oferta con rango
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-08-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-08-07');

        await page.fill('textarea', 'Test rango display historico');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
        await page.waitForTimeout(1000);

        await page.locator('button:has-text("Histórico")').click();

        await expect(page.getByText(/Del/).first()).toBeVisible({ timeout: 5000 });
    });

    test('Las ofertas de cobertura NO aparecen para quien no trabaja ese día', async ({ page }) => {
        // Patricia publica "Me ofrezco a cubrir" el 2026-08-03 (día B)
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await selectDate(page, 'fecha-disponible-0', '2026-08-04');
        await page.fill('textarea', 'Test filtrado cobertura invisible para Emanuel');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();

        // Emanuel (grupo A) va a Disponibles — no debe ver la oferta
        await login(page, 'inspector1');
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();
        await page.waitForTimeout(1000);

        await expect(page.getByText('Test filtrado cobertura invisible para Emanuel')).not.toBeVisible();
    });

    test('Las ofertas de cobertura SÍ aparecen para quien trabaja ese día', async ({ page }) => {
        // Patricia publica "Me ofrezco a cubrir" con rango que incluye días B (2026-08-01 al 2026-08-07)
        // Usamos rango porque el filtro de rango no requiere coincidencia de horario exacto
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-08-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-08-07');

        await page.fill('textarea', 'Test filtrado cobertura visible para Pablo');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();

        // Pablo (inspector3, grupo B) va a Disponibles — sí debe ver la oferta
        await login(page, 'inspector3');
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await expect(page.getByText('Test filtrado cobertura visible para Pablo')).toBeVisible({ timeout: 5000 });
    });

    test('No puede publicar oferta en fecha con licencia activa', async ({ page }) => {
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Necesito que me cubran').click();
        await page.waitForTimeout(500);

        // Abrir el calendario y navegar a septiembre
        await page.locator('#fecha-disponible-0').click();
        await page.waitForTimeout(500);

        // Navegar a septiembre 2026
        // El día 22 debería estar deshabilitado por la licencia
        // Navegar hasta septiembre
        let attempts = 0;
        while (attempts < 6) {
            const header = await page.locator('text=/^(agosto|septiembre)/i').first().textContent({ timeout: 2000 }).catch(() => null);
            if (header?.toLowerCase().includes('septiembre')) break;
            await page.locator('button svg.lucide-chevron-right').click();
            await page.waitForTimeout(200);
            attempts++;
        }

        // Verificar que el día 22 está deshabilitado
        const dia22 = page.locator('.grid.grid-cols-7 button[disabled]').filter({ hasText: '22' });
        await expect(dia22.first()).toBeDisabled();
    });


});

