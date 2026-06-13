import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe.skip('Lectura - Jefe', () => {

    test('Dashboard carga con bienvenida', async ({ page }) => {
        await login(page, 'jefeTest');
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.getByText('Bienvenid@').first()).toBeVisible();
    });

    test('Nav muestra los links del jefe', async ({ page }) => {
        await login(page, 'jefeTest');
        const linksVisibles = ['Inicio', 'Licencias', 'Calificaciones', 'Personal', 'Autorizaciones', 'Informes', 'Estadísticas'];
        for (const link of linksVisibles) {
            await expect(page.getByRole('link', { name: link })).toBeVisible();
        }
        const linksOcultos = ['Cambios', 'Faltas', 'Sanciones'];
        for (const link of linksOcultos) {
            await expect(page.getByRole('link', { name: link })).not.toBeVisible();
        }
    });

    test('Página Licencias carga correctamente', async ({ page }) => {
        await login(page, 'jefeTest');
        await page.getByRole('link', { name: 'Licencias' }).click();
        await expect(page).toHaveURL(/licencias/);
        await expect(page.getByRole('heading', { name: 'Gestión de Licencias' })).toBeVisible();
    });

    test('Página Calificaciones carga correctamente', async ({ page }) => {
        await login(page, 'jefeTest');
        await page.getByRole('link', { name: 'Calificaciones' }).click();
        await expect(page).toHaveURL(/calificaciones/);
        await expect(page.getByRole('heading', { name: 'Calificaciones' })).toBeVisible();
    });

    test('Página Personal carga correctamente', async ({ page }) => {
        await login(page, 'jefeTest');
        await page.getByRole('link', { name: 'Personal' }).click();
        await expect(page).toHaveURL(/personal/);
        await expect(page.getByRole('heading', { name: 'Gestión de Empleados' })).toBeVisible();
        await expect(page.getByText('Error al cargar empleados')).not.toBeVisible();
    });

    test('Página Autorizaciones carga correctamente', async ({ page }) => {
        await login(page, 'jefeTest');
        await page.getByRole('link', { name: 'Autorizaciones' }).click();
        await expect(page).toHaveURL(/autorizaciones/);
        await expect(page.getByRole('heading', { name: 'Gestión de Autorizaciones' })).toBeVisible();
    });

    test('Página Informes carga correctamente', async ({ page }) => {
        await login(page, 'jefeTest');
        await page.getByRole('link', { name: 'Informes' }).click();
        await expect(page).toHaveURL(/informes/);
        await expect(page.getByRole('heading', { name: 'Informes y Reportes' })).toBeVisible();
    });

    test('Página Estadísticas carga correctamente', async ({ page }) => {
        await login(page, 'jefeTest');
        await page.getByRole('link', { name: 'Estadísticas' }).click();
        await expect(page).toHaveURL(/estadisticas/);
        await expect(page.getByRole('heading', { name: 'Estadísticas y Análisis' })).toBeVisible();
    });

    test('No puede acceder a páginas restringidas', async ({ page }) => {
        await login(page, 'jefeTest');
        const paginasRestringidas = [
            '/dashboard/cambios',
            '/dashboard/faltas',
            '/dashboard/sanciones',
        ];
        for (const ruta of paginasRestringidas) {
            await page.goto(ruta);
            await expect(page).not.toHaveURL(ruta);
        }
    });

    test('Cerrar sesión redirige al login', async ({ page }) => {
        await login(page, 'jefeTest');
        await page.goto('/api/auth/logout');
        await expect(page).toHaveURL(/^\//);
        await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
    });

});
