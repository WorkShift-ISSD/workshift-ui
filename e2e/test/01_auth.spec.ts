import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Autenticación', () => {
    test('Inspector puede iniciar sesión', async ({ page }) => {
        await test.step('Iniciar sesión como Inspector (Emanuel)', async () => {
            await login(page, 'inspector1');
        });

        await test.step('Verificar redirección al dashboard', async () => {
            await expect(page).toHaveURL(/dashboard/);
            await expect(page.getByText('Emanuel').first()).toBeVisible();
        });
    });

    test('Inspector 2 puede iniciar sesión', async ({ page }) => {
        await test.step('Iniciar sesión como Inspector 2 (Juan)', async () => {
            await login(page, 'inspector2');
        });

        await test.step('Verificar redirección al dashboard', async () => {
            await expect(page).toHaveURL(/dashboard/);
            await expect(page.getByText('Juan').first()).toBeVisible();
        });
    });

    test('Jefe puede iniciar sesión', async ({ page }) => {
        await test.step('Iniciar sesión como Jefe', async () => {
            await login(page, 'jefe');
        });

        await test.step('Verificar redirección al dashboard', async () => {
            await expect(page).toHaveURL(/dashboard/);
        });
    });

    test('Supervisor puede iniciar sesión', async ({ page }) => {
        await test.step('Iniciar sesión como Supervisor', async () => {
            await login(page, 'supervisor');
        });

        await test.step('Verificar redirección al dashboard', async () => {
            await expect(page).toHaveURL(/dashboard/);
        });
    });
});
