import type { Page } from '@playwright/test'
import { PAGE_LOAD_TIMEOUT, signInAs, visible } from './cart-helpers'
import { expect, test, USERS, waitForMocks } from './fixtures'

/**
 * Checkout e pedido (enunciado §9, itens 6, 7, 9 e 10): compra completa até o recibo,
 * pagamento e carteira recusados, clique repetido, timeout com recuperação do mesmo
 * pedido, preço alterado durante a revisão, pedido pendente após refresh e sessão
 * expirada preservando o formulário.
 */

test.describe.configure({ timeout: 60_000 })

type MockConfigPatch = Parameters<NonNullable<Window['__kurioMocks']>['setConfig']>[0]

function setMockConfig(page: Page, patch: MockConfigPatch) {
  return page.evaluate((value) => window.__kurioMocks!.setConfig(value), patch)
}

/** Pedidos criados durante o teste (as fixtures já trazem o histórico da Ana: `ord_seed_*`). */
function orderCount(page: Page) {
  return page.evaluate(() => window.__kurioMocks!.orders.list().filter((order) => !order.id.startsWith('ord_seed_')).length)
}

function confirmPurchase(page: Page) {
  return visible(page.getByRole('button', { name: 'Confirmar compra' }))
}

async function openCheckout(page: Page) {
  await signInAs(page, 'ana', '/pagamento')
  await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana Ribeiro', { timeout: PAGE_LOAD_TIMEOUT })
  await expect(confirmPurchase(page)).toBeEnabled()
}

/** Preenche/valida e abre a revisão (conecta a carteira se preciso). */
async function openReview(page: Page) {
  await confirmPurchase(page).click()
  const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('checkout e pedido', () => {
  test('compra completa: do detalhe do NFT ao recibo confirmado', async ({ page }) => {
    await signInAs(page, 'ana', '/nft/golden-beat-207')
    await setMockConfig(page, { orderDelayMs: 800 })
    await visible(page.getByRole('button', { name: /^Comprar/ })).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await visible(page.getByRole('button', { name: 'Conectar e finalizar' })).click()
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(confirmPurchase(page)).toBeEnabled()

    const dialog = await openReview(page)
    await expect(dialog.getByText('27.836 ETH')).toBeVisible()
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    const receipt = page.getByRole('article')
    await expect(receipt.getByRole('cell', { name: /Golden Beat #207/ })).toBeVisible()
    await expect(receipt.getByText('27.836 ETH').first()).toBeVisible()
    await expect(receipt.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute('href', /^https:\/\/etherscan\.io\/tx\/0x/)

    // Só os itens comprados saem do carrinho (aqui, todos).
    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    expect(await orderCount(page)).toBe(1)
  })

  test('validação do formulário do colecionador', async ({ page }) => {
    await openCheckout(page)
    await page.getByRole('textbox', { name: 'Nome de exibição' }).fill('')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@')
    await confirmPurchase(page).click()

    await expect(page.getByText('Informe o nome de exibição.')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveAccessibleDescription('Informe um e-mail válido.')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('carteira recusa a conexão, depois conecta e desconecta', async ({ page }) => {
    await openCheckout(page)
    await setMockConfig(page, { walletConnection: 'recusar' })
    await confirmPurchase(page).click()
    await expect(page.getByText('A conexão foi recusada na carteira. Tente novamente.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await setMockConfig(page, { walletConnection: 'aceitar' })
    await page.getByRole('button', { name: 'Conectar agora' }).click()
    await expect(page.getByText('MetaMask conectada na rede Ethereum.')).toBeVisible()
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(page.getByText('A carteira será conectada ao confirmar a compra.')).toBeVisible()

    // Trocar de carteira usa a rede dela.
    await page.getByRole('radio', { name: /Reserva/ }).click()
    await expect(page.getByRole('combobox', { name: 'Rede' })).toHaveText('Polygon')
    await expect(page.getByText('Taxa de rede (Polygon)')).toBeVisible()
  })

  test('pagamento recusado preserva os itens do carrinho', async ({ page }) => {
    await openCheckout(page)
    await setMockConfig(page, { payment: 'recusar', orderDelayMs: 500 })
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await expect(page.getByText(/Pagamento recusado pela carteira\./)).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByRole('heading', { name: 'Itens (17 unidades)' })).toBeAttached()
  })

  test('cliques repetidos criam um único pedido', async ({ page }) => {
    await openCheckout(page)
    await setMockConfig(page, { orderDelayMs: 60_000 })
    const dialog = await openReview(page)
    // Três cliques no mesmo instante, antes de o botão ser desabilitado.
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
      button.click()
    })
    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
    await page.waitForTimeout(1000)
    expect(await orderCount(page)).toBe(1)
  })

  test('timeout após a criação recupera o mesmo pedido', async ({ page }) => {
    await openCheckout(page)
    await setMockConfig(page, { orderDelayMs: 60_000 })
    await page.evaluate(() => window.__kurioMocks!.orders.timeoutNextCreate())
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()

    // O cliente desiste após 10 s; o pedido já existe no servidor.
    const verify = dialog.getByRole('button', { name: 'Verificar pedido' })
    await expect(verify).toBeVisible({ timeout: 20_000 })
    await expect(dialog.getByText(/Não sabemos se o pedido foi criado/)).toBeVisible()
    expect(await orderCount(page)).toBe(1)

    await verify.click()
    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    expect(await orderCount(page)).toBe(1)
  })

  test('preço muda durante a revisão (tempo real): exige nova confirmação', async ({ page }) => {
    await openCheckout(page)
    await setMockConfig(page, { orderDelayMs: 60_000 })
    await expect.poll(() => page.evaluate(() => window.__kurioMocks!.socket.connectedCount())).toBeGreaterThan(0)
    const dialog = await openReview(page)
    const pay = dialog.getByRole('button', { name: 'Confirmar e pagar' })

    await page.evaluate(() => window.__kurioMocks!.nfts.update('emerald-ape-042', { editionId: '1-50', price: '1.29' }))
    await expect(dialog.getByText('Os valores mudaram desde a revisão: o total foi de 26.846 ETH para 27.046 ETH. Revise e confirme novamente.')).toBeVisible()
    await expect(pay).toBeDisabled()

    await dialog.getByRole('button', { name: 'Revisar novos valores' }).click()
    await expect(pay).toBeEnabled()
    await pay.click()
    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    await expect(page.getByText(/Total: 27\.046 ETH · Pedido/)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })

  test('cotação desatualizada sem evento: a API recusa e pede nova confirmação', async ({ page }) => {
    await openCheckout(page)
    await setMockConfig(page, { orderDelayMs: 60_000 })
    const dialog = await openReview(page)

    // Sem tempo real, a mudança só aparece na revalidação da API (409 QUOTE_OUTDATED).
    await page.evaluate(() => {
      window.__kurioMocks!.socket.setAvailable(false)
      window.__kurioMocks!.nfts.update('ivory-baron-088', { editionId: '1-50', price: '1.89' })
    })
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(dialog.getByText(/o total foi de 26\.846 ETH para 27\.746 ETH/)).toBeVisible()
    expect(await orderCount(page)).toBe(0)

    await dialog.getByRole('button', { name: 'Revisar novos valores' }).click()
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    await expect(page.getByText(/Total: 27\.746 ETH · Pedido/)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })

  test('pedido pendente continua após refresh e é confirmado', async ({ page }) => {
    await openCheckout(page)
    // Atraso longo: a conclusão é disparada pelo teste depois do refresh (sem depender do relógio).
    await setMockConfig(page, { orderDelayMs: 120_000 })
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
    const orderId = new URL(page.url()).pathname.split('/').pop()!

    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

    await expect.poll(() => page.evaluate(() => window.__kurioMocks!.socket.connectedCount())).toBeGreaterThan(0)
    await page.evaluate((id) => window.__kurioMocks!.orders.process(id), orderId)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    expect(await orderCount(page)).toBe(1)
  })

  test('sessão expirada no checkout preserva o formulário', async ({ page }) => {
    await openCheckout(page)
    const note = page.getByRole('textbox', { name: 'Observação do colecionador (opcional)' })
    await note.fill('Presente para a coleção da família')
    await page.getByRole('textbox', { name: 'Nome do perfil' }).fill('ana.presentes')

    await page.evaluate(() => window.__kurioMocks!.session.expireAll())
    await confirmPurchase(page).click()
    await expect(page).toHaveURL(/\/entrar\?.*redirect=%2Fpagamento/, { timeout: PAGE_LOAD_TIMEOUT })

    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/pagamento')
    await expect(note).toHaveValue('Presente para a coleção da família', { timeout: PAGE_LOAD_TIMEOUT })
    await expect(page.getByRole('textbox', { name: 'Nome do perfil' })).toHaveValue('ana.presentes')
  })
})
