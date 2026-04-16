import { Page } from '@playwright/test';
import { users } from '../fixtures/users';

type UserKey = keyof typeof users;

export async function login(page: Page, userKey: UserKey) {
    const user = users[userKey];
    await page.goto('/');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
}

export async function logout(page: Page) {
    // Ajustar según cómo esté implementado el logout en la UI
    await page.goto('/api/auth/logout');
}