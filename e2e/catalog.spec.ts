import type { Page } from '@playwright/test'
import { expect, test, waitForMocks } from './fixtures'

/**
 * Catálogo (enunciado §9, itens 1 e 12): busca, filtros combinados, ordenação,
 * paginação, restauração pelo histórico, respostas fora de ordem, skeletons,
 * falha e nova tentativa.
 */

const results = (page: Page) => page.locator('#catalogo-resultados')
const cardNames = (page: Page) => results(page).getByRole('heading', { level: 3 }).allInnerTexts()

/** Aplica um filtro pela sidebar (desktop) ou pelo drawer de filtros (mobile). */
async function toggleFilter(page: Page, isMobile: boolean, name: RegExp) {
  if (isMobile) {
    await page.getByRole('button', { name: /^Filtros/ }).first().click()
    await page.getByRole('dialog').getByRole('checkbox', { name }).click()
    await page.keyboard.press('Escape')
  } else {
    await page.getByRole('complementary', { name: 'Filtros do catálogo' }).getByRole('checkbox', { name }).click()
  }
}

async function expectCards(page: Page) {
  await expect(results(page).getByRole('article').first()).toBeVisible()
}

/** Espera a consulta atual terminar (o status anunciado deixa de ser "Carregando"). */
async function settled(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: /NFTs encontrados/ })).toBeAttached()
  await expect(results(page).locator('[aria-busy="true"]')).toHaveCount(0)
}

test.describe('catálogo', () => {
  test('filtros combinados, ordenação, paginação e histórico', async ({ app, isMobile }) => {
    await expectCards(app)
    const page1 = await cardNames(app)
    expect(page1).toHaveLength(9)

    await app.getByRole('button', { name: 'Página 2' }).click()
    await expect(app).toHaveURL(/pagina=2/)
    // Enquanto a página 2 carrega, a página 1 continua visível (dados anteriores).
    await expect.poll(async () => (await cardNames(app)).join()).not.toBe(page1.join())
    const page2 = await cardNames(app)

    // Filtro novo reinicia a paginação.
    await toggleFilter(app, isMobile, /^Música/)
    await expect(app).toHaveURL(/categoria=musica/)
    await expect(app).not.toHaveURL(/pagina=/)
    await toggleFilter(app, isMobile, /^Jogos/)
    await toggleFilter(app, isMobile, /^Ethereum/)
    await expect(app).toHaveURL(/categoria=musica%2Cjogos&rede=ethereum|rede=ethereum.*categoria=musica%2Cjogos/)
    await settled(app)
    // Os 5 NFTs de música/jogos na Ethereum (fixtures determinísticas).
    await expect.poll(async () => (await cardNames(app)).length).toBe(5)
    const filtered = await cardNames(app)
    expect(filtered).not.toEqual(page2)

    await app.getByRole('combobox', { name: 'Ordenar por:' }).click()
    await app.getByRole('option', { name: 'Menor preço' }).click()
    await expect(app).toHaveURL(/ordem=preco-asc/)
    await expect.poll(async () => (await cardNames(app)).join()).not.toBe(filtered.join())

    // Refresh mantém o estado da URL.
    await app.reload()
    await waitForMocks(app)
    await expectCards(app)
    await expect(app).toHaveURL(/ordem=preco-asc/)
    if (!isMobile) {
      await expect(app.getByRole('complementary', { name: 'Filtros do catálogo' }).getByRole('checkbox', { name: /^Música/ })).toHaveAttribute('aria-checked', 'true')
    }

    // Voltar no histórico desfaz a ordenação e depois os filtros.
    await app.goBack()
    await expect(app).not.toHaveURL(/ordem=/)
    await app.goBack()
    await app.goBack()
    await app.goBack()
    await expect(app).toHaveURL(/pagina=2/)
    await expect.poll(() => cardNames(app)).toEqual(page2)
  })

  test('busca sem resultados e limpeza dos filtros', async ({ app }) => {
    await expectCards(app)
    await app.getByRole('searchbox').first().fill('nada-por-aqui')
    await expect(app.getByText('Nenhum NFT encontrado')).toBeVisible()
    await expect(app).toHaveURL(/q=nada-por-aqui/)

    await app.getByRole('button', { name: 'Limpar busca e filtros' }).click()
    await expectCards(app)
    await expect(app).not.toHaveURL(/q=/)
    await expect(app.getByRole('searchbox').first()).toHaveValue('')
  })

  test('respostas fora de ordem não sobrescrevem a busca atual', async ({ app }) => {
    await expectCards(app)
    await app.evaluate(() => window.__kurioMocks!.setConfig({ network: 'variavel', seed: 3 }))
    const search = app.getByRole('searchbox').first()
    await search.fill('golden')
    await app.waitForTimeout(500)
    await search.fill('ape')
    await expect(app).toHaveURL(/q=ape/)

    await expect.poll(() => cardNames(app), { timeout: 15_000 }).toEqual(expect.arrayContaining([expect.stringMatching(/Ape/)]))
    // Espera a resposta mais lenta (até 3 s) e confirma que nada foi substituído.
    await app.waitForTimeout(3500)
    for (const name of await cardNames(app)) expect(name).toMatch(/Ape/)
  })

  test('skeleton no carregamento lento, falha e nova tentativa', async ({ app }) => {
    await app.evaluate(() => window.__kurioMocks!.setConfig({ network: 'lento' }))
    await app.reload()
    await waitForMocks(app)
    await expect(results(app).locator('[data-slot="skeleton"]').first()).toBeVisible()
    await expectCards(app)

    // Falhas forçadas vivem na página: a nova consulta precisa partir de navegação interna.
    await app.evaluate(() => {
      window.__kurioMocks!.setConfig({ network: 'normal' })
      // Consulta inicial + 2 retries automáticos de falha transitória.
      window.__kurioMocks!.failNext('GET', '/api/nfts', 503, 3)
    })
    await app.getByRole('tab', { name: 'Em alta' }).click()
    const error = app.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(error).toBeVisible({ timeout: 15_000 })

    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expectCards(app)
  })
})
