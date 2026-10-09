import type { Page } from '@playwright/test'
import { expect, test, USERS, waitForMocks } from './fixtures'

/**
 * Fluxos de conta e sessão (enunciado §9, item 3): cadastro, login, expiração de
 * sessão, logout e troca de usuário, com validação e retorno ao fluxo anterior.
 */

/** Compara só o caminho da URL (evita casar com `?redirect=/perfil`). */
function atPath(path: string) {
  return (url: URL) => url.pathname === path
}

/** Abre o login: modal pelo header no desktop, página /entrar no mobile. */
async function openLogin(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.goto('/entrar')
  } else {
    await page.getByRole('link', { name: 'Entrar' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  }
  await waitForMocks(page)
}

async function fillLogin(page: Page, user: keyof typeof USERS) {
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS[user].email)
  await page.getByLabel('Senha', { exact: true }).fill(USERS[user].password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function expectSignedIn(page: Page, isMobile: boolean, name: string) {
  await expect(page.getByText(`Olá, ${name}!`)).toBeVisible()
  if (!isMobile) await expect(page.getByRole('button', { name: `Conta de ${name}` })).toBeVisible()
}

test.describe('conta e sessão', () => {
  test('login valida campos, recusa credencial errada e mantém a sessão após refresh', async ({ app, isMobile }) => {
    await openLogin(app, isMobile)

    await app.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(app.getByText('Informe seu e-mail.')).toBeVisible()
    await expect(app.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveAttribute('aria-invalid', 'true')

    await app.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@kurio.dev')
    await app.getByLabel('Senha', { exact: true }).fill('senha-errada1')
    await app.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(app.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

    await fillLogin(app, 'ana')
    await expectSignedIn(app, isMobile, 'Ana Ribeiro')

    await app.reload()
    await waitForMocks(app)
    await app.goto('/perfil')
    await expect(app).toHaveURL(atPath('/perfil'))
    await expect(app.getByRole('main').getByRole('heading', { name: 'Meu perfil' })).toBeVisible()
  })

  test('cadastro trata conflito de e-mail e autentica a nova conta', async ({ page, isMobile }) => {
    await page.goto('/cadastro')
    await waitForMocks(page)

    await page.getByRole('textbox', { name: 'Nome de usuário' }).fill('nova.colecionadora')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@kurio.dev')
    await page.getByLabel('Senha', { exact: true }).fill('Senha1234')
    await page.getByLabel('Confirmar senha').fill('Senha9999')
    await page.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    await page.getByLabel('Confirmar senha').fill('Senha1234')
    await page.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page.getByText('Este e-mail já está cadastrado. Faça login ou use outro e-mail.')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toBeFocused()

    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('nova@kurio.dev')
    await page.getByRole('button', { name: 'Criar perfil' }).click()
    await expectSignedIn(page, isMobile, 'nova.colecionadora')
  })

  test('rota privada leva ao login e retorna ao destino após autenticar', async ({ page }) => {
    await page.goto('/perfil/carteiras')
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fperfil%2Fcarteiras/)
    await waitForMocks(page)

    await fillLogin(page, 'ana')
    await expect(page).toHaveURL(atPath('/perfil/carteiras'))
  })

  test('sessão expirada durante a navegação preserva o destino', async ({ page }) => {
    await page.goto('/entrar?redirect=/perfil')
    await waitForMocks(page)
    await fillLogin(page, 'ana')
    // A URL muda antes da guarda concluir: espera a página privada renderizar de fato.
    await expect(page.getByRole('main').getByRole('heading', { name: 'Meu perfil' })).toBeVisible()

    await page.evaluate(() => window.__kurioMocks!.session.expireAll())
    await page.getByRole('link', { name: 'Carteiras' }).first().click()

    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fperfil%2Fcarteiras&motivo=expirada/)
    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()

    await fillLogin(page, 'ana')
    await expect(page).toHaveURL(atPath('/perfil/carteiras'))
  })

  test('logout limpa a sessão e permite trocar de usuário', async ({ page, isMobile }) => {
    await page.goto('/entrar?redirect=/perfil')
    await waitForMocks(page)
    await fillLogin(page, 'ana')
    await expect(page).toHaveURL(atPath('/perfil'))

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(atPath('/'))
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).toBeNull()

    await page.goto('/perfil')
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fperfil/)
    await waitForMocks(page)
    await fillLogin(page, 'bruno')
    await expectSignedIn(page, isMobile, 'Bruno Lima')
    await expect.poll(() => page.evaluate(() => window.__kurioMocks!.socket.connectedUsers())).toEqual(['usr_bruno'])
  })

  test('modal de login prende o foco e fecha com Esc', async ({ app, isMobile }) => {
    test.skip(isMobile, 'o modal existe apenas no desktop')
    const trigger = app.getByRole('link', { name: 'Entrar' })
    await trigger.click()
    const dialog = app.getByRole('dialog')
    await expect(dialog).toBeVisible()

    for (let i = 0; i < 12; i++) {
      await app.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }

    await app.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(app).not.toHaveURL(/auth=/)
  })
})

test.describe('login social (simulado)', () => {
  test('visitante finaliza a compra entrando com Google: conta criada e carrinho preservado', async ({ page }) => {
    await page.goto('/nft/golden-beat-207')
    await waitForMocks(page)
    await page.getByRole('button', { name: /^Comprar/ }).locator('visible=true').click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).locator('visible=true').click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await waitForMocks(page)

    await page.getByRole('button', { name: 'Continuar com Google' }).click()
    const consent = page.getByRole('dialog', { name: 'Continuar com Google' })
    await expect(consent).toBeVisible()
    await expect(consent.getByRole('textbox', { name: 'E-mail da conta Google' })).toHaveValue('colecionador.google@exemplo.com')
    await consent.getByRole('button', { name: 'Autorizar e continuar' }).click()

    // Volta ao pagamento autenticado, com o item do visitante; conta nova ainda sem carteira.
    await expect(page).toHaveURL(atPath('/pagamento'))
    await expect(page.getByText('Olá, Colecionador Google!')).toBeVisible()
    await expect(page.getByText('Golden Beat #207').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cadastrar carteira' })).toBeVisible()
  })

  test('com o e-mail de uma conta existente, entra nela', async ({ page, isMobile }) => {
    await page.goto('/entrar')
    await waitForMocks(page)
    await page.getByRole('button', { name: 'Continuar com Facebook' }).click()
    const consent = page.getByRole('dialog', { name: 'Continuar com Facebook' })
    await consent.getByRole('textbox', { name: 'E-mail da conta Facebook' }).fill('ana@kurio.dev')
    await consent.getByRole('button', { name: 'Autorizar e continuar' }).click()
    await expectSignedIn(page, isMobile, 'Ana Ribeiro')
  })

  test('provedor nega o acesso: erro exibido e nenhuma sessão criada', async ({ page }) => {
    await page.goto('/entrar')
    await waitForMocks(page)
    await page.evaluate(() => window.__kurioMocks!.setConfig({ socialLogin: 'recusar' }))
    await page.getByRole('button', { name: 'Continuar com Google' }).click()
    const consent = page.getByRole('dialog', { name: 'Continuar com Google' })
    await consent.getByRole('button', { name: 'Autorizar e continuar' }).click()
    await expect(consent.getByRole('alert')).toHaveText('O acesso foi negado no Google.')
    expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).toBeNull()

    await consent.getByRole('button', { name: 'Cancelar' }).click()
    await expect(consent).toBeHidden()
  })
})
