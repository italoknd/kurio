import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
/** URL externa (ex.: o deploy na Vercel): `BASE_URL=https://... npx playwright test`. */
const EXTERNAL_URL = process.env.BASE_URL

/**
 * Testes E2E rodam contra o build de produção (com mocks MSW ativos).
 * Cada teste usa um contexto novo do navegador: localStorage e service worker isolados.
 */
export default defineConfig({
  testDir: './e2e',
  // Baselines da regressão visual versionadas por projeto (desktop/mobile), sem sufixo de SO.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  // Com vários workers, a primeira renderização após um carregamento completo pode passar de 5 s.
  expect: { timeout: 10_000 },
  use: {
    baseURL: EXTERNAL_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  // Com BASE_URL, os testes rodam contra o endereço informado, sem servidor local.
  webServer: EXTERNAL_URL ? undefined : {
    // Servidor estático próprio (não o `vite preview`): extensões do editor podem injetar
    // scripts no HTML servido pelo Vite e alterar o comportamento medido.
    command: `npm run build && node scripts/serve.mjs --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
