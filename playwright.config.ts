import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/app-treino/',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
  },
  // F22.7: o mesmo iPhone com o motor do Chrome e com o do Safari (WebKit), que é o que a app usa no iPhone.
  projects: [
    { name: 'iphone-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    // F34.4: chave falsa só para estes testes, que intercetam o envio; a publicação constrói sem ela.
    command: 'VITE_CHAVE_REPORTES=chave-de-teste npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/app-treino/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
