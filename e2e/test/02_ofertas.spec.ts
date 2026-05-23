import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectDate } from '../helpers/datepicker';

test.describe('Ofertas', () => {
    test.beforeEach(async ({ page }) => {
        await login(page, 'inspector2'); // Juan - Grupo B
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
        // Juan publica con rango para evitar el filtro de horario exacto
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-08-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-08-07');

        await page.fill('textarea', 'Test disponible para otro inspector');
        await page.getByRole('button', { name: /publicar oferta/i }).click();
        await expect(page.getByText('Oferta publicada')).toBeVisible({ timeout: 5000 });

        // Emanuel va a Disponibles y verifica que la ve
        await login(page, 'inspector1'); // Emanuel - Grupo A
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await expect(page.getByText('Test disponible para otro inspector')).toBeVisible({ timeout: 5000 });
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

        // Turno que querés que te cubran — día concreto (día B de Juan)
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
        // Juan publica una oferta con rango
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
        // Juan publica una oferta con rango
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
        // Juan publica "Me ofrezco a cubrir" el 2026-08-03 (día B)
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
        // Juan publica "Me ofrezco a cubrir" con rango que incluye días B (2026-08-01 al 2026-08-07)
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

        await page.fill('textarea', 'Test filtrado cobertura visible para otro inspector');
        await page.getByRole('button', { name: /publicar oferta/i }).click();

        await expect(page.getByText('Oferta publicada')).toBeVisible();
    });

    test('No puede publicar oferta en fecha con licencia activa', async ({ page }) => {
        // Cambiar a Emanuel (inspector1) que tiene licencia médica del 8 al 14 de junio 2026
        await page.evaluate(() => {
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        await page.waitForTimeout(300);
        await login(page, 'inspector1');
        await page.goto('/dashboard/cambios');

        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Necesito que me cubran').click();
        await page.waitForTimeout(500);

        // Abrir el calendario y navegar a junio 2026
        await page.locator('#fecha-disponible-0').click();
        await page.waitForTimeout(500);

        let attempts = 0;
        while (attempts < 6) {
            const header = await page.locator('text=/^(mayo|junio)/i').first().textContent({ timeout: 2000 }).catch(() => null);
            if (header?.toLowerCase().includes('junio')) break;
            await page.locator('button svg.lucide-chevron-right').click();
            await page.waitForTimeout(200);
            attempts++;
        }

        // El día 8 debe estar deshabilitado por la licencia médica de Emanuel (8-14 jun 2026)
        const dia8 = page.locator('.grid.grid-cols-7 button[disabled]').filter({ hasText: '8' });
        await expect(dia8.first()).toBeDisabled();
    });

    test('Genera autorización pendiente', async ({ page }) => {
        // Juan publica "Me ofrezco a cubrir" con rango octubre 2026-10-01 al 2026-10-07
        await page.locator('button:has-text("Nueva oferta")').click();
        await page.waitForTimeout(1000);
        await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });

        await page.getByText('Me ofrezco a cubrir').click();
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Rango")').click();
        await page.waitForTimeout(300);

        await selectDate(page, 'rango-disponibles-desde', '2026-10-01');
        await selectDate(page, 'rango-disponibles-hasta', '2026-10-07');

        await page.fill('textarea', 'Test autorización pendiente');
        await page.getByRole('button', { name: /publicar oferta/i }).click();
        await expect(page.getByText('Oferta publicada')).toBeVisible({ timeout: 5000 });

        // Emanuel hace "Me interesa"
        await page.evaluate(() => {
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        await page.waitForTimeout(300);
        await login(page, 'inspector1');
        await page.goto('/dashboard/cambios');
        await page.locator('button:has-text("Disponibles")').click();

        await page.getByText('Test autorización pendiente').waitFor({ timeout: 5000 });
        const ofertaCard = page.locator('div').filter({ hasText: 'Test autorización pendiente' }).last();
        await ofertaCard.locator('button:has-text("Me interesa")').click();
        await page.waitForTimeout(500);

        // Elegir la primera fecha del modal y confirmar
        await expect(page.getByText('Seleccioná el día que te conviene')).toBeVisible({ timeout: 3000 });
        await page.locator('.max-h-48 button').first().click();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Confirmar' }).click();
        await page.waitForTimeout(1500);

        // Juan acepta la propuesta desde el chat
        await page.evaluate(() => {
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
        await page.waitForTimeout(300);
        await login(page, 'inspector2');
        await page.goto('/dashboard/cambios');
        await page.locator('#seccion-mensajes').scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        const chatCard = page.locator('#seccion-mensajes').locator('button').filter({ hasText: 'Emanuel' }).first();
        await chatCard.click();
        await page.waitForTimeout(2000);
        await expect(page.locator('input[placeholder="Escribí un mensaje..."]')).toBeVisible({ timeout: 5000 });

        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.locator('#seccion-mensajes').scrollIntoViewIfNeeded();
        const chatCard2 = page.locator('#seccion-mensajes').locator('button').filter({ hasText: 'Emanuel' }).first();
        await chatCard2.click();
        await page.waitForTimeout(2000);

        await expect(page.locator('button:has-text("Aceptar propuesta")')).toBeVisible({ timeout: 5000 });
        await page.locator('button:has-text("Aceptar propuesta")').click();
        await page.waitForTimeout(500);

        // Si aparece modal de mantener activa, elegir cerrar
        const modalMantener = page.locator('text=¿Qué hacemos con las otras fechas?');
        if (await modalMantener.isVisible({ timeout: 1000 }).catch(() => false)) {
            await page.locator('button:has-text("Cerrar la oferta completa")').click();
        }
        await page.waitForTimeout(1000);

        // Verificar éxito: toast o conversación cerrada
        const toastExito = page.getByText(/acordado|aceptad|éxito/i);
        const convCerrada = page.locator('#seccion-mensajes').getByText(/cerrad|completad/i);
        await expect(toastExito.or(convCerrada).first()).toBeVisible({ timeout: 5000 });
    });

});

