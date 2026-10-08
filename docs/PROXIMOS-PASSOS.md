# Próximos passos e requisitos pendentes

Checklist vivo do que falta para concluir o desafio, organizado pelas etapas do roteiro e
cruzado com o enunciado ([docs/DESAFIO.md](DESAFIO.md)). O histórico do que já foi feito
está em [docs/PROGRESSO.md](PROGRESSO.md).

**Situação em 08/10/2026:** etapas 0 a 5 concluídas (fundação, contratos e mocks, conta e
sessão, catálogo e detalhe, carrinho e cotação). Próxima: etapa 6 (tempo real).

Legenda: ✅ feito · 🟡 parcial · ⬜ pendente

---

## Etapa 5 — Carrinho e cotação ✅

Tela `/carrinho` concluída (frames desktop-03 e mobile-03). Detalhes em
[PROGRESSO.md](PROGRESSO.md#etapa-5--carrinho-e-cotação).

| Requisito (enunciado §3) | Status | Observação |
| --- | --- | --- |
| Listar itens (imagem, nome, ID do token, edição, preço, total da linha) | ✅ | |
| Alterar quantidade respeitando disponibilidade por NFT e edição | ✅ | Otimista, em série por item, 409 tratado |
| Remover item | ✅ | Toast com "Desfazer" |
| Aplicar e remover cupom, com erro de código inválido/expirado | ✅ | |
| Resumo: subtotal, desconto, taxa de rede e total vindos da API | ✅ | Rede Ethereum até o pagamento |
| Skeleton com shimmer no resumo e na lista | ✅ | |
| Carrinho mantido após refresh | ✅ | |
| Itens do visitante preservados ao autenticar | ✅ | |
| Itens com problema de disponibilidade (`quote.issues`) destacados | ✅ | Bloqueiam "Conectar e finalizar" |
| Estado vazio do carrinho | ✅ | |
| Seção "Colecionadores também viram" | ✅ | |
| "Conectar e finalizar" leva ao pagamento (login se visitante) | ✅ | |
| Versão mobile (lista em cards, cupom e resumo abaixo, botão fixo) | ✅ | Botão acompanha a rolagem |
| Testes E2E (enunciado §9, item 5) | ✅ | `e2e/cart.spec.ts` |

## Etapa 6 — Tempo real (Socket.IO)

Base pronta: cliente autenticado pelo token, reconexão, aviso de queda, servidor simulado
que publica `nft.updated` e `order.updated` com id estável e versão.

| Requisito (enunciado §7) | Status | Observação |
| --- | --- | --- |
| `nft.updated` atualiza preço e disponibilidade no catálogo, detalhe e carrinho | ⬜ | Atualizar caches (`setQueryData`) e invalidar a cotação |
| `order.updated` atualiza o estado do pedido | ⬜ | Cache `['user', id, 'order', orderId]` |
| Tolerar duplicatas e eventos antigos (não regredir versão nem reaplicar efeitos) | ⬜ | Registrar ids vistos e última versão por recurso |
| Reconciliar recursos ativos com a REST após reconexão | ⬜ | Invalidar consultas ativas no evento `connect` (exceto o primeiro) |
| Eventos de sessão anterior não afetam outro usuário | 🟡 | Socket já reconecta com o novo token; falta descartar eventos na troca |
| Liberar listeners e subscriptions ao fim do ciclo de vida | ⬜ | Hook com `socket.off` no cleanup |
| Feedback acessível das alterações (aria-live) | ⬜ | "O preço de X mudou de A para B" |
| Cenário: NFT no carrinho muda de preço → interface avisa e atualiza o resumo | ⬜ | Tela pronta: basta invalidar `['cart']` e a cotação no evento e avisar (aria-live) |
| Checkout impede confirmação com cotação desatualizada | 🟡 | API já responde 409 `QUOTE_OUTDATED`; falta a interface |
| Testes E2E (§9, itens 9 e 10) | ⬜ | Via `window.__kurioMocks.nfts.update`, `socket.replay`, `socket.setAvailable` |

## Etapa 7 — Checkout e pedido

Telas: [desktop-04-pagamento.png](figma/desktop-04-pagamento.png),
[mobile-04-pagamento.png](figma/mobile-04-pagamento.png),
[desktop-05-confirmacao-pedido.png](figma/desktop-05-confirmacao-pedido.png).
Rotas: `/pagamento` e `/pedidos/$orderId` (placeholders, já protegidas).

| Requisito (enunciado §3 e §4) | Status | Observação |
| --- | --- | --- |
| Formulário do colecionador com os campos do layout e validação | ⬜ | react-hook-form + zod; erros da API em `collector.*` |
| Seleção de carteira cadastrada e de rede | ⬜ | `GET /wallets`; sem carteira → link para cadastrar |
| Simulação de conexão, recusa e desconexão da carteira | 🟡 | API pronta (`POST /wallets/:id/connect`, cenário no painel); falta a interface |
| Revisão antes do envio | ⬜ | Etapa de revisão com a cotação exibida |
| Revalidar preço, disponibilidade, cupom e taxas; mudança exige nova confirmação | 🟡 | API responde 409 com a cotação nova; falta o diálogo de reconfirmação |
| Impedir pedidos duplicados (cliques repetidos, reenvio após timeout) | 🟡 | API idempotente; falta gerar e persistir a `Idempotency-Key` por tentativa (sessionStorage) |
| Estados pendente, confirmado e recusado | ⬜ | Tela do pedido com `order.updated` |
| Recuperação após refresh ou reconexão (pedido pendente) | 🟡 | Mock retoma pendentes; falta `GET /orders?status=pending` na interface |
| Confirmação exibida só para pedido confirmado | ⬜ | Modal do frame 05 |
| Recibo com o snapshot do pedido (transação, itens, taxas, total, link simulado) | ⬜ | Dados de `Order` |
| Preservar itens em falha; remover só os comprados após confirmação | 🟡 | Feito no mock; falta invalidar o carrinho ao confirmar |
| Sessão expirada no checkout preserva o contexto | 🟡 | Redirecionamento com destino pronto; falta guardar o rascunho do formulário |
| Testes E2E (§9, itens 6, 7 e 10) | ⬜ | Compra completa, recusa, clique repetido, timeout, pedido pendente |

## Etapa 8 — Perfil e carteiras

Telas: [desktop-08-perfil.png](figma/desktop-08-perfil.png) e
[desktop-09-carteiras.png](figma/desktop-09-carteiras.png) (sem frame mobile: adaptar).
Layout da área (sidebar, "Sair") e lista de interesse já existem.

| Requisito (enunciado §3) | Status | Observação |
| --- | --- | --- |
| Editar dados do perfil com validação e erros da API (conflito de e-mail/usuário) | ⬜ | `PATCH /profile` |
| Avatar: alterar (upload até 1 MB) e remover | ⬜ | `PUT`/`DELETE /profile/avatar`; atualizar header |
| Alterar senha (atual, nova, confirmação) | ⬜ | `POST /profile/password` |
| Carteira principal: cadastro e edição | ⬜ | `POST`/`PUT /wallets` |
| Carteira secundária: cadastro, edição e "Igual à carteira principal" | ⬜ | |
| Alterações confirmadas permanecem após refresh | 🟡 | Persistência pronta no mock |
| Versões mobile e tablet | ⬜ | |
| Testes E2E (§9, item 8) | ⬜ | Perfil, avatar, senha e carteiras com erros de validação |

## Etapa 9 — Qualidade, entrega e documentação final

| Requisito (enunciado §8–§12) | Status | Observação |
| --- | --- | --- |
| Testes E2E restantes (§9) | 🟡 | Feitos: itens 1, 2, 3, 4, 5, 11 (parcial) e 12. Faltam: 6–10 e o restante do 11 |
| Regressão visual (início, detalhe, carrinho, pagamento) com baselines versionadas | ⬜ | `toHaveScreenshot`, dados estáveis, desktop e mobile |
| Controle de relógio, latência e disparo de eventos nos testes sensíveis a tempo | 🟡 | Latência e eventos controláveis; falta `page.clock` onde houver tempo |
| Lighthouse em início e detalhe, mobile e desktop, 3 medições, mediana | ⬜ | Configuração versionada, relatórios HTML/JSON, LCP/CLS/TBT |
| Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90 | ⬜ | Ver pendências técnicas abaixo |
| Revisão de acessibilidade (teclado, foco, contraste, zoom 200%, sem overflow) | 🟡 | Base feita; auditar todas as telas no final |
| Deploy público (Vercel) com mocks e tempo real funcionando | ⬜ | Rewrite de SPA para acesso direto/refresh das rotas |
| README final: setup, variáveis, credenciais, cenários, fluxos de falha | 🟡 | Setup, credenciais e cenários feitos; falta o passo a passo dos fluxos de falha |
| ARCHITECTURE final: contratos, sessão, carrinho, cache, reconciliação REST × Socket.IO | 🟡 | Falta carrinho, checkout e reconciliação |
| Scripts de auditoria (Lighthouse) no `package.json` | ⬜ | |
| Execução a partir de um checkout limpo | ⬜ | Validar com clone novo antes de entregar |

---

## Pendências técnicas conhecidas

- **Tamanho do bundle principal (~490 KB):** dividir melhor (carregar painel de mocks,
  devtools e telas sob demanda) antes do Lighthouse.
- **LCP da página inicial:** a imagem do destaque depende do JavaScript e da API simulada;
  avaliar pré-carregamento (`<link rel="preload">`) da ilustração do destaque.
- **Meta tags de SEO:** `index.html` ainda sem `meta description`.
- **Resolução das ilustrações:** limitadas ao export do Figma (434 px e 238 px); trocar se
  houver export em resolução maior.
- **Lupa do header:** leva ao catálogo, mas não foca o campo de busca.
- **Lentidão dos testes em paralelo:** a primeira renderização após um carregamento completo
  passa de 5 s com muitos workers; o carrinho usa uma espera de 15 s no carregamento inicial.
  Avaliar `expect.timeout` global ou menos workers se outros specs ficarem instáveis.
- **Junção do carrinho no login** roda depois de a sessão começar: se a página recarregar
  nesse intervalo, o `POST /cart/merge` é cancelado (o id do visitante é mantido e a junção é
  repetida no próximo login). Avaliar refazer a junção ao iniciar o app com sessão e id de
  visitante presentes.
- **Painel de cenários no mobile:** botão no canto direito pode sobrepor conteúdo pontualmente
  (ferramenta de demonstração).

## Ordem sugerida

1. ~~Etapa 5 (carrinho)~~ ✅
2. Etapa 6 (tempo real), necessária para o cenário "preço muda durante a compra".
3. Etapa 7 (checkout e pedido), o fluxo mais crítico da avaliação.
4. Etapa 8 (perfil e carteiras): o checkout depende de carteiras, mas os dados de exemplo da
   Ana já permitem desenvolver a etapa 7 antes.
5. Etapa 9 (testes restantes, regressão visual, Lighthouse, deploy e documentação).
