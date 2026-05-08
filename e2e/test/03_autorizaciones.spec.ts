import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Autorizaciones', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await login(page, 'jefe');
        await page.goto('/dashboard/autorizaciones');
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('Jefe ve autorizaciones pendientes', async ({ page }) => {
        await expect(page.getByText('Pendiente').first()).toBeVisible({ timeout: 5000 });
    });

    test('La autorización muestra los datos correctos', async ({ page }) => {
        const pendienteRow = page.locator('tr').filter({ hasText: 'Pendiente' }).first();
        await pendienteRow.locator('button[title="Ver detalle"]').click();
        await expect(page.getByText('Detalle de Autorización')).toBeVisible({ timeout: 3000 });

        // Nombre de inspector (Rodriguez o Gomez)
        await expect(
            page.getByText(/Rodriguez|Gomez/, { exact: false }).first()
        ).toBeVisible({ timeout: 3000 });

        // Fecha en formato dd/mm/yyyy
        await expect(
            page.getByText(/\d{2}\/\d{2}\/\d{4}/).first()
        ).toBeVisible({ timeout: 3000 });

        // Horario en formato HH:MM-HH:MM
        await expect(
            page.getByText(/\d{2}:\d{2}-\d{2}:\d{2}/).first()
        ).toBeVisible({ timeout: 3000 });

        // Cerrar el modal sin aprobar ni rechazar
        await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
        await expect(page.getByText('Detalle de Autorización')).not.toBeVisible({ timeout: 3000 });
    });

    test('Después de aprobar, la autorización desaparece de pendientes', async ({ page }) => {
        const pendientesLocator = page.locator('tr').filter({ hasText: 'Pendiente' });

        // Contar filas pendientes antes de aprobar
        const cantidadAntes = await pendientesLocator.count();

        // Abrir y aprobar la primera pendiente
        await pendientesLocator.first().locator('button[title="Ver detalle"]').click();
        await expect(page.getByText('Detalle de Autorización')).toBeVisible({ timeout: 3000 });

        await page.locator('button:has-text("Aprobar")').click();
        await expect(page.getByRole('heading', { name: 'Confirmar Aprobación' })).toBeVisible({ timeout: 3000 });
        await page.locator('button:has-text("Confirmar Aprobación")').click();
        await expect(page.getByText('Autorización aprobada exitosamente')).toBeVisible({ timeout: 5000 });

        // Esperar a que el modal se cierre y la tabla se actualice
        await expect(page.getByText('Detalle de Autorización')).not.toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(3000); // esperar que Pusher actualice la lista
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verificar que disminuyó el número de pendientes
        const cantidadDespues = await pendientesLocator.count();
        expect(cantidadDespues).toBeLessThanOrEqual(cantidadAntes - 1);
    });

    test('Después de rechazar, la autorización desaparece de pendientes', async ({ page }) => {
        const pendientesLocator = page.locator('tr').filter({ hasText: 'Pendiente' });

        // Saltear si no hay pendientes (pueden haberse consumido en tests anteriores)
        const cantidadAntes = await pendientesLocator.count();
        test.skip(cantidadAntes === 0, 'No hay autorizaciones pendientes disponibles');

        // Abrir y rechazar la primera pendiente
        await pendientesLocator.first().locator('button[title="Ver detalle"]').click();
        await expect(page.getByText('Detalle de Autorización')).toBeVisible({ timeout: 3000 });

        await page.locator('textarea').fill('Motivo de rechazo: no corresponde el cambio solicitado');
        await page.waitForTimeout(500); // esperar que React procese el onChange
        await page.locator('button:has-text("Rechazar")').click();
        await expect(page.getByRole('heading', { name: 'Confirmar Rechazo' })).toBeVisible({ timeout: 3000 });
        await expect(page.locator('button:has-text("Confirmar Rechazo")')).toBeEnabled({ timeout: 3000 });
        await page.locator('button:has-text("Confirmar Rechazo")').click();
        await expect(page.getByText('Autorización rechazada')).toBeVisible({ timeout: 8000 });

        // Esperar a que el modal se cierre y la tabla se actualice
        await expect(page.getByText('Detalle de Autorización')).not.toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);

        // Verificar que disminuyó el número de pendientes
        const cantidadDespues = await pendientesLocator.count();
        expect(cantidadDespues).toBeLessThan(cantidadAntes);
    });

});
