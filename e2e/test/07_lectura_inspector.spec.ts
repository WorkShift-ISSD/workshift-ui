import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Lectura - Inspector', () => {

    test('Dashboard carga con bienvenida', async ({ page }) => {
        await login(page, 'inspectorTest');
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.getByText('Bienvenid@').first()).toBeVisible();
    });

    test('Nav solo muestra links del inspector', async ({ page }) => {
        await login(page, 'inspectorTest');
        const linksVisibles = ['Inicio', 'Cambios', 'Licencias', 'Calificaciones'];
        for (const link of linksVisibles) {
            await expect(page.getByRole('link', { name: link })).toBeVisible();
        }
        const linksOcultos = ['Personal', 'Faltas', 'Sanciones', 'Autorizaciones', 'Informes', 'Estadísticas'];
        for (const link of linksOcultos) {
            await expect(page.getByRole('link', { name: link })).not.toBeVisible();
        }
    });

    test('Página Cambios carga con sus pestañas', async ({ page }) => {
        await login(page, 'inspectorTest');
        await page.getByRole('link', { name: 'Cambios' }).click();
        await expect(page).toHaveURL(/cambios/);
        await expect(page.getByText('Mis solicitudes').first()).toBeVisible();
        await expect(page.getByText('Disponibles').first()).toBeVisible();
        await expect(page.getByText('Histórico').first()).toBeVisible();
    });

    test('Página Licencias carga correctamente', async ({ page }) => {
        await login(page, 'inspectorTest');
        await page.getByRole('link', { name: 'Licencias' }).click();
        await expect(page).toHaveURL(/licencias/);
        await expect(page.getByRole('heading', { name: 'Gestión de Licencias' })).toBeVisible();
    });

    test('Página Calificaciones carga correctamente', async ({ page }) => {
        await login(page, 'inspectorTest');
        await page.getByRole('link', { name: 'Calificaciones' }).click();
        await expect(page).toHaveURL(/calificaciones/);
        await expect(page.getByRole('heading', { name: 'Calificaciones' })).toBeVisible();
    });

    test('No puede acceder a páginas restringidas', async ({ page }) => {
        await login(page, 'inspectorTest');
        const paginasRestringidas = [
            '/dashboard/personal',
            '/dashboard/faltas',
            '/dashboard/sanciones',
            '/dashboard/autorizaciones',
            '/dashboard/informes',
            '/dashboard/estadisticas',
        ];
        for (const ruta of paginasRestringidas) {
            await page.goto(ruta);
            await expect(page).not.toHaveURL(ruta);
        }
    });

    test('Cerrar sesión redirige al login', async ({ page }) => {
        await login(page, 'inspectorTest');
        await page.goto('/api/auth/logout');
        await expect(page).toHaveURL(/^\//);
        await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
    });

});
