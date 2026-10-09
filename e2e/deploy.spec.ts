import { openCartAs, PAGE_LOAD_TIMEOUT, row, signInAs, summary, visible } from './cart-helpers'
import { expect, test, waitForMocks } from './fixtures'

/**
 * Verificação do deploy público: `BASE_URL=https://kurio-ochre.vercel.app npm run test:deploy`.
 * Cobre acesso direto às rotas (fallback de SPA), mocks REST no navegador, tempo real
 * (Socket.IO simulado) e a compra completa até o recibo.
 */

test.describe.configure({ timeout: 90_000 })

test.describe('deploy', () => {
  test('acesso direto e refresh em rotas internas', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await waitForMocks(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

    await page.goto('/rota-que-nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })

  test('tempo real: mudança de preço chega ao carrinho', async ({ page }) => {
    await openCartAs(page, 'ana')
    await expect.poll(() => page.evaluate(() => window.__kurioMocks!.socket.connectedCount()), { timeout: PAGE_LOAD_TIMEOUT }).toBeGreaterThan(0)
    await page.evaluate(() => window.__kurioMocks!.nfts.update('emerald-ape-042', { editionId: '1-50', price: '1.29' }))
    await expect(page.getByText('O preço de Emerald Ape #042 (1/50) mudou de 1.19 ETH para 1.29 ETH.').first()).toBeVisible()
    await expect(summary(page, 'Total')).toHaveText('27.046 ETH')
    await expect(visible(row(page, 'Emerald Ape #042').getByText('2.58 ETH'))).toBeVisible()
  })

  test('compra completa até o recibo', async ({ page }) => {
    await signInAs(page, 'ana', '/pagamento')
    await page.evaluate(() => window.__kurioMocks!.setConfig({ orderDelayMs: 800 }))
    const confirm = page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true')
    await expect(confirm).toBeEnabled({ timeout: PAGE_LOAD_TIMEOUT })
    await confirm.click()
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

    // Recibo acessível por URL direta (refresh).
    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })
})
