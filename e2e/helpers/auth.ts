import { Page } from '@playwright/test';

let users: any = {};

try {
  users = require('../fixtures/users').users;
} catch {
  users = {
    inspector: {
      email: 'fallback@test.com',
      password: '1234'
    }
  };
}

type UserKey = keyof typeof users;

export async function login(page: Page, userKey: string) {
    const user = users[userKey];
    if (!user) throw new Error(`User "${userKey}" not found in fixtures. Do you have fixtures/users.ts locally?`);

    await page.goto('/');

    // Para cuentas con primer ingreso se prueba primero la contraseña actual y,
    // si falla, la contraseña inicial que tiene el usuario antes del primer cambio.
    const passwordsToTry: string[] = user.primerIngreso?.initialPassword
        ? [user.password, user.primerIngreso.initialPassword]
        : [user.password];

    for (let i = 0; i < passwordsToTry.length; i++) {
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', passwordsToTry[i]);
        await page.click('button[type="submit"]');

        const outcome = await Promise.race([
            page.waitForURL('**/dashboard**', { timeout: 10000 }).then(() => 'dashboard'),
            page.waitForSelector('h2:has-text("Configura tu Contraseña")', { timeout: 6000 }).then(() => 'modal'),
        ]).catch(() => 'failed');

        if (outcome === 'dashboard') return;

        if (outcome === 'modal') {
            const modal = page.locator('div.fixed').filter({ hasText: 'Configura tu Contraseña' });
            await modal.locator('input[type="password"]').nth(0).fill(user.password);
            await modal.locator('input[type="password"]').nth(1).fill(user.password);
            await modal.getByRole('button', { name: 'Configurar Contraseña' }).click();
            await page.waitForURL('**/dashboard**', { timeout: 12000 });
            return;
        }

        // 'failed': intentar con la siguiente contraseña
        if (i < passwordsToTry.length - 1) {
            await page.goto('/');
        }
    }

    throw new Error(`Login fallido para "${userKey}"`);
}

export async function logout(page: Page) {
    await page.goto('/api/auth/logout');
}