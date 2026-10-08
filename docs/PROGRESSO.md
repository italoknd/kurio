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
| 3 | Conta e sessão | Pendente |
| 4 | Catálogo e detalhe | Pendente |
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
