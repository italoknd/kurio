# Progresso do projeto

Registro passo a passo do que foi feito em cada etapa, para dar um overview ao fim do
projeto. Cada entrada traz o objetivo, o que foi entregue, decisões e problemas
encontrados, como validar e os commits correspondentes.

## Roteiro

| # | Etapa | Status |
| --- | --- | --- |
| 0 | Preparação (template, regras do agente, enunciado, Figma) | Concluída |
| 1 | Fundação (stack obrigatória, tema, layout, mocks, Playwright) | Concluída |
| 2 | Contratos e mocks (tipos, fixtures, handlers REST, eventos) | Concluída |
| 3 | Conta e sessão | Concluída |
| 4 | Catálogo e detalhe | Concluída |
| 5 | Carrinho e cotação | Pendente |
| 6 | Tempo real | Pendente |
| 7 | Checkout e pedido | Pendente |
| 8 | Perfil e carteiras | Pendente |
| 9 | Testes, Lighthouse, deploy e documentação final | Pendente |

---

## Etapa 0 — Preparação

**Objetivo:** preparar o repositório, as regras de trabalho do agente e as referências do desafio.

**Entregue:**
- Template inicial React + TypeScript + Vite.
- `CLAUDE.md` com as regras do agente: commit e push automáticos ao fim de cada task,
  validação antes do commit, padrão de mensagens (Conventional Commits em português).
- Enunciado do desafio copiado para [docs/DESAFIO.md](DESAFIO.md) e regras gerais
  (stack obrigatória, ETH como string, mocks só no MSW etc.) registradas no `CLAUDE.md`.
- Export do Figma processado: 15 frames recortados em [docs/figma/](figma/), tokens de cor,
  tipografia e componentes em [docs/DESIGN.md](DESIGN.md), ilustrações dos NFTs em
  `public/nfts/`.

**Decisões:** sem acesso direto ao Figma, as cores foram amostradas dos pixels do export e as
ilustrações recortadas dele (resolução limitada, registrada em `ARCHITECTURE.md`).

**Commits:** `0efa316`, `9360fad`, `8c25f22`, `46562ec`.

---

## Etapa 1 — Fundação

**Objetivo:** substituir a stack provisória pela obrigatória e montar a base da aplicação.

**Entregue:**
- TanStack Router (rotas file-based) no lugar de React Router; Axios no lugar de `fetch`;
  TanStack Query com política de cache e retries.
- shadcn/ui instalado e adaptado ao tema do Figma (Roboto Mono, paleta marrom/laranja).
- Header, rodapé e navegação inferior mobile seguindo os frames.
- Rotas de todas as telas (placeholders), página 404 e tela de erro com nova tentativa.
- MSW com seis perfis de rede determinísticos (normal, lento, variável, instável, offline,
  timeout) e painel **Cenários** para a demonstração.
- Servidor Socket.IO simulado com `@mswjs/socket.io-binding`, aviso acessível de reconexão.
- Playwright com projetos desktop (1440) e mobile (390), relatório HTML e traces.
- README (setup, scripts, cenários) e `ARCHITECTURE.md`.

**Problemas encontrados:**
- O `engine.io-client` captura `WebSocket` ao carregar o módulo → a aplicação passou a ser
  importada só depois que o MSW inicia.
- O MSW remove `/socket.io/` da URL antes de comparar e não aceita `RegExp` em `ws.link` →
  o link usa apenas a origem.
- O binding não envia heartbeat → o mock envia ping a cada 20 s.
- Alertas do `npm audit` vinham do CLI do shadcn → movido para `devDependencies`
  (0 vulnerabilidades em produção).

**Validação:** `npm run build`, `npm run lint`, `npm run test:e2e` (10 testes de fumaça).

**Commit:** `364801b`.

---

## Etapa 2 — Contratos e mocks

**Objetivo:** definir os contratos tipados de todos os recursos e implementar a API simulada
completa, com estado consistente entre REST e eventos.

**Entregue:**
- **Contratos tipados** em `src/types/` (sessão, NFTs, carrinho/cotação, pedidos, perfil,
  carteiras, eventos e erros), documentados em [docs/API.md](API.md).
- **Aritmética de ETH** com BigInt (`src/lib/eth.ts`), compartilhada por interface e mocks.
- **Clientes Axios por recurso** (`src/api/`), com token e carrinho do visitante injetados
  por interceptor, erros normalizados (`HttpError` com `reason`, `details`,
  `isSessionExpired`) e chaves de cache isoladas por usuário.
- **Banco simulado** persistido e resetável, com fixtures determinísticas: 36 NFTs, 2 usuários,
  carteiras, cupons (válido, outro válido, expirado) e o carrinho do Figma
  (total `26.846 ETH`, idêntico ao layout).
- **Handlers REST** de sessão, catálogo (busca, filtros combináveis, ordenação, paginação,
  facetas), favoritos, carrinho (visitante + merge), cotação, pedidos idempotentes, perfil
  (avatar, senha) e carteiras (incluindo simulação de conexão/recusa).
- **Simulação de pedidos:** pendente → confirmado/recusado após um atraso configurável,
  baixa de estoque, remoção apenas do que foi comprado, retomada após refresh.
- **Tempo real:** eventos `nft.updated` (todos) e `order.updated` (só o dono, pelo token do
  handshake), com envelope de id estável e versão, e log para reenviar duplicatas.
- **Controles de cenário** no painel e em `window.__kurioMocks`: pagamento, conexão de
  carteira, expiração de sessão, timeout após criação do pedido, alteração de preço/estoque.
- **Testes de contrato** (`e2e/api-contracts.spec.ts`): 17 cenários via MSW no navegador.

**Decisões:**
- A cotação tem id derivado do conteúdo; o checkout envia o id revisado e a API responde
  409 `QUOTE_OUTDATED` com os novos valores se algo mudou — base do "impedir confirmação com
  cotação desatualizada".
- Filtro e faixa de preço usam o preço listado (edição padrão), o mesmo do card, reproduzindo
  a faixa `0,02 – 12,30 ETH` do Figma.
- Pedido de outro usuário responde 404 (não revela que existe).
- Login com credenciais erradas responde 401; o cliente só trata 401 como "sessão expirada"
  quando a requisição tinha token (`HttpError.isSessionExpired`).

**Problemas encontrados:** a faixa de preço inicialmente usava a edição mais barata (a aberta
custa metade), o que daria `0,01 – 6,15`; corrigido para o preço listado.

**Validação:** `npm run build`, `npm run lint`, `npm run test:e2e` (27 testes passando).

**Commit:** `3f72872`.

---

## Etapa 3 — Conta e sessão

**Objetivo:** cadastro, login, logout e sessão recuperável, com proteção das rotas privadas,
expiração tratada sem perder o contexto e isolamento entre usuários.

**Entregue:**
- **Login e cadastro** fiéis aos frames: modal sobre a página atual no desktop
  (`?auth=entrar|cadastro`) e página cheia no mobile (`/entrar`, `/cadastro`), sem barra
  inferior e rodapé no mobile, como no Figma.
- **Validação** no cliente (zod, espelhando a API) e erros da API aplicados aos campos
  (ex.: e-mail já cadastrado foca o campo); credencial incorreta exibida como alerta.
- **Sessão recuperável** após refresh (token + revalidação em `/auth/session`).
- **Rotas privadas** (perfil, carteiras, favoritos, pagamento, pedidos) com guarda que
  revalida a sessão e leva ao login guardando o destino; após autenticar, volta para ele.
- **Expiração** detectada por 401, pela guarda ou pelo `expiresAt`: limpa dados privados,
  avisa e leva ao login com `motivo=expirada`, preservando o destino.
- **Logout** pelo menu da conta (header) e pelo "Sair" do perfil; **troca de usuário** limpa
  todo o cache privado; o Socket.IO reconecta com o token da nova sessão.
- **Carrinho do visitante** juntado à conta ao autenticar.
- Login social e "Esqueceu a senha?" avisam indisponibilidade (fora do escopo).
- Testes E2E (`e2e/auth.spec.ts`), desktop e mobile: validação, credencial errada, refresh,
  cadastro com conflito, rota privada, expiração durante a navegação, logout/troca de
  usuário (verificando o usuário da conexão Socket.IO), foco preso no modal e Esc.

**Decisões:**
- `react-hook-form` + `zod` com adaptador próprio, evitando `@hookform/resolvers` (conflito
  de peer dependency com o zod do TanStack).
- Rótulos dos campos visualmente ocultos (o Figma usa só placeholder), mas presentes para
  leitores de tela; o campo da newsletter passou a se chamar "E-mail para receber novidades"
  para não ter o mesmo nome acessível do e-mail de login.
- Foco inicial do modal no primeiro campo, e não na aba "Entrar".

**Problemas encontrados:**
- **Redirecionamento em cadeia** (`/entrar?redirect=/entrar?redirect=...`): o redirecionamento
  reativo via matches da rota anterior durante a transição → passou a usar só o estado
  resolvido, e `safeRedirect` recusa /entrar e /cadastro como destino.
- **Expiração não detectada:** `fetchQuery` reaproveitava uma consulta de sessão iniciada
  antes da expiração → a guarda faz uma requisição própria.
- **Preload no hover** expirava a sessão antes do clique e salvava o destino errado → no
  preload a guarda só recusa.
- **Toast do logout não aparecia:** callback de `mutate()` não roda após desmontar →
  `mutateAsync`.
- Testes: a URL muda antes da guarda concluir e `/\/perfil$/` casava com `?redirect=/perfil`
  → asserções comparam o `pathname` e esperam o conteúdo da página privada.

**Validação:** `npm run build`, `npm run lint`, `npm run test:e2e` (38 testes; testes de
sessão repetidos 5× sem falhas).

**Commit:** `e4e19f3`.

---

## Etapa 4 — Catálogo e detalhe

**Objetivo:** página inicial com destaques e catálogo (busca, filtros, ordenação, paginação
na URL), detalhe do NFT com galeria, edições, quantidade, favoritos e compra.

**Entregue:**
- **Início** fiel ao frame desktop-01: destaque com troca pelos pontos, sidebar de coleções
  com contagens, faixa de preço (slider) e redes, card "NFT em destaque", abas, ordenação,
  grid de 9 por página, paginação, banners editoriais e "Diário da Cunhagem". No mobile:
  busca "Explorar coleções" no topo com drawer de filtros e grid de 2 colunas (frame mobile-01).
- **Estado do catálogo na URL**, sobrevivendo a refresh e ao histórico; filtros combináveis;
  mudança de filtro reinicia a paginação.
- **Estados de dados:** skeleton com shimmer, vazio, erro com nova tentativa e atualização
  em segundo plano (resultados anteriores esmaecidos).
- **Detalhe** fiel aos frames desktop-02 e mobile-02: galeria com miniaturas e zoom, preço por
  edição, avaliação, edições (esgotadas marcadas), quantidade limitada pela disponibilidade e
  pelo limite por pedido, compra (adiciona ao carrinho e vai para ele), favoritar,
  compartilhar, abas de detalhes e "Mais desta coleção". Acesso direto e 404 próprio.
- **Favoritos** com atualização otimista, rollback e aviso em falha; persistidos na API; lista
  em `/perfil/favoritos`.
- **Carrinho do visitante** iniciado ao comprar (id guardado para refresh e login) e contador
  no header.
- Testes E2E: `e2e/catalog.spec.ts` e `e2e/nft-detail.spec.ts` (desktop e mobile).

**Decisões:**
- Campo de busca adicionado acima do grid no desktop (o Figma só tem a lupa).
- Sem rotação automática no destaque; "Mais desta coleção" como grade/rolagem.
- Fixtures versionadas (`FIXTURES_VERSION`): ao mudar os dados simulados, estados salvos no
  navegador são substituídos automaticamente.
- Falhas forçadas (`failNext`) passaram a respeitar a latência do perfil de rede, para testes
  de atualização otimista determinísticos.

**Problemas encontrados:**
- **Rollback de favorito falhava** quando o clique acontecia com a lista ainda carregando
  (snapshot vazio + `setQueryData(undefined)` ignorado) → reversão da operação + `onSettled`.
  Encontrado pelo trace do Playwright (requisição de favoritos cancelada).
- **Toast de boas-vindas sumiu:** com o merge do carrinho do visitante, o login passou a
  aguardar uma requisição extra e a página de login desmontava antes do callback de
  `mutate()` → toast movido para o callback do hook.
- **Toasts cobriam a barra superior no mobile** (voltar/favoritar) → deslocados para baixo dela.
- **Nome acessível do botão "Favoritar"** não identificava o NFT → passou a conter o texto
  visível e o nome do NFT (WCAG 2.5.3).
- Testes liam a lista enquanto os dados anteriores ainda eram exibidos → espera pelo status
  anunciado ("N NFTs encontrados") e `expect.poll`.

**Validação:** `npm run build`, `npm run lint`, `npm run test:e2e` (58 testes; catálogo e
detalhe repetidos 3× sem falhas).
