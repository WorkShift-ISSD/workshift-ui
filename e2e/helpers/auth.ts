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
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
}

export async function logout(page: Page) {
    await page.goto('/api/auth/logout');
}