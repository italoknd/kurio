import { expect, test, waitForMocks } from './fixtures'

test.describe('fundação', () => {
  test('a API simulada responde pelo MSW', async ({ app }) => {
    const body = await app.evaluate(async () => (await fetch('/api/health')).json())
    expect(body).toEqual({ status: 'ok' })
  })

  test('o perfil de rede "offline" faz as requisições falharem', async ({ app }) => {
    await app.evaluate(() => window.__kurioMocks!.setConfig({ network: 'offline' }))
    const failed = await app.evaluate(() =>
      fetch('/api/health').then(
        () => false,
        () => true,
      ),
    )
    expect(failed).toBe(true)
  })

  test('o cliente Socket.IO conecta, avisa a queda e reconecta', async ({ app }) => {
    await expect.poll(() => app.evaluate(() => window.__kurioMocks!.socket.connectedCount())).toBe(1)

    await app.evaluate(() => window.__kurioMocks!.socket.setAvailable(false))
    await expect(app.getByRole('status').filter({ hasText: 'Reconectando' })).toBeVisible()

    await app.evaluate(() => window.__kurioMocks!.socket.setAvailable(true))
    await expect(app.getByText('Reconectando')).toBeHidden({ timeout: 10_000 })
    await expect.poll(() => app.evaluate(() => window.__kurioMocks!.socket.connectedCount())).toBe(1)
  })

  test('rota inexistente exibe a página 404', async ({ page }) => {
    await page.goto('/rota-que-nao-existe')
    await waitForMocks(page)
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('acesso direto a uma rota prevista funciona', async ({ page }) => {
    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeVisible()
  })
})
