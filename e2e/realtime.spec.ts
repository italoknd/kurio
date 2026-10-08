import type { Page } from '@playwright/test'
import { openCartAs, PAGE_LOAD_TIMEOUT, row, summary, visible } from './cart-helpers'
import { expect, test, waitForMocks } from './fixtures'

/**
 * Tempo real (enunciado §7 e §9, itens 9 e 10): `nft.updated` atualiza catálogo,
 * detalhe e carrinho com aviso acessível; duplicatas e eventos antigos são
 * ignorados; após uma queda, a interface se reconcilia com a API REST.
 */

async function waitForSocket(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__kurioMocks!.socket.connectedCount()), { timeout: PAGE_LOAD_TIMEOUT })
    .toBeGreaterThan(0)
}

/** Altera preço/disponibilidade no banco simulado (publica `nft.updated`) e devolve o id do evento. */
function updateNft(page: Page, nftId: string, patch: { editionId?: string; price?: string; available?: number }) {
  return page.evaluate(
    ({ nftId, patch }) => window.__kurioMocks!.nfts.update(nftId, patch as Parameters<NonNullable<typeof window.__kurioMocks>['nfts']['update']>[1]).id,
    { nftId, patch },
  )
}

test.describe('tempo real', () => {
  test('preço de um item do carrinho muda: aviso e resumo atualizado', async ({ page }) => {
    await openCartAs(page, 'ana')
    await waitForSocket(page)

    await updateNft(page, 'emerald-ape-042', { editionId: '1-50', price: '1.29' })

    const message = 'O preço de Emerald Ape #042 (1/50) mudou de 1.19 ETH para 1.29 ETH.'
    await expect(page.getByRole('group', { name: 'Alterações nos itens' }).getByText(message)).toBeVisible()
    await expect(page.getByRole('region', { name: /Notifications/ }).getByText(message)).toBeVisible()
    await expect(visible(row(page, 'Emerald Ape #042').getByText('2.58 ETH'))).toBeVisible()
    await expect(summary(page, 'Subtotal')).toHaveText('27.03 ETH')
    await expect(summary(page, 'Total')).toHaveText('27.046 ETH')
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeEnabled()

    await page.getByRole('button', { name: `Dispensar aviso: ${message}` }).click()
    await expect(page.getByRole('group', { name: 'Alterações nos itens' })).toHaveCount(0)
  })

  test('disponibilidade cai abaixo da quantidade: item destacado e finalização bloqueada', async ({ page }) => {
    await openCartAs(page, 'ana')
    await waitForSocket(page)

    await updateNft(page, 'violet-nomad-314', { editionId: '1-50', available: 3 })

    await expect(page.getByText('Violet Nomad #314 (1/50) agora tem só 3 unidades disponíveis.').first()).toBeVisible()
    await expect(row(page, 'Violet Nomad #314')).toHaveAccessibleDescription(/Restam só 3 unidades/)
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeDisabled()

    // Diminuir vai direto ao novo limite e libera a finalização.
    await visible(page.getByRole('button', { name: 'Diminuir quantidade de Violet Nomad #314' })).click()
    await expect(page.getByRole('group', { name: 'Quantidade de Violet Nomad #314' }).getByRole('status')).toHaveText('3')
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeEnabled()
  })

  test('duplicatas e eventos antigos não regridem o detalhe', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await waitForMocks(page)
    await expect(page.getByRole('radio', { name: /Edição 1\/50, 1\.19 ETH/ })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await waitForSocket(page)

    const first = await updateNft(page, 'emerald-ape-042', { editionId: '1-50', price: '1.29' })
    await expect(page.getByRole('radio', { name: /Edição 1\/50, 1\.29 ETH/ })).toBeVisible()
    await expect(page.getByText('O preço de Emerald Ape #042 mudou de 1.19 ETH para 1.29 ETH.')).toBeVisible()

    const second = await updateNft(page, 'emerald-ape-042', { editionId: '1-50', price: '1.39' })
    await expect(page.getByRole('radio', { name: /Edição 1\/50, 1\.39 ETH/ })).toBeVisible()

    // Evento antigo (versão anterior) e duplicata do mais recente: nada muda.
    await page.evaluate(([a, b]) => {
      window.__kurioMocks!.socket.replay(a)
      window.__kurioMocks!.socket.replay(b)
    }, [first, second])
    await page.waitForTimeout(500)
    await expect(page.getByRole('radio', { name: /Edição 1\/50, 1\.39 ETH/ })).toBeVisible()
    await expect(page.getByText('O preço de Emerald Ape #042 mudou de 1.29 ETH para 1.39 ETH.')).toHaveCount(1)
  })

  test('card do catálogo acompanha preço e disponibilidade', async ({ page }) => {
    await page.goto('/?q=Emerald%20Ape%20%23042')
    await waitForMocks(page)
    const card = page.getByRole('article').filter({ has: page.getByRole('link', { name: 'Emerald Ape #042', exact: true }) })
    await expect(card.getByText('1.19 ETH')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await waitForSocket(page)

    await updateNft(page, 'emerald-ape-042', { price: '0.99' })
    await expect(card.getByText('0.99 ETH')).toBeVisible()
    await expect(card.getByText('1.19 ETH')).toBeVisible() // preço anterior, riscado

    await updateNft(page, 'emerald-ape-042', { available: 0 })
    await expect(card.getByText('Esgotado')).toBeVisible()
  })

  test('após queda da conexão, o carrinho se reconcilia com a API', async ({ page }) => {
    await openCartAs(page, 'ana')
    await waitForSocket(page)

    await page.evaluate(() => window.__kurioMocks!.socket.setAvailable(false))
    await expect(page.getByText('Conexão em tempo real perdida. Reconectando…')).toBeVisible()

    // Alteração durante a queda: nenhum evento chega (só uma consulta REST poderia trazê-la).
    await updateNft(page, 'ivory-baron-088', { editionId: '1-50', price: '1.89' })

    await page.evaluate(() => window.__kurioMocks!.socket.setAvailable(true))
    // Backoff de reconexão do cliente: até ~7,5 s entre tentativas.
    await expect(page.getByText('Conexão em tempo real perdida. Reconectando…')).toBeHidden({ timeout: 20_000 })
    await expect(summary(page, 'Subtotal')).toHaveText('27.73 ETH')
    await expect(visible(row(page, 'Ivory Baron #088').getByText('17.01 ETH'))).toBeVisible()
  })
})
