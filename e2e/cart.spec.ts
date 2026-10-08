import { expectCartLoaded, openCartAs, PAGE_LOAD_TIMEOUT, row, summary, visible } from './cart-helpers'
import { expect, test, USERS, waitForMocks } from './fixtures'

/**
 * Carrinho e cotação (enunciado §9, item 5): itens e valores da API, quantidades
 * dentro da disponibilidade, remoção com desfazer, cupom válido/inválido/expirado,
 * itens com problema bloqueando a finalização e persistência após refresh e login.
 */

test.describe('carrinho', () => {
  test('lista os itens com os valores da cotação da API', async ({ page }) => {
    await openCartAs(page, 'ana')
    await expect(page.getByRole('heading', { name: 'Itens (17 unidades)' })).toBeAttached()

    const emerald = row(page, 'Emerald Ape #042')
    await expect(emerald.getByRole('img', { name: /Emerald Ape/ })).toBeVisible()
    await expect(visible(emerald.getByText('2.38 ETH'))).toBeVisible()
    await expect(visible(row(page, 'Ivory Baron #088').getByText('16.11 ETH'))).toBeVisible()

    await expect(summary(page, 'Subtotal')).toHaveText('26.83 ETH')
    await expect(summary(page, 'Desconto')).toHaveText('(-) 0.00 ETH')
    await expect(summary(page, 'Taxa de rede')).toHaveText('0.016 ETH')
    await expect(summary(page, 'Total')).toHaveText('26.846 ETH')
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeEnabled()
  })

  test('altera quantidades dentro do limite e atualiza o resumo', async ({ page }) => {
    await openCartAs(page, 'ana')

    await visible(page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' })).click()
    await expect(visible(row(page, 'Emerald Ape #042').getByText('3.57 ETH'))).toBeVisible()
    await expect(summary(page, 'Subtotal')).toHaveText('28.02 ETH')
    await expect(summary(page, 'Total')).toHaveText('28.036 ETH')

    await visible(page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' })).click()
    await expect(summary(page, 'Total')).toHaveText('26.846 ETH')

    // 1/50 permite até 10 por pedido: de 9 para 10 e o botão de aumentar trava.
    const plus = visible(page.getByRole('button', { name: 'Aumentar quantidade de Ivory Baron #088' }))
    await plus.click()
    await expect(page.getByRole('group', { name: 'Quantidade de Ivory Baron #088' }).getByRole('status')).toHaveText('10')
    await expect(plus).toBeDisabled()
    await expect(summary(page, 'Subtotal')).toHaveText('28.62 ETH')

    // A quantidade confirmada persiste após o refresh.
    await page.reload()
    await waitForMocks(page)
    await expectCartLoaded(page)
    await expect(page.getByRole('group', { name: 'Quantidade de Ivory Baron #088' }).getByRole('status')).toHaveText('10')
  })

  test('remove item com opção de desfazer', async ({ page }) => {
    await openCartAs(page, 'ana')

    await visible(page.getByRole('button', { name: 'Remover Violet Nomad #314 (1/50) do carrinho' })).click()
    await expect(row(page, 'Violet Nomad #314')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Carrinho de NFTs' })).toBeFocused()
    await expect(summary(page, 'Subtotal')).toHaveText('18.49 ETH')

    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(row(page, 'Violet Nomad #314')).toHaveCount(1)
    await expect(summary(page, 'Subtotal')).toHaveText('26.83 ETH')
  })

  test('aplica e remove cupom, com erro de código inválido e expirado', async ({ page }) => {
    await openCartAs(page, 'ana')
    const field = page.getByRole('textbox', { name: 'Código promocional' })
    const apply = page.getByRole('button', { name: 'Aplicar' })

    await apply.click()
    await expect(page.getByText('Informe o código do cupom.')).toBeVisible()
    await expect(field).toHaveAttribute('aria-invalid', 'true')

    await field.fill('NAOEXISTE')
    await apply.click()
    await expect(page.getByText('Cupom inválido. Confira o código e tente novamente.')).toBeVisible()
    await expect(field).toHaveAccessibleDescription('Cupom inválido. Confira o código e tente novamente.')

    await field.fill('expirado')
    await apply.click()
    await expect(page.getByText('Este cupom expirou.')).toBeVisible()

    await field.fill('kurio10')
    await apply.click()
    await expect(summary(page, 'Desconto (KURIO10)')).toHaveText('(-) 2.683 ETH')
    await expect(summary(page, 'Total')).toHaveText('24.163 ETH')
    await expect(page.getByText('10% de desconto')).toBeVisible()

    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(summary(page, 'Desconto')).toHaveText('(-) 0.00 ETH')
    await expect(summary(page, 'Total')).toHaveText('26.846 ETH')
  })

  test('item esgotado é destacado e bloqueia a finalização', async ({ page }) => {
    test.slow() // três carregamentos completos da página
    await openCartAs(page, 'ana')
    await page.evaluate(() => window.__kurioMocks!.nfts.update('violet-nomad-314', { editionId: '1-50', available: 0 }))
    await page.reload()
    await waitForMocks(page)
    await expectCartLoaded(page)

    const violet = row(page, 'Violet Nomad #314')
    await expect(violet).toHaveAccessibleDescription('Esta edição esgotou. Remova o item para continuar.')
    await expect(page.getByText('Resolva os itens destacados para continuar.')).toBeVisible()
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeDisabled()

    await visible(page.getByRole('button', { name: 'Remover Violet Nomad #314 (1/50) do carrinho' })).click()
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeEnabled()
  })

  test('carrinho vazio leva ao catálogo', async ({ page }) => {
    await openCartAs(page, 'bruno')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar o catálogo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Colecionadores também viram' })).toBeVisible()
  })

  test('visitante: carrinho persiste após refresh e é preservado ao entrar', async ({ page }) => {
    await page.goto('/nft/golden-beat-207')
    await waitForMocks(page)
    await visible(page.getByRole('button', { name: /^Comprar/ })).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(row(page, 'Golden Beat #207')).toHaveCount(1, { timeout: PAGE_LOAD_TIMEOUT })

    await page.reload()
    await waitForMocks(page)
    await expectCartLoaded(page)
    await expect(row(page, 'Golden Beat #207')).toHaveCount(1)
    await expect(summary(page, 'Subtotal')).toHaveText('0.99 ETH')

    // Visitante que tenta finalizar é levado ao login, que devolve ao pagamento.
    await visible(page.getByRole('button', { name: 'Conectar e finalizar' })).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/pagamento')

    // Navegação interna (sem recarregar), para não interromper a junção dos carrinhos.
    await visible(page.getByRole('link', { name: /^Carrinho/ })).first().click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(row(page, 'Golden Beat #207')).toHaveCount(1)
    await expect(row(page, 'Emerald Ape #042')).toHaveCount(1)
    await expect(summary(page, 'Subtotal')).toHaveText('27.82 ETH')
  })
})
