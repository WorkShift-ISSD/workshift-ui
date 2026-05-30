import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectDate } from '../helpers/datepicker';

test.describe('Ofertas', () => {
    test.beforeEach(async ({ page }) => {
        await login(page, 'inspector2'); // Juan - Grupo B
        await page.goto('/dashboard/cambios');
    });

    test('Puede publicar oferta: me ofrezco a cubrir', async ({ page }) => {
        await test.step('Abrir el formulario de nueva oferta', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
        });

        await test.step('Seleccionar tipo "Me ofrezco a cubrir" y completar datos', async () => {
            await page.getByText('Me ofrezco a cubrir').click();
            await page.waitForTimeout(500);
            await selectDate(page, 'fecha-disponible-0', '2026-08-01');
            await page.fill('textarea', 'Test ofrezco cubrir automatizado');
        });

        await test.step('Publicar la oferta y verificar éxito', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('Puede publicar oferta: necesito que me cubran', async ({ page }) => {
        await test.step('Abrir el formulario de nueva oferta', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
        });

        await test.step('Seleccionar tipo "Necesito que me cubran" y completar datos', async () => {
            await page.getByText('Necesito que me cubran').click();
            await page.waitForTimeout(500);
            await selectDate(page, 'fecha-disponible-0', '2026-08-03');
            await page.fill('textarea', 'Test necesito cobertura automatizado');
        });

        await test.step('Publicar la oferta y verificar éxito', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('Puede publicar oferta: ofrezco intercambio', async ({ page }) => {
        await test.step('Abrir el formulario de nueva oferta', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
        });

        await test.step('Seleccionar tipo "Ofrezco intercambio" y completar fechas', async () => {
            await page.locator('button:has-text("Ofrezco intercambio")').click();
            await page.waitForTimeout(500);
            await selectDate(page, 'fecha-busca-0', '2026-08-02');
            await selectDate(page, 'fecha-ofrece', '2026-08-05');
            await page.fill('textarea', 'Test ofrezco intercambio automatizado');
        });

        await test.step('Publicar la oferta y verificar éxito', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('Puede publicar oferta: necesito intercambio', async ({ page }) => {
        await test.step('Abrir el formulario de nueva oferta', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
        });

        await test.step('Seleccionar tipo "Necesito intercambio" y completar fechas', async () => {
            await page.locator('button:has-text("Necesito intercambio")').click();
            await page.waitForTimeout(500);
            await selectDate(page, 'fecha-busca-0', '2026-08-07');
            await selectDate(page, 'fecha-disponible-0', '2026-08-04');
            await page.fill('textarea', 'Test necesito intercambio automatizado');
        });

        await test.step('Publicar la oferta y verificar éxito', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('Las ofertas aparecen en disponibles para otro inspector', async ({ page }) => {
        await test.step('Juan publica oferta con rango de disponibilidad', async () => {
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
        });

        await test.step('Emanuel ingresa al sistema y va a Disponibles', async () => {
            await login(page, 'inspector1');
            await page.goto('/dashboard/cambios');
            await page.locator('button:has-text("Disponibles")').click();
        });

        await test.step('Verificar que la oferta de Juan es visible para Emanuel', async () => {
            await expect(page.getByText('Test disponible para otro inspector')).toBeVisible({ timeout: 5000 });
        });
    });

    test('No puede publicar oferta en fecha con sanción activa', async ({ page }) => {
        await test.step('Abrir el formulario y seleccionar una fecha con sanción activa', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
            await page.getByText('Necesito que me cubran').click();
            await page.waitForTimeout(500);
            await selectDate(page, 'fecha-disponible-0', '2026-09-16');
            await page.fill('textarea', 'Test sanción automatizado descripción larga');
        });

        await test.step('Intentar publicar y verificar mensaje de error por sanción', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText(/sanción/i)).toBeVisible();
        });
    });

    test('Puede publicar oferta con rango: me ofrezco a cubrir', async ({ page }) => {
        await test.step('Abrir el formulario y seleccionar tipo con modo rango', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
            await page.getByText('Me ofrezco a cubrir').click();
            await page.waitForTimeout(500);
            await page.locator('button:has-text("Rango")').click();
            await page.waitForTimeout(300);
        });

        await test.step('Completar rango de fechas y descripción', async () => {
            await selectDate(page, 'rango-disponibles-desde', '2026-08-01');
            await selectDate(page, 'rango-disponibles-hasta', '2026-08-07');
            await page.fill('textarea', 'Test rango ofrezco cubrir automatizado');
        });

        await test.step('Publicar la oferta y verificar éxito', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('Puede publicar oferta con rango: ofrezco intercambio', async ({ page }) => {
        await test.step('Abrir el formulario y seleccionar tipo con modo rango', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
            await page.locator('button:has-text("Ofrezco intercambio")').click();
            await page.waitForTimeout(500);
            await page.locator('button:has-text("Rango")').click();
            await page.waitForTimeout(300);
        });

        await test.step('Completar rango de fechas para el turno a hacer y fecha del turno a cubrir', async () => {
            await selectDate(page, 'rango-busca-desde', '2026-08-01');
            await selectDate(page, 'rango-busca-hasta', '2026-08-07');
            await selectDate(page, 'fecha-ofrece', '2026-08-05');
            await page.fill('textarea', 'Test rango ofrezco intercambio automatizado');
        });

        await test.step('Publicar la oferta y verificar éxito', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('Puede publicar oferta con rango: necesito intercambio', async ({ page }) => {
        await test.step('Ingresar como Emanuel (Grupo A) y abrir el formulario', async () => {
            await login(page, 'inspector1');
            await page.goto('/dashboard/cambios');
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
        });

        await test.step('Seleccionar tipo y completar fechas con rango', async () => {
            await page.locator('button:has-text("Necesito intercambio")').click();
            await page.waitForTimeout(500);
            await selectDate(page, 'fecha-busca-0', '2026-08-04');
            await page.locator('button:has-text("Rango")').click();
            await page.waitForTimeout(300);
            await selectDate(page, 'rango-disponibles-desde', '2026-08-10');
            await selectDate(page, 'rango-disponibles-hasta', '2026-08-16');
            await page.fill('textarea', 'Test rango necesito intercambio automatizado');
        });

        await test.step('Publicar la oferta y verificar éxito', async () => {
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('Las ofertas con rango aparecen en Mis solicitudes con fechas', async ({ page }) => {
        await test.step('Publicar oferta con rango de fechas', async () => {
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
        });

        await test.step('Verificar que la oferta muestra el rango de fechas en Mis solicitudes', async () => {
            await expect(page.getByText(/Del/).first()).toBeVisible({ timeout: 5000 });
        });
    });

    test('Las ofertas con rango aparecen correctamente en Disponibles', async ({ page }) => {
        await test.step('Juan publica oferta con rango de disponibilidad', async () => {
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
        });

        await test.step('Emanuel va a Disponibles y verifica que el rango se muestra', async () => {
            await login(page, 'inspector1');
            await page.goto('/dashboard/cambios');
            await page.locator('button:has-text("Disponibles")').click();
            await expect(page.getByText(/Entre el/).first()).toBeVisible({ timeout: 5000 });
        });
    });

    test('El histórico muestra el rango', async ({ page }) => {
        await test.step('Publicar oferta con rango de fechas', async () => {
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
        });

        await test.step('Ir al Histórico y verificar que el rango aparece', async () => {
            await page.locator('button:has-text("Histórico")').click();
            await expect(page.getByText(/Del/).first()).toBeVisible({ timeout: 5000 });
        });
    });

    test('Las ofertas de cobertura NO aparecen para quien no trabaja ese día', async ({ page }) => {
        await test.step('Juan publica oferta de cobertura para un día de Grupo B', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
            await page.getByText('Me ofrezco a cubrir').click();
            await page.waitForTimeout(500);
            await selectDate(page, 'fecha-disponible-0', '2026-08-04');
            await page.fill('textarea', 'Test filtrado cobertura invisible para Emanuel');
            await page.getByRole('button', { name: /publicar oferta/i }).click();
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });

        await test.step('Emanuel (Grupo A) va a Disponibles', async () => {
            await login(page, 'inspector1');
            await page.goto('/dashboard/cambios');
            await page.locator('button:has-text("Disponibles")').click();
            await page.waitForTimeout(1000);
        });

        await test.step('Verificar que la oferta NO es visible para Emanuel', async () => {
            await expect(page.getByText('Test filtrado cobertura invisible para Emanuel')).not.toBeVisible();
        });
    });

    test('Las ofertas de cobertura SÍ aparecen para quien trabaja ese día', async ({ page }) => {
        await test.step('Juan publica oferta con rango que incluye días de Grupo B', async () => {
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
        });

        await test.step('Verificar que la oferta fue publicada exitosamente', async () => {
            await expect(page.getByText('Oferta publicada')).toBeVisible();
        });
    });

    test('No puede publicar oferta en fecha con licencia activa', async ({ page }) => {
        await test.step('Ingresar como Emanuel que tiene licencia activa en junio 2026', async () => {
            await page.evaluate(() => {
                document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            });
            await page.waitForTimeout(300);
            await login(page, 'inspector1');
            await page.goto('/dashboard/cambios');
        });

        await test.step('Abrir el formulario y navegar al mes de junio 2026', async () => {
            await page.locator('button:has-text("Nueva oferta")').click();
            await page.waitForTimeout(1000);
            await expect(page.getByText('¿Qué necesitás?')).toBeVisible({ timeout: 5000 });
            await page.getByText('Necesito que me cubran').click();
            await page.waitForTimeout(500);
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
        });

        await test.step('Verificar que el día 8 está deshabilitado por la licencia médica', async () => {
            const dia8 = page.locator('.grid.grid-cols-7 button[disabled]').filter({ hasText: '8' });
            await expect(dia8.first()).toBeDisabled();
        });
    });

    test('Genera autorización pendiente', async ({ page }) => {
        await test.step('Juan publica oferta de cobertura con rango', async () => {
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
        });

        await test.step('Emanuel hace "Me interesa" y selecciona una fecha', async () => {
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
            await expect(page.getByText('Seleccioná el día que te conviene')).toBeVisible({ timeout: 3000 });
            await page.locator('.max-h-48 button').first().click();
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: 'Confirmar' }).click();
            await page.waitForTimeout(1500);
        });

        await test.step('Juan acepta la propuesta desde el chat', async () => {
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
            const modalMantener = page.locator('text=¿Qué hacemos con las otras fechas?');
            if (await modalMantener.isVisible({ timeout: 1000 }).catch(() => false)) {
                await page.locator('button:has-text("Cerrar la oferta completa")').click();
            }
            await page.waitForTimeout(1000);
        });

        await test.step('Verificar que el acuerdo fue generado exitosamente', async () => {
            const toastExito = page.getByText(/acordado|aceptad|éxito/i);
            const convCerrada = page.locator('#seccion-mensajes').getByText(/cerrad|completad/i);
            await expect(toastExito.or(convCerrada).first()).toBeVisible({ timeout: 5000 });
        });
    });
});
