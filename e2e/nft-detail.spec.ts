import type { Page } from '@playwright/test'
import { expect, test, USERS, waitForMocks } from './fixtures'

/**
 * Detalhe do NFT e favoritos (enunciado §9, itens 2 e 4): acesso direto, NFT
 * inexistente, edição indisponível, limite de quantidade, compra e favoritos com
 * atualização otimista, falha e recuperação.
 */

async function openDetail(page: Page, nftId: string) {
  await page.goto(`/nft/${nftId}`)
  await waitForMocks(page)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

/** Controles de compra visíveis no viewport atual (painel desktop ou barra mobile). */
function increase(page: Page, name: string) {
  return page.getByRole('button', { name: `Aumentar quantidade de ${name}` }).locator('visible=true')
}

test.describe('detalhe do NFT', () => {
  test('acesso direto, edições e preço da edição', async ({ page, isMobile }) => {
    await openDetail(page, 'emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Emerald Ape #042')
    await expect(page).toHaveTitle('Emerald Ape #042 | Kurio')

    const soldOut = page.getByRole('radio', { name: /Edição 1\/1, .*esgotada/ })
    await expect(soldOut).toBeVisible()
    await expect(page.getByRole('radio', { name: /Edição 1\/50/ })).toHaveAttribute('aria-checked', 'true')

    await soldOut.click()
    await expect(page.getByRole('button', { name: /Esgotado/ }).locator('visible=true')).toBeDisabled()

    await page.getByRole('radio', { name: /Edição 1\/10/ }).click()
    if (!isMobile) await expect(page.getByText('2.38 ETH').first()).toBeVisible()
  })

  test('limite de quantidade da edição', async ({ page }) => {
    await openDetail(page, 'neon-vessel-552')
    await page.getByRole('radio', { name: /Edição 1\/10/ }).click()
    const plus = increase(page, 'Neon Vessel #552')
    await plus.click()
    await expect(page.getByRole('group', { name: 'Quantidade de Neon Vessel #552' }).locator('visible=true').getByRole('status')).toHaveText('2')
    await expect(plus).toBeDisabled()
    await expect(page.getByText('Restam 2 unidades.').first()).toBeAttached()
  })

  test('NFT inexistente exibe 404 próprio', async ({ page }) => {
    await page.goto('/nft/nao-existe')
    await waitForMocks(page)
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar o catálogo' })).toBeVisible()
  })

  test('comprar adiciona ao carrinho do visitante', async ({ page, isMobile }) => {
    await openDetail(page, 'golden-beat-207')
    await increase(page, 'Golden Beat #207').click()
    await page.getByRole('button', { name: /^Comprar/ }).locator('visible=true').click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByText('Golden Beat #207 (1/50) adicionado ao carrinho.')).toBeVisible()
    if (!isMobile) await expect(page.getByRole('link', { name: 'Carrinho, 2 itens' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio:guest-cart-id'))).toMatch(/^cart_/)
  })
})

test.describe('favoritos', () => {
  test('visitante é convidado a entrar e o favorito persiste após refresh', async ({ page }) => {
    await openDetail(page, 'golden-signal-160')
    const heart = page.getByRole('button', { name: /(Favoritar|Remover) Golden Signal #160/i }).locator('visible=true')
    await heart.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.ana.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog).toBeHidden()

    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Golden Signal #160 adicionado aos favoritos.')).toBeVisible()

    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('button', { name: /remover Golden Signal #160 dos favoritos/i }).locator('visible=true')).toHaveAttribute('aria-pressed', 'true')
  })

  test('falha na mutation desfaz a atualização otimista', async ({ page }) => {
    await page.goto('/entrar?redirect=/nft/golden-beat-207')
    await waitForMocks(page)
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.bruno.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.bruno.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Golden Beat #207')

    await page.evaluate(() => {
      window.__kurioMocks!.setConfig({ network: 'lento' })
      window.__kurioMocks!.failNext('PUT', '/api/favorites/golden-beat-207', 500)
    })
    const heart = page.getByRole('button', { name: /(Favoritar|Remover) Golden Beat #207/i }).locator('visible=true')
    await heart.click()
    // Otimista: marca na hora, antes da resposta (lenta) da API.
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    // A falha restaura o estado anterior e avisa.
    await expect(heart).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 })
    await expect(page.getByText(/Não foi possível atualizar "Golden Beat #207" nos favoritos/)).toBeVisible()

    await page.evaluate(() => window.__kurioMocks!.setConfig({ network: 'normal' }))
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Golden Beat #207 adicionado aos favoritos.')).toBeVisible()
  })
})
