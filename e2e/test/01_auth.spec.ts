import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Autenticación', () => {
    test('Inspector puede iniciar sesión', async ({ page }) => {
        await login(page, 'inspector1');
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.getByText('Emanuel').first()).toBeVisible();
    });

    test('Inspector 2 puede iniciar sesión', async ({ page }) => {
        await login(page, 'inspector2');
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.getByText('Juan').first()).toBeVisible();
    });

    test('Jefe puede iniciar sesión', async ({ page }) => {
        await login(page, 'jefe');
        await expect(page).toHaveURL(/dashboard/);
    });

    test('Supervisor puede iniciar sesión', async ({ page }) => {
        await login(page, 'supervisor');
        await expect(page).toHaveURL(/dashboard/);
    });
});