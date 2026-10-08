# Próximos passos e requisitos pendentes

Checklist vivo do que falta para concluir o desafio, organizado pelas etapas do roteiro e
cruzado com o enunciado ([docs/DESAFIO.md](DESAFIO.md)). O histórico do que já foi feito
está em [docs/PROGRESSO.md](PROGRESSO.md).

**Situação em 08/10/2026:** etapas 0 a 4 concluídas (fundação, contratos e mocks, conta e
sessão, catálogo e detalhe). Commit mais recente: `d89dca2`. 58 testes E2E passando.

Legenda: ✅ feito · 🟡 parcial · ⬜ pendente

---

## Etapa 5 — Carrinho e cotação

Tela: [desktop-03-carrinho.png](figma/desktop-03-carrinho.png) e
[mobile-03-carrinho.png](figma/mobile-03-carrinho.png). Rota: `/carrinho` (hoje placeholder).

| Requisito (enunciado §3) | Status | Observação |
| --- | --- | --- |
| Listar itens (imagem, nome, ID do token, edição, preço, total da linha) | ⬜ | Dados em `GET /cart` |
| Alterar quantidade respeitando disponibilidade por NFT e edição | ⬜ | `PATCH /cart/items/:id`; `QuantityStepper` já existe; tratar 409 |
| Remover item | ⬜ | `DELETE /cart/items/:id`, com confirmação acessível ou desfazer |
| Aplicar e remover cupom, com erro de código inválido/expirado | ⬜ | `PUT`/`DELETE /cart/coupon`; erros vêm em `fields.code` |
| Resumo: subtotal, desconto, taxa de rede e total vindos da API | ⬜ | `GET /cart/quote?network=`; nunca calcular o total só no cliente |
| Skeleton com shimmer no resumo e na lista | ⬜ | Mesmas dimensões do conteúdo |
| Carrinho mantido após refresh | 🟡 | Id do visitante já é guardado; falta a tela |
| Itens do visitante preservados ao autenticar | ✅ | `POST /cart/merge` no login (etapa 3) |
| Itens com problema de disponibilidade (`quote.issues`) destacados | ⬜ | Bloquear "Conectar e finalizar" enquanto houver problema |
| Estado vazio do carrinho | ⬜ | Link para o catálogo |
| Seção "Colecionadores também viram" | ⬜ | `nftListQuery({ tab: 'em-alta' })` |
| "Conectar e finalizar" leva ao pagamento (login se visitante) | ⬜ | Rota privada `/pagamento` já protegida |
| Versão mobile (lista em cards, cupom e resumo abaixo, botão fixo) | ⬜ | Frame mobile-03 |
| Testes E2E (enunciado §9, item 5) | ⬜ | Quantidades, remoção, cupom, persistência após refresh e login |

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
| Cenário: NFT no carrinho muda de preço → interface avisa e atualiza o resumo | ⬜ | Banner no carrinho + nova cotação |
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
| Testes E2E restantes (§9) | 🟡 | Feitos: itens 1, 2, 3, 4, 11 (parcial) e 12. Faltam: 5–10 e o restante do 11 |
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
- **Painel de cenários no mobile:** botão no canto direito pode sobrepor conteúdo pontualmente
  (ferramenta de demonstração).

## Ordem sugerida

1. Etapa 5 (carrinho), pois as etapas 6 e 7 dependem dela.
2. Etapa 6 (tempo real), necessária para o cenário "preço muda durante a compra".
3. Etapa 7 (checkout e pedido), o fluxo mais crítico da avaliação.
4. Etapa 8 (perfil e carteiras): o checkout depende de carteiras, mas os dados de exemplo da
   Ana já permitem desenvolver a etapa 7 antes.
5. Etapa 9 (testes restantes, regressão visual, Lighthouse, deploy e documentação).
