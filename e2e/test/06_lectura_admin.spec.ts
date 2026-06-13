import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Lectura - Admin', () => {

    test('Dashboard carga con bienvenida', async ({ page }) => {
        await login(page, 'admin');
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.getByText('Bienvenid@, Admin').first()).toBeVisible();
    });

    test('Nav muestra todos los links del admin', async ({ page }) => {
        await login(page, 'admin');
        const links = ['Inicio', 'Cambios', 'Licencias', 'Calificaciones', 'Personal', 'Faltas', 'Sanciones', 'Autorizaciones', 'Informes', 'Estadísticas'];
        for (const link of links) {
            await expect(page.getByRole('link', { name: link })).toBeVisible();
        }
    });

    test('Página Cambios carga con sus pestañas', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Cambios' }).click();
        await expect(page).toHaveURL(/cambios/);
        await expect(page.getByText('Mis solicitudes').first()).toBeVisible();
        await expect(page.getByText('Disponibles').first()).toBeVisible();
        await expect(page.getByText('Histórico').first()).toBeVisible();
    });

    test('Página Licencias carga correctamente', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Licencias' }).click();
        await expect(page).toHaveURL(/licencias/);
        await expect(page.getByRole('heading', { name: 'Gestión de Licencias' })).toBeVisible();
    });

    test('Página Calificaciones carga correctamente', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Calificaciones' }).click();
        await expect(page).toHaveURL(/calificaciones/);
        await expect(page.getByRole('heading', { name: 'Calificaciones' })).toBeVisible();
    });

    test('Página Personal carga y muestra lista de empleados', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Personal' }).click();
        await expect(page).toHaveURL(/personal/);
        await expect(page.getByRole('heading', { name: 'Gestión de Empleados' })).toBeVisible();
        await expect(page.getByText('Error al cargar empleados')).not.toBeVisible();
    });

    test('Página Faltas carga correctamente', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Faltas' }).click();
        await expect(page).toHaveURL(/faltas/);
        await expect(page.getByRole('heading', { name: 'Control de Faltas' })).toBeVisible();
    });

    test('Página Sanciones carga correctamente', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Sanciones' }).click();
        await expect(page).toHaveURL(/sanciones/);
        await expect(page.getByRole('heading', { name: 'Gestión de Sanciones' })).toBeVisible();
    });

    test('Página Autorizaciones carga correctamente', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Autorizaciones' }).click();
        await expect(page).toHaveURL(/autorizaciones/);
        await expect(page.getByRole('heading', { name: 'Gestión de Autorizaciones' })).toBeVisible();
    });

    test('Página Informes carga correctamente', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Informes' }).click();
        await expect(page).toHaveURL(/informes/);
        await expect(page.getByRole('heading', { name: 'Informes y Reportes' })).toBeVisible();
    });

    test('Página Estadísticas carga correctamente', async ({ page }) => {
        await login(page, 'admin');
        await page.getByRole('link', { name: 'Estadísticas' }).click();
        await expect(page).toHaveURL(/estadisticas/);
        await expect(page.getByRole('heading', { name: 'Estadísticas y Análisis' })).toBeVisible();
    });

    test('Cerrar sesión redirige al login', async ({ page }) => {
        await login(page, 'admin');
        await page.goto('/api/auth/logout');
        await expect(page).toHaveURL(/^\//);
        await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
    });

});
