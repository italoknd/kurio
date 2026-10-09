import type { Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { PAGE_LOAD_TIMEOUT, signInAs } from './cart-helpers'
import { expect, test, waitForMocks } from './fixtures'

/**
 * Regressão visual (enunciado §9): início, detalhe, carrinho e pagamento, em desktop
 * e mobile, com os dados fixos das fixtures. Baselines versionadas em
 * `e2e/__screenshots__`; atualizar com `npm run test:visual:update`.
 */

test.describe.configure({ timeout: 60_000 })

/** Espera fontes, imagens e o fim das atualizações antes da captura. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    // Imagens lazy abaixo da dobra também entram na captura de página inteira.
    for (const img of document.images) img.loading = 'eager'
    await Promise.all(
      [...document.images].map((img) => (img.complete ? null : new Promise((resolve) => img.addEventListener('load', resolve, { once: true })))),
    )
  })
}

async function snapshot(page: Page, name: string) {
  await settle(page)
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    stylePath: fileURLToPath(new URL('./visual.css', import.meta.url)),
    maxDiffPixelRatio: 0.01,
  })
}

test.describe('regressão visual', () => {
  test('início', async ({ page }) => {
    await page.goto('/')
    await waitForMocks(page)
    await expect(page.locator('#catalogo-resultados').getByRole('article').first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await snapshot(page, 'inicio')
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await waitForMocks(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await snapshot(page, 'detalhe')
  })

  test('carrinho', async ({ page }) => {
    await signInAs(page, 'ana', '/carrinho')
    await expect(page.getByText('26.846 ETH').first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await snapshot(page, 'carrinho')
  })

  test('pagamento', async ({ page }) => {
    await signInAs(page, 'ana', '/pagamento')
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana Ribeiro', { timeout: PAGE_LOAD_TIMEOUT })
    await expect(page.getByText('26.846 ETH').first()).toBeVisible()
    await snapshot(page, 'pagamento')
  })
})
