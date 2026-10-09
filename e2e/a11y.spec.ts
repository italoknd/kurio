import type { Page } from '@playwright/test'
import { PAGE_LOAD_TIMEOUT, signInAs } from './cart-helpers'
import { expect, test, waitForMocks } from './fixtures'

/**
 * Acessibilidade (enunciado §9, item 11): navegação por teclado, foco preso e
 * devolvido em diálogos, e telas sem rolagem horizontal nas larguras exigidas.
 */

test.describe.configure({ timeout: 60_000 })

/** Pressiona Tab várias vezes e devolve se o foco ficou sempre dentro do diálogo. */
async function focusStaysInDialog(page: Page, presses = 25) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)
    if (!inside) return false
  }
  return true
}

test.describe('teclado e foco', () => {
  test('"Pular para o conteúdo" leva o foco ao conteúdo principal', async ({ page }) => {
    await page.goto('/')
    await waitForMocks(page)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#conteudo')).toBeFocused()
  })

  test('modal de login prende o foco, fecha com Esc e devolve o foco', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No mobile o login é a página /entrar (sem modal).')
    await page.goto('/')
    await waitForMocks(page)
    const trigger = page.getByRole('link', { name: 'Entrar' })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await expect(dialog.getByRole('textbox', { name: 'E-mail', exact: true })).toBeFocused()
    expect(await focusStaysInDialog(page)).toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('compra pelo teclado: quantidade, comprar e revisão com foco preso', async ({ page }) => {
    await signInAs(page, 'ana', '/nft/golden-beat-207')
    const plus = page.getByRole('button', { name: 'Aumentar quantidade de Golden Beat #207' }).locator('visible=true')
    await expect(plus).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await plus.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('group', { name: 'Quantidade de Golden Beat #207' }).locator('visible=true').getByRole('status')).toHaveText('2')

    await page.getByRole('button', { name: /^Comprar/ }).locator('visible=true').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/carrinho$/)

    const finish = page.getByRole('button', { name: 'Conectar e finalizar' }).locator('visible=true')
    await expect(finish).toBeEnabled({ timeout: PAGE_LOAD_TIMEOUT })
    await finish.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/pagamento$/)

    const confirm = page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true')
    await expect(confirm).toBeEnabled({ timeout: PAGE_LOAD_TIMEOUT })
    await confirm.focus()
    await page.keyboard.press('Enter')
    const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(review).toBeVisible()
    expect(await focusStaysInDialog(page)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(review).toBeHidden()
  })
})

const PAGES = [
  { path: '/', ready: (page: Page) => page.locator('#catalogo-resultados').getByRole('article').first() },
  { path: '/nft/emerald-ape-042', ready: (page: Page) => page.getByRole('heading', { level: 1 }) },
  { path: '/carrinho', ready: (page: Page) => page.getByRole('region', { name: 'Resumo da carteira' }) },
  { path: '/pagamento', ready: (page: Page) => page.getByRole('button', { name: 'Confirmar compra' }).first() },
  { path: '/perfil', ready: (page: Page) => page.getByRole('heading', { name: 'Perfil do colecionador' }) },
  { path: '/perfil/carteiras', ready: (page: Page) => page.getByRole('form', { name: 'Carteira principal' }) },
  { path: '/entrar', ready: (page: Page) => page.getByRole('button', { name: 'Entrar', exact: true }) },
]

// 640 px equivale ao zoom de 200% em uma tela de 1280 px.
const WIDTHS = [390, 640, 768, 1440]

test.describe('sem rolagem horizontal', () => {
  test('todas as telas em 390, 640 (zoom 200%), 768 e 1440 px', async ({ page, isMobile }) => {
    test.skip(isMobile, 'As larguras são definidas no próprio teste.')
    test.setTimeout(120_000)
    await signInAs(page, 'ana', '/')
    for (const { path, ready } of PAGES) {
      if (path === '/entrar') {
        await page.evaluate(() => localStorage.removeItem('kurio:session-token'))
      }
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await waitForMocks(page)
        await expect(ready(page)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${path} em ${width}px`).toBeLessThanOrEqual(0)
      }
    }
  })
})
