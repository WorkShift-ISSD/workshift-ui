import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    workers:1,
    timeout: 60000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        headless: false
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});