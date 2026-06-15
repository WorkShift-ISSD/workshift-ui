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
        await test.step('Verificar que existen autorizaciones con estado Pendiente', async () => {
            await expect(page.getByText('Pendiente').first()).toBeVisible({ timeout: 5000 });
        });
    });

    test('La autorización muestra los datos correctos', async ({ page }) => {
        await test.step('Abrir el detalle de la primera autorización pendiente', async () => {
            const pendienteRow = page.locator('tr').filter({ hasText: 'Pendiente' }).first();
            await pendienteRow.locator('button[title="Ver detalle"]').click();
            await expect(page.getByText('Detalle de Autorización')).toBeVisible({ timeout: 3000 });
        });

        await test.step('Verificar que se muestran los datos del inspector', async () => {
            await expect(
                page.getByText(/Rodriguez|Garcia/, { exact: false }).first()
            ).toBeVisible({ timeout: 3000 });
        });

        await test.step('Verificar que la fecha tiene formato DD/MM/YYYY', async () => {
            await expect(
                page.getByText(/\d{2}\/\d{2}\/\d{4}/).first()
            ).toBeVisible({ timeout: 3000 });
        });

        await test.step('Cerrar el detalle sin tomar acción', async () => {
            await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
            await expect(page.getByText('Detalle de Autorización')).not.toBeVisible({ timeout: 3000 });
        });
    });

    test('Después de aprobar, la autorización desaparece de pendientes', async ({ page }) => {
        const pendientesLocator = page.locator('tr').filter({ hasText: 'Pendiente' });
        let cantidadAntes = 0;

        await test.step('Registrar cantidad de autorizaciones pendientes antes de aprobar', async () => {
            cantidadAntes = await pendientesLocator.count();
        });

        await test.step('Abrir el detalle y aprobar la primera autorización pendiente', async () => {
            await pendientesLocator.first().locator('button[title="Ver detalle"]').click();
            await expect(page.getByText('Detalle de Autorización')).toBeVisible({ timeout: 3000 });
            await page.locator('button:has-text("Aprobar")').click();
            await expect(page.getByRole('heading', { name: 'Confirmar Aprobación' })).toBeVisible({ timeout: 3000 });
            await page.locator('button:has-text("Confirmar Aprobación")').click();
            await expect(page.getByText('Autorización aprobada exitosamente')).toBeVisible({ timeout: 15000 });
        });

        await test.step('Esperar actualización de la tabla', async () => {
            await expect(page.getByText('Detalle de Autorización')).not.toBeVisible({ timeout: 5000 });
            await page.waitForTimeout(3000);
            await page.reload();
            await page.waitForLoadState('networkidle');
        });

        await test.step('Verificar que la cantidad de pendientes disminuyó', async () => {
            const cantidadDespues = await pendientesLocator.count();
            expect(cantidadDespues).toBeLessThanOrEqual(cantidadAntes - 1);
        });
    });

    test('Después de rechazar, la autorización desaparece de pendientes', async ({ page }) => {
        const pendientesLocator = page.locator('tr').filter({ hasText: 'Pendiente' });
        let cantidadAntes = 0;

        await test.step('Verificar que hay autorizaciones pendientes disponibles', async () => {
            cantidadAntes = await pendientesLocator.count();
            test.skip(cantidadAntes === 0, 'No hay autorizaciones pendientes disponibles');
        });

        await test.step('Abrir el detalle, ingresar motivo y rechazar la primera pendiente', async () => {
            await pendientesLocator.first().locator('button[title="Ver detalle"]').click();
            await expect(page.getByText('Detalle de Autorización')).toBeVisible({ timeout: 3000 });
            await page.locator('textarea').fill('Motivo de rechazo: no corresponde el cambio solicitado');
            await page.waitForTimeout(500);
            await page.locator('button:has-text("Rechazar")').click();
            await expect(page.getByRole('heading', { name: 'Confirmar Rechazo' })).toBeVisible({ timeout: 3000 });
            await expect(page.locator('button:has-text("Confirmar Rechazo")')).toBeEnabled({ timeout: 3000 });
            await page.locator('button:has-text("Confirmar Rechazo")').click();
            await expect(page.getByText('Autorización rechazada')).toBeVisible({ timeout: 8000 });
        });

        await test.step('Verificar que la cantidad de pendientes disminuyó', async () => {
            await expect(page.getByText('Detalle de Autorización')).not.toBeVisible({ timeout: 5000 });
            await page.waitForTimeout(1000);
            const cantidadDespues = await pendientesLocator.count();
            expect(cantidadDespues).toBeLessThan(cantidadAntes);
        });
    });
});
