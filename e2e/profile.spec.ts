import type { Page } from '@playwright/test'
import { PAGE_LOAD_TIMEOUT, signInAs } from './cart-helpers'
import { api, expect, test, waitForMocks } from './fixtures'

/**
 * Perfil e carteiras (enunciado §9, item 8): edição do perfil com validação e
 * conflito, avatar (tipo e tamanho), senha e carteiras principal e secundária,
 * com persistência após refresh.
 */

test.describe.configure({ timeout: 60_000 })

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

function field(page: Page, name: string) {
  return page.getByRole('textbox', { name, exact: true })
}

async function openProfile(page: Page, user: 'ana' | 'bruno', path = '/perfil') {
  await signInAs(page, user, path)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
}

async function choose(page: Page, label: string, option: string, scope = page.locator('body')) {
  await scope.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option }).click()
}

test.describe('perfil', () => {
  test('edita os dados com validação, conflito e persistência', async ({ page, isMobile }) => {
    await openProfile(page, 'ana')
    await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Ribeiro', { timeout: PAGE_LOAD_TIMEOUT })

    await field(page, 'Nome de exibição').fill('A')
    await field(page, 'E-mail').fill('bruno@kurio.dev')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Informe um nome de exibição com pelo menos 2 caracteres.')).toBeVisible()

    await field(page, 'Nome de exibição').fill('Ana R.')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(field(page, 'E-mail')).toHaveAccessibleDescription('Este e-mail já está em uso por outra conta.')

    await field(page, 'E-mail').fill('ana.ribeiro@kurio.dev')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    if (!isMobile) await expect(page.getByRole('button', { name: 'Conta de Ana R.' })).toBeVisible()

    await page.reload()
    await waitForMocks(page)
    await expect(field(page, 'Nome de exibição')).toHaveValue('Ana R.', { timeout: PAGE_LOAD_TIMEOUT })
    await expect(field(page, 'E-mail')).toHaveValue('ana.ribeiro@kurio.dev')
  })

  test('avatar: recusa tipo e tamanho inválidos, altera e remove', async ({ page }) => {
    await openProfile(page, 'ana')
    const input = page.getByTestId('avatar-input')
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

    await input.setInputFiles({ name: 'animado.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
    await expect(page.getByRole('alert').filter({ hasText: 'Envie uma imagem PNG, JPEG ou WebP.' })).toBeVisible()

    await input.setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(1_100_000) })
    await expect(page.getByRole('alert').filter({ hasText: 'A imagem deve ter no máximo 1 MB.' })).toBeVisible()

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1PX })
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
  })

  test('altera a senha com validação e erro da API', async ({ page }) => {
    await openProfile(page, 'ana')
    const change = page.getByRole('button', { name: 'Alterar senha' })

    await page.getByLabel('Senha atual', { exact: true }).fill('senha-errada1')
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha#2')
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('OutraSenha#3')
    await change.click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha#2')
    await change.click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

    await page.getByLabel('Senha atual', { exact: true }).fill('Colecione#1')
    await change.click()
    await expect(page.getByText('Senha alterada.')).toBeVisible()

    const withNew = await api(page, 'POST', '/auth/login', { body: { email: 'ana@kurio.dev', password: 'NovaSenha#2' } })
    expect(withNew.status).toBe(200)
    const withOld = await api(page, 'POST', '/auth/login', { body: { email: 'ana@kurio.dev', password: 'Colecione#1' } })
    expect(withOld.status).toBe(401)
  })
})

test.describe('carteiras', () => {
  test('cadastra principal e secundária "igual à principal" e persiste', async ({ page }) => {
    await openProfile(page, 'bruno', '/perfil/carteiras')
    await expect(page.getByText('Você ainda não adicionou uma carteira principal.')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

    await page.getByRole('button', { name: 'Adicionar carteira principal' }).click()
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText('Selecione uma rede.')).toBeVisible()
    await expect(primary.getByText('Informe um endereço 0x com 40 caracteres hexadecimais.')).toBeVisible()

    await primary.getByRole('textbox', { name: 'Nome de exibição' }).fill('Bruno Lima')
    await primary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Cofre do Bruno')
    await choose(page, 'Rede', 'Ethereum', primary)
    await primary.getByRole('textbox', { name: 'Nome do perfil' }).fill('bruno.coleciona')
    await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x12345')
    await choose(page, 'Tipo de carteira', 'MetaMask', primary)
    await primary.getByRole('textbox', { name: 'Código de indicação' }).fill('KURIO-BRUNO')
    await primary.getByRole('textbox', { name: 'E-mail' }).fill('bruno@kurio.dev')
    await primary.getByRole('textbox', { name: 'Nome ENS' }).fill('bruno')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByRole('textbox', { name: 'Endereço da carteira' })).toHaveAccessibleDescription(
      'Informe um endereço 0x com 40 caracteres hexadecimais.',
    )

    await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill(`0x${'ab'.repeat(20)}`)
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.')).toBeVisible()

    await page.getByRole('button', { name: 'Adicionar carteira secundária' }).click()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await secondary.getByRole('checkbox', { name: 'Igual à carteira principal' }).click()
    await expect(secondary.getByRole('textbox', { name: 'Endereço da carteira' })).toHaveValue(`0x${'ab'.repeat(20)}`)
    await expect(secondary.getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue('Cofre do Bruno (secundária)')
    await choose(page, 'Rede', 'Polygon', secondary)
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.')).toBeVisible()

    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByRole('combobox', { name: 'Rede' })).toHaveText('Polygon', {
      timeout: PAGE_LOAD_TIMEOUT,
    })
    await expect(page.getByRole('form', { name: 'Carteira principal' }).getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue(
      'Cofre do Bruno',
    )
  })

  test('edita a carteira principal existente', async ({ page }) => {
    await openProfile(page, 'ana', '/perfil/carteiras')
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    const nickname = primary.getByRole('textbox', { name: 'Apelido da carteira' })
    await expect(nickname).toHaveValue('Principal', { timeout: PAGE_LOAD_TIMEOUT })

    await nickname.fill('Cofre principal')
    await primary.getByRole('textbox', { name: 'E-mail' }).fill('ana@')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText('Informe um e-mail válido.')).toBeVisible()

    await primary.getByRole('textbox', { name: 'E-mail' }).fill('ana@kurio.dev')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.')).toBeVisible()

    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('form', { name: 'Carteira principal' }).getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue(
      'Cofre principal',
      { timeout: PAGE_LOAD_TIMEOUT },
    )
  })
})
