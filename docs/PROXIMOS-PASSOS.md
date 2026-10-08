# Próximos passos e requisitos pendentes

Checklist vivo do que falta para concluir o desafio, organizado pelas etapas do roteiro e
cruzado com o enunciado ([docs/DESAFIO.md](DESAFIO.md)). O histórico do que já foi feito
está em [docs/PROGRESSO.md](PROGRESSO.md).

**Situação em 08/10/2026:** etapas 0 a 7 concluídas (até checkout e pedido). Próxima:
etapa 8 (perfil e carteiras).

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

## Etapa 6 — Tempo real (Socket.IO) ✅

Sincronização pronta (`features/realtime/use-realtime-sync.ts`), concluída com a etapa 7.
Detalhes em
[PROGRESSO.md](PROGRESSO.md#etapa-6--tempo-real).

| Requisito (enunciado §7) | Status | Observação |
| --- | --- | --- |
| `nft.updated` atualiza preço e disponibilidade no catálogo, detalhe e carrinho | ✅ | Catálogo/detalhe via `setQueryData` com versão; carrinho e cotação recarregados da API |
| `order.updated` atualiza o estado do pedido | ✅ | Tela do pedido acompanha o cache `['user', id, 'order', orderId]` |
| Tolerar duplicatas e eventos antigos (não regredir versão nem reaplicar efeitos) | ✅ | `EventTracker` (ids vistos + última versão por recurso) e versão do cache |
| Reconciliar recursos ativos com a REST após reconexão | ✅ | Evento `reconnect` do Manager invalida catálogo, carrinho e dados do usuário |
| Eventos de sessão anterior não afetam outro usuário | ✅ | Listeners refeitos por usuário; pedidos esquecidos e avisos limpos na troca |
| Liberar listeners e subscriptions ao fim do ciclo de vida | ✅ | `socket.off` / `socket.io.off` no cleanup |
| Feedback acessível das alterações (aria-live) | ✅ | Toast (região viva) + aviso persistente no carrinho |
| Cenário: NFT no carrinho muda de preço → interface avisa e atualiza o resumo | ✅ | |
| Checkout impede confirmação com cotação desatualizada | ✅ | Diálogo de revisão bloqueia e pede nova confirmação |
| Testes E2E (§9, itens 9 e 10) | ✅ | `e2e/realtime.spec.ts` e `e2e/checkout.spec.ts` |

## Etapa 7 — Checkout e pedido ✅

Telas `/pagamento` e `/pedidos/$orderId` concluídas. Detalhes em
[PROGRESSO.md](PROGRESSO.md#etapa-7--checkout-e-pedido).

| Requisito (enunciado §3 e §4) | Status | Observação |
| --- | --- | --- |
| Formulário do colecionador com os campos do layout e validação | ✅ | Pré-preenchido pela carteira; erros da API em `collector.*` |
| Seleção de carteira cadastrada e de rede | ✅ | Sem carteira → link para cadastrar |
| Simulação de conexão, recusa e desconexão da carteira | ✅ | Conexão vale para carteira + rede |
| Revisão antes do envio | ✅ | Diálogo de revisão |
| Revalidar preço, disponibilidade, cupom e taxas; mudança exige nova confirmação | ✅ | Por evento em tempo real ou 409 `QUOTE_OUTDATED` |
| Impedir pedidos duplicados (cliques repetidos, reenvio após timeout) | ✅ | Chave por tentativa (sessionStorage) + envio em série; "Verificar pedido" reenvia a mesma tentativa |
| Estados pendente, confirmado e recusado | ✅ | `order.updated` + consulta periódica de reserva |
| Recuperação após refresh ou reconexão (pedido pendente) | ✅ | Aviso de pedido pendente no pagamento |
| Confirmação exibida só para pedido confirmado | ✅ | Recibo só com status `confirmed` |
| Recibo com o snapshot do pedido (transação, itens, taxas, total, link simulado) | ✅ | |
| Preservar itens em falha; remover só os comprados após confirmação | ✅ | Carrinho recarregado ao confirmar |
| Sessão expirada no checkout preserva o contexto | ✅ | Rascunho do formulário por usuário |
| Testes E2E (§9, itens 6, 7 e 10) | ✅ | `e2e/checkout.spec.ts` |

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
| Testes E2E restantes (§9) | 🟡 | Feitos: itens 1–7, 9, 10, 12 e parte do 11. Faltam: 8 e o restante do 11 |
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
  passa de 5 s com muitos workers; `expect.timeout` global subiu para 10 s.
- **Cotação antiga após remover item (não reproduzido):** uma execução da suíte mostrou o
  resumo com a cotação anterior à remoção e o botão habilitado; não se repetiu em mais de 50
  execuções isoladas e combinadas. Acompanhar; o checkout revalida a cotação na API (409
  `QUOTE_OUTDATED`) de qualquer forma.
- **Mudanças durante uma queda do socket** são reconciliadas pela REST, mas não geram o aviso
  "o preço mudou" (não há evento para comparar).
- **Junção do carrinho no login** roda depois de a sessão começar: se a página recarregar
  nesse intervalo, o `POST /cart/merge` é cancelado (o id do visitante é mantido e a junção é
  repetida no próximo login). Avaliar refazer a junção ao iniciar o app com sessão e id de
  visitante presentes.
- **Pagamento no mobile:** o frame mobile-04 mostra só carteiras e total; a tela usa o mesmo
  formulário do desktop empilhado (formulário, itens, resumo, carteiras) com o botão fixo.
- **Tentativa sem resposta bloqueia novas compras** até ser verificada; se o pedido nunca
  chegou ao servidor, a verificação o cria com os dados da tentativa (documentado na tela).
- **Painel de cenários no mobile:** botão no canto direito pode sobrepor conteúdo pontualmente
  (ferramenta de demonstração).

## Ordem sugerida

1. ~~Etapa 5 (carrinho)~~ ✅
2. ~~Etapa 6 (tempo real)~~ ✅
3. ~~Etapa 7 (checkout e pedido)~~ ✅
4. Etapa 8 (perfil e carteiras): o checkout depende de carteiras, mas os dados de exemplo da
   Ana já permitem desenvolver a etapa 7 antes.
5. Etapa 9 (testes restantes, regressão visual, Lighthouse, deploy e documentação).
