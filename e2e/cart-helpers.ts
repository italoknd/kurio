import type { Locator, Page } from '@playwright/test'
import { expect, login, USERS, waitForMocks } from './fixtures'

/** Helpers dos specs que usam a tela do carrinho. */

/** Abre o carrinho já autenticado como o usuário (token gravado antes de carregar o app). */
export async function openCartAs(page: Page, user: keyof typeof USERS) {
  await signInAs(page, user, '/carrinho')
  await expectCartLoaded(page)
}

/** Autentica pela API e abre a página já com a sessão (token gravado antes de carregar o app). */
export async function signInAs(page: Page, user: keyof typeof USERS, path: string) {
  await page.goto(path)
  await waitForMocks(page)
  const token = await login(page, user)
  await page.evaluate((value) => localStorage.setItem('kurio:session-token', value), token)
  await page.reload()
  await waitForMocks(page)
}

export async function openCart(page: Page) {
  await page.goto('/carrinho')
  await waitForMocks(page)
  await expectCartLoaded(page)
}

/** Primeira renderização após um carregamento completo (mais lenta com vários workers). */
export async function expectCartLoaded(page: Page) {
  const loaded = page.getByRole('region', { name: 'Resumo da carteira' }).or(page.getByRole('heading', { name: 'Seu carrinho está vazio' }))
  await expect(loaded).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
}

export const PAGE_LOAD_TIMEOUT = 15_000

export function row(page: Page, name: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('link', { name, exact: true }) })
}

/** Valor de uma linha do resumo pelo início do rótulo (Subtotal, Desconto, Taxa de rede, Total). */
export function summary(page: Page, label: string) {
  const startsWith = new RegExp(`^${label.replace(/[()]/g, '\\$&')}`)
  return page
    .getByRole('region', { name: 'Resumo da carteira' })
    .locator('dl > div, dl > div > div')
    .filter({ has: page.locator('dt', { hasText: startsWith }) })
    .locator('dd')
}

export function visible(locator: Locator) {
  return locator.locator('visible=true')
}
