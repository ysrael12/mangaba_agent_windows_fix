import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração E2E para Mangaba Agent Web Dashboard
 *
 * Executa testes contra:
 * - Vite dev server (http://localhost:5173) OR
 * - Backend dashboard (http://127.0.0.1:9119)
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 retry local absorve flakiness pontual (teardown de contexto que trava
  // por conexões abertas — websocket de HMR / polling em /api).
  retries: process.env.CI ? 2 : 1,
  // Limita a paralelização: `undefined` sobe 1 worker por core da CPU, e todos
  // martelam um único Vite dev server → goto/teardown estouram timeout sob
  // carga. 4 workers mantêm o dev server responsivo e o run estável.
  workers: process.env.CI ? 1 : 4,
  timeout: 60000,  // Aumentar timeout global para 60s
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],

  use: {
    // URL base para todos os testes
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Trace para debugging
    trace: 'on-first-retry',

    // Screenshot em caso de falha
    screenshot: 'only-on-failure',

    // Video em caso de falha
    video: 'retain-on-failure',

    // Aumentar timeout para mobile
    actionTimeout: 60000,  // 60s para cliques, preenchimento, etc
    navigationTimeout: 60000,  // 60s para navegação
  },

  // Servidor de desenvolvimento (inicia automaticamente)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Variáveis de ambiente para dev server
      VITE_HTTPS: 'false',
    },
  },

  // Configuração de snapshot
  snapshotDir: 'e2e/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testDir}/{testFileName}-{platform}{ext}',

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
