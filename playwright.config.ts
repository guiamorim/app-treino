import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://localhost:4173/app-treino/',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/app-treino/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
