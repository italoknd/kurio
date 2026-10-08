import { api, expect, login, test } from './fixtures'

/**
 * Contratos da API simulada (MSW), exercitados de dentro do navegador.
 * Independem do viewport, então rodam só no projeto desktop.
 */
test.skip(({ isMobile }) => isMobile, 'contratos independem do viewport')

const COLLECTOR = {
  displayName: 'Ana Ribeiro',
  username: 'ana.coleciona',
  profileName: 'ana.coleciona',
  email: 'ana@kurio.dev',
  ensName: 'ana',
  referralCode: 'KURIO-ANA',
  note: '',
}

test.describe('catálogo', () => {
  test('lista paginada com facetas', async ({ app }) => {
    const { status, body } = await api(app, 'GET', '/nfts')
    expect(status).toBe(200)
    expect(body.items).toHaveLength(9)
    expect(body.total).toBe(36)
    expect(body.totalPages).toBe(4)
    expect(body.facets.priceRange).toEqual({ min: '0.02', max: '12.30' })
    expect(body.facets.categories.find((c: any) => c.id === 'arte-digital').count).toBeGreaterThan(0)

    const page2 = await api(app, 'GET', '/nfts?page=2')
    expect(page2.body.items[0].id).not.toBe(body.items[0].id)
  })

  test('filtros combinados, busca, ordenação e resultado vazio', async ({ app }) => {
    const combined = await api(app, 'GET', '/nfts?category=musica&category=jogos&network=ethereum&pageSize=48')
    expect(combined.body.items.length).toBeGreaterThan(0)
    for (const nft of combined.body.items) {
      expect(['musica', 'jogos']).toContain(nft.category)
      expect(nft.network).toBe('ethereum')
    }

    const search = await api(app, 'GET', '/nfts?q=golden')
    expect(search.body.items.length).toBeGreaterThan(0)
    for (const nft of search.body.items) expect(`${nft.name} ${nft.collection}`.toLowerCase()).toContain('golden')

    const sorted = await api(app, 'GET', '/nfts?sort=preco-asc&pageSize=48')
    const prices = sorted.body.items.map((n: any) => Number(n.price))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    const range = await api(app, 'GET', '/nfts?minPrice=1&maxPrice=2&pageSize=48')
    expect(range.body.items.length).toBeGreaterThan(0)

    const empty = await api(app, 'GET', '/nfts?q=nao-existe-nada')
    expect(empty.body).toMatchObject({ items: [], total: 0 })
  })

  test('detalhe por id e NFT inexistente', async ({ app }) => {
    const detail = await api(app, 'GET', '/nfts/emerald-ape-042')
    expect(detail.status).toBe(200)
    expect(detail.body).toMatchObject({ name: 'Emerald Ape #042', price: '1.19', tokenId: '#0042', defaultEditionId: '1-50' })
    expect(detail.body.editions.find((e: any) => e.id === '1-1').available).toBe(0)

    const missing = await api(app, 'GET', '/nfts/nao-existe')
    expect(missing.status).toBe(404)
    expect(missing.body.code).toBe('NOT_FOUND')
  })
})

test.describe('sessão e conta', () => {
  test('login, credencial inválida e sessão expirada', async ({ app }) => {
    const token = await login(app, 'ana')
    expect((await api(app, 'GET', '/auth/session', { token })).body.user.email).toBe('ana@kurio.dev')

    const wrong = await api(app, 'POST', '/auth/login', { body: { email: 'ana@kurio.dev', password: 'errada123' } })
    expect(wrong.status).toBe(401)

    await app.evaluate(() => window.__kurioMocks!.session.expireAll())
    const expired = await api(app, 'GET', '/auth/session', { token })
    expect(expired.status).toBe(401)
    expect(expired.body.code).toBe('UNAUTHENTICATED')
  })

  test('cadastro com validação e conflito', async ({ app }) => {
    const invalid = await api(app, 'POST', '/auth/register', { body: { username: 'A', email: 'x', password: '123' } })
    expect(invalid.status).toBe(422)
    expect(Object.keys(invalid.body.fields).sort()).toEqual(['email', 'password', 'username'])

    const taken = await api(app, 'POST', '/auth/register', {
      body: { username: 'nova.pessoa', email: 'ana@kurio.dev', password: 'Senha1234' },
    })
    expect(taken.status).toBe(409)
    expect(taken.body.reason).toBe('EMAIL_TAKEN')

    const created = await api(app, 'POST', '/auth/register', {
      body: { username: 'nova.pessoa', email: 'nova@kurio.dev', password: 'Senha1234' },
    })
    expect(created.status).toBe(201)
    expect(created.body.user.username).toBe('nova.pessoa')
  })

  test('rotas privadas exigem autenticação', async ({ app }) => {
    for (const path of ['/favorites', '/profile', '/wallets', '/orders']) {
      expect((await api(app, 'GET', path)).status).toBe(401)
    }
  })
})

test.describe('favoritos e perfil', () => {
  test('incluir e remover favorito', async ({ app }) => {
    const token = await login(app, 'bruno')
    expect((await api(app, 'PUT', '/favorites/golden-beat-207', { token })).body.nftIds).toEqual(['golden-beat-207'])
    expect((await api(app, 'DELETE', '/favorites/golden-beat-207', { token })).body.nftIds).toEqual([])
    expect((await api(app, 'PUT', '/favorites/nao-existe', { token })).status).toBe(404)
  })

  test('perfil com conflito, senha e avatar', async ({ app }) => {
    const token = await login(app, 'bruno')
    const conflict = await api(app, 'PATCH', '/profile', {
      token,
      body: { displayName: 'Bruno', username: 'ana.coleciona', email: 'bruno@kurio.dev', ensName: null, walletNickname: 'B' },
    })
    expect(conflict.status).toBe(409)
    expect(conflict.body.fields.username).toBeTruthy()

    const wrongPassword = await api(app, 'POST', '/profile/password', {
      token,
      body: { currentPassword: 'errada', newPassword: 'NovaSenha9' },
    })
    expect(wrongPassword.body.fields.currentPassword).toBe('Senha atual incorreta.')

    const badAvatar = await api(app, 'PUT', '/profile/avatar', { token, body: { dataUrl: 'data:text/plain;base64,AAAA' } })
    expect(badAvatar.status).toBe(422)
  })
})

test.describe('carrinho e cotação', () => {
  test('cotação do carrinho da Ana reproduz os valores do Figma', async ({ app }) => {
    const token = await login(app, 'ana')
    const quote = await api(app, 'GET', '/cart/quote?network=ethereum', { token })
    expect(quote.body).toMatchObject({ subtotal: '26.83', discount: '0.00', networkFee: '0.016', total: '26.846', issues: [] })
  })

  test('cupons válido, inválido e expirado', async ({ app }) => {
    const token = await login(app, 'ana')
    const invalid = await api(app, 'PUT', '/cart/coupon', { token, body: { code: 'NAOEXISTE' } })
    expect(invalid.status).toBe(422)
    expect(invalid.body.fields.code).toContain('inválido')

    const expired = await api(app, 'PUT', '/cart/coupon', { token, body: { code: 'expirado' } })
    expect(expired.body.fields.code).toContain('expirou')

    expect((await api(app, 'PUT', '/cart/coupon', { token, body: { code: 'kurio10' } })).status).toBe(200)
    const quote = await api(app, 'GET', '/cart/quote?network=ethereum', { token })
    expect(quote.body).toMatchObject({ discount: '2.683', total: '24.163', coupon: { code: 'KURIO10' } })
  })

  test('visitante respeita limite da edição e mantém itens ao autenticar', async ({ app }) => {
    const guest = await api(app, 'GET', '/cart')
    const headers = { 'X-Cart-Id': guest.body.id }

    const tooMany = await api(app, 'POST', '/cart/items', { headers, body: { nftId: 'neon-vessel-552', editionId: '1-10', quantity: 3 } })
    expect(tooMany.status).toBe(409)
    expect(tooMany.body.reason).toBe('INSUFFICIENT_AVAILABILITY')

    const soldOut = await api(app, 'POST', '/cart/items', { headers, body: { nftId: 'emerald-ape-042', editionId: '1-1', quantity: 1 } })
    expect(soldOut.body.reason).toBe('EDITION_SOLD_OUT')

    const added = await api(app, 'POST', '/cart/items', { headers, body: { nftId: 'golden-beat-207', editionId: '1-50', quantity: 2 } })
    expect(added.status).toBe(201)

    const token = await login(app, 'bruno')
    const merged = await api(app, 'POST', '/cart/merge', { token, body: { guestCartId: guest.body.id } })
    expect(merged.body.items).toHaveLength(1)
    expect(merged.body.items[0]).toMatchObject({ nftId: 'golden-beat-207', quantity: 2 })
  })
})

test.describe('pedidos', () => {
  async function prepareOrder(app: Parameters<typeof login>[0]) {
    const token = await login(app, 'ana')
    const quote = await api(app, 'GET', '/cart/quote?network=ethereum', { token })
    const body = { quoteId: quote.body.id, network: 'ethereum', walletId: 'wal_ana_principal', collector: COLLECTOR }
    return { token, body }
  }

  test('criação idempotente e conflito de chave reutilizada', async ({ app }) => {
    const { token, body } = await prepareOrder(app)
    const headers = { 'Idempotency-Key': 'compra-1' }
    const first = await api(app, 'POST', '/orders', { token, headers, body })
    expect(first.status).toBe(201)
    expect(first.body.status).toBe('pending')

    const retry = await api(app, 'POST', '/orders', { token, headers, body })
    expect(retry.status).toBe(200)
    expect(retry.body.id).toBe(first.body.id)

    const reused = await api(app, 'POST', '/orders', { token, headers, body: { ...body, network: 'polygon' } })
    expect(reused.status).toBe(409)
    expect(reused.body.reason).toBe('IDEMPOTENCY_KEY_REUSED')
  })

  test('preço alterado invalida a cotação revisada', async ({ app }) => {
    const { token, body } = await prepareOrder(app)
    await app.evaluate(() => window.__kurioMocks!.nfts.update('emerald-ape-042', { editionId: '1-50', price: '1.25' }))
    const outdated = await api(app, 'POST', '/orders', { token, headers: { 'Idempotency-Key': 'k' }, body })
    expect(outdated.status).toBe(409)
    expect(outdated.body.reason).toBe('QUOTE_OUTDATED')
    expect(outdated.body.details.quote.total).toBe('26.966')
  })

  test('pedido confirmado remove só os itens comprados e baixa o estoque', async ({ app }) => {
    const { token, body } = await prepareOrder(app)
    const created = await api(app, 'POST', '/orders', { token, headers: { 'Idempotency-Key': 'ok' }, body })
    await app.evaluate((id) => window.__kurioMocks!.orders.process(id), created.body.id)

    const order = await api(app, 'GET', `/orders/${created.body.id}`, { token })
    expect(order.body.status).toBe('confirmed')
    expect(order.body.transaction.hash).toMatch(/^0x[0-9a-f]{32}$/)
    expect(order.body.total).toBe('26.846')

    expect((await api(app, 'GET', '/cart', { token })).body.items).toHaveLength(0)
    const nft = await api(app, 'GET', '/nfts/emerald-ape-042')
    expect(nft.body.editions.find((e: any) => e.id === '1-50').available).toBe(30)

    const bruno = await login(app, 'bruno')
    expect((await api(app, 'GET', `/orders/${created.body.id}`, { token: bruno })).status).toBe(404)
  })

  test('pagamento recusado preserva o carrinho', async ({ app }) => {
    await app.evaluate(() => window.__kurioMocks!.setConfig({ payment: 'recusar' }))
    const { token, body } = await prepareOrder(app)
    const created = await api(app, 'POST', '/orders', { token, headers: { 'Idempotency-Key': 'nok' }, body })
    await app.evaluate((id) => window.__kurioMocks!.orders.process(id), created.body.id)

    const order = await api(app, 'GET', `/orders/${created.body.id}`, { token })
    expect(order.body).toMatchObject({ status: 'rejected', transaction: null })
    expect((await api(app, 'GET', '/cart', { token })).body.items).toHaveLength(3)
  })

  test('timeout após criação é recuperado pela chave de idempotência', async ({ app }) => {
    const { token, body } = await prepareOrder(app)
    await app.evaluate(() => window.__kurioMocks!.orders.timeoutNextCreate())
    const headers = { 'Idempotency-Key': 'timeout-1' }

    const timedOut = await api(app, 'POST', '/orders', { token, headers, body, abortAfterMs: 1000 })
    expect(timedOut.status).toBe(0)

    const recovered = await api(app, 'POST', '/orders', { token, headers, body })
    expect(recovered.status).toBe(200)
    const orders = await api(app, 'GET', '/orders', { token })
    expect(orders.body).toHaveLength(1)
    expect(orders.body[0].id).toBe(recovered.body.id)
  })
})

test.describe('cenários de rede e eventos', () => {
  test('falha forçada e versão do evento de NFT', async ({ app }) => {
    await app.evaluate(() => window.__kurioMocks!.failNext('GET', '/api/nfts', 503))
    expect((await api(app, 'GET', '/nfts')).status).toBe(503)
    expect((await api(app, 'GET', '/nfts')).status).toBe(200)

    const event = await app.evaluate(() => window.__kurioMocks!.nfts.update('golden-beat-207', { available: 0 }))
    expect(event).toMatchObject({ type: 'nft.updated', resource: { type: 'nft', id: 'golden-beat-207' }, version: 2 })
    expect(event.data.available).toBe(false)
  })
})
