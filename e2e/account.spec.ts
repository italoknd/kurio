import type { Page } from '@playwright/test'
import { PAGE_LOAD_TIMEOUT, signInAs } from './cart-helpers'
import { expect, test, waitForMocks } from './fixtures'

/**
 * Áreas extras do colecionador: atividade (histórico de pedidos), ofertas, arquivos
 * baixados e suporte. A Ana tem histórico nas fixtures (um pedido confirmado, um
 * recusado e um chamado respondido); o Bruno não tem nada.
 */

test.describe.configure({ timeout: 60_000 })

function orderRows(page: Page) {
  return page.getByRole('list').filter({ has: page.getByRole('link', { name: /Ver (recibo|pedido)/ }) }).getByRole('listitem')
}

test.describe('área do colecionador', () => {
  test('menu do perfil leva a todas as seções', async ({ page }) => {
    await signInAs(page, 'ana', '/perfil')
    const menu = page.getByRole('navigation', { name: 'Área do colecionador' })
    await expect(menu).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    for (const [label, path] of [
      ['Atividade', '/perfil/atividade'],
      ['Ofertas', '/perfil/ofertas'],
      ['Arquivos baixados', '/perfil/arquivos'],
      ['Suporte', '/perfil/suporte'],
    ]) {
      await menu.getByRole('link', { name: label }).click()
      await expect(page).toHaveURL((url) => url.pathname === path)
      await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible()
    }
  })

  test('atividade: histórico com filtro de status na URL e acesso ao recibo', async ({ page }) => {
    await signInAs(page, 'ana', '/perfil/atividade')
    await expect(orderRows(page)).toHaveCount(2, { timeout: PAGE_LOAD_TIMEOUT })

    await page.getByRole('link', { name: 'Recusados' }).click()
    await expect(page).toHaveURL(/status=recusados/)
    await expect(orderRows(page)).toHaveCount(1)
    await expect(orderRows(page).first()).toContainText('Neon Vessel #552')
    await expect(orderRows(page).first()).toContainText('Recusado')

    await page.reload()
    await waitForMocks(page)
    await expect(orderRows(page)).toHaveCount(1, { timeout: PAGE_LOAD_TIMEOUT })

    await page.getByRole('link', { name: 'Confirmados' }).click()
    await orderRows(page).first().getByRole('link', { name: /Ver recibo/ }).click()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await expect(page.getByRole('cell', { name: /Golden Signal #160/ })).toBeVisible()
  })

  test('atividade vazia para quem ainda não comprou', async ({ page }) => {
    await signInAs(page, 'bruno', '/perfil/atividade')
    await expect(page.getByText('Você ainda não fez nenhum pedido.')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })

  test('ofertas: cupons vigentes e expirado, uso no carrinho e preços reduzidos', async ({ page }) => {
    await signInAs(page, 'ana', '/perfil/ofertas')
    await expect(page.getByText('KURIO10')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await expect(page.getByRole('button', { name: 'Usar o cupom EXPIRADO no carrinho' })).toBeDisabled()
    await expect(page.getByRole('region', { name: 'Preço reduzido' }).getByRole('link', { name: 'Neon Vessel #552' })).toBeVisible()

    await page.getByRole('button', { name: 'Usar o cupom KURIO10 no carrinho' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByRole('region', { name: 'Resumo da carteira' }).getByText('Desconto (KURIO10)')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })

  test('ofertas: copiar código do cupom', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await signInAs(page, 'ana', '/perfil/ofertas')
    await page.getByRole('button', { name: 'Copiar código LANCAMENTO' }).click({ timeout: PAGE_LOAD_TIMEOUT })
    await expect(page.getByText('Código LANCAMENTO copiado.')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('LANCAMENTO')
  })

  test('arquivos baixados: arte dos NFTs comprados e download do arquivo', async ({ page }) => {
    await signInAs(page, 'ana', '/perfil/arquivos')
    const download = page.getByRole('link', { name: 'Baixar arte (WebP): Golden Signal #160, edição 1/50' })
    await expect(download).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await expect(page.getByRole('link', { name: 'Baixar arte (WebP): Cosmic Bloom #118, edição 1/10' })).toBeVisible()

    const [file] = await Promise.all([page.waitForEvent('download'), download.click()])
    expect(file.suggestedFilename()).toBe('golden-signal-160-1-50.webp')
  })

  test('arquivos baixados vazios para quem ainda não comprou', async ({ page }) => {
    await signInAs(page, 'bruno', '/perfil/arquivos')
    await expect(page.getByText('Nenhum arquivo disponível ainda.')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })

  test('suporte: perguntas frequentes, chamado com validação e histórico persistente', async ({ page }) => {
    await signInAs(page, 'ana', '/perfil/suporte')
    const tickets = page.getByRole('region', { name: 'Meus chamados' })
    await expect(tickets.getByRole('listitem', { name: 'Chamado KUR-20260927-0001' })).toContainText('Respondido', { timeout: PAGE_LOAD_TIMEOUT })
    await expect(tickets.getByText('Resposta da equipe Kurio', { exact: false })).toBeVisible()

    await page.getByText('Como uso um cupom?').click()
    await expect(page.getByText(/Aplique o código no resumo do carrinho/)).toBeVisible()

    const form = page.getByRole('form', { name: 'Abrir chamado' })
    await form.getByRole('button', { name: 'Enviar chamado' }).click()
    await expect(form.getByText('Selecione o assunto do chamado.')).toBeVisible()
    await expect(form.getByText('Descreva o assunto com pelo menos 5 caracteres.')).toBeVisible()
    await expect(form.getByText('Conte o que aconteceu com pelo menos 20 caracteres.')).toBeVisible()

    await form.getByRole('combobox', { name: 'Assunto' }).click()
    await page.getByRole('option', { name: 'Pedido ou pagamento' }).click()
    await form.getByRole('combobox', { name: 'Pedido relacionado (opcional)' }).click()
    await page.getByRole('option', { name: /ord_seed_ana_1/ }).click()
    await form.getByRole('textbox', { name: 'Título' }).fill('Dúvida sobre a arte desbloqueável')
    await form.getByRole('textbox', { name: 'Mensagem' }).fill('Consigo baixar a arte do Golden Signal em resolução maior?')
    await form.getByRole('button', { name: 'Enviar chamado' }).click()

    await expect(page.getByText(/Chamado KUR-\d{8}-\d{4} aberto/)).toBeVisible()
    const created = tickets.getByRole('listitem').filter({ hasText: 'Dúvida sobre a arte desbloqueável' })
    await expect(created).toContainText('Em análise')
    await expect(created).toContainText('Pedido ord_seed_ana_1')

    await page.reload()
    await waitForMocks(page)
    await expect(tickets.getByRole('listitem').filter({ hasText: 'Dúvida sobre a arte desbloqueável' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  })
})
