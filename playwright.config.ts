import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.ts',
    fullyParallel: false,
    workers:1,
    timeout: 60000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'on',
        video: 'on',
        },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});