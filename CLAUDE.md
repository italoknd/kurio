# Instruções para o agente

Este arquivo é lido automaticamente pelo agente (Claude Code) em toda sessão.
Contém as regras de automação e convenções do projeto Kurio.

## Projeto

Kurio é a solução do **Desafio Frontend — Marketplace de NFTs** (Jungle Gaming).
O enunciado completo é a fonte da verdade e está em [docs/DESAFIO.md](docs/DESAFIO.md)
(original: https://github.com/junglegaming/frontend-challenge). Consulte-o antes de
implementar qualquer tela, fluxo, contrato ou teste.

Layout de referência: [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)
(sem acesso direto). Use os frames exportados em [docs/figma/](docs/figma/) e os tokens,
tipografia e componentes documentados em [docs/DESIGN.md](docs/DESIGN.md). Antes de
implementar ou ajustar uma tela, abra o frame correspondente e compare o resultado.

### Stack obrigatória (não substituir)

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface / linguagem | React + TypeScript (build com Vite) |
| Roteamento | TanStack Router (inclusive search params e rotas protegidas) |
| Estado remoto | TanStack Query (consultas, mutations, cache) |
| Cliente HTTP | Axios (toda chamada REST passa por ele) |
| Tempo real | Socket.IO (`socket.io-client`) |
| Estilização / componentes | Tailwind CSS + shadcn/ui |
| Mocking | MSW (REST + Socket.IO via `@mswjs/socket.io-binding`) |
| Testes | Playwright (E2E + regressão visual) |
| Auditoria | Lighthouse |

### Regras que valem para todo o código

- **Sem dados fictícios fora do MSW**: componentes, hooks e o cliente Axios nunca contêm
  respostas mockadas nem caminhos alternativos de negócio. Mocks ficam só na camada de rede.
- **Eventos de tempo real sempre via `socket.io-client`**, nunca chamando setters/cache direto
  para "simular" eventos.
- **Valores em ETH são strings decimais**; cálculos com precisão (nada de `number` float).
  Quantidades são inteiras.
- **Estado de busca/filtros/ordenação/paginação na URL** (search params do TanStack Router).
- **Contratos tipados** entre transporte, estado e UI; estados de loading (skeleton com
  shimmer), vazio, erro, sucesso e atualização em segundo plano em toda tela com dados.
- **Acessibilidade**: teclado, foco visível, foco preso em diálogos/drawers, labels e erros
  associados aos campos, `alt` em imagens, respeito a `prefers-reduced-motion`.
- **Responsivo** em 390, 768 e 1440 px, sem overflow horizontal.
- **Isolamento por usuário**: logout/troca de usuário limpa cache privado e subscriptions.
- Pedidos usam **chave de idempotência**; nunca permitir pedido duplicado.
- Toda decisão de arquitetura, desvio do Figma ou limitação vai para `ARCHITECTURE.md`;
  setup, credenciais fictícias, cenários e comandos vão para o `README.md`.

## Automações

### Registro de progresso

Ao concluir cada etapa ou task relevante, atualizar [docs/PROGRESSO.md](docs/PROGRESSO.md):
status no roteiro e uma seção com objetivo, o que foi entregue, decisões, problemas
encontrados, como validar e os commits. O registro faz parte da task e entra no mesmo
commit (o hash do próprio commit pode ser preenchido no commit seguinte).

### Commit e push ao finalizar cada task

Sempre que uma instrução/task do usuário for concluída e houver alterações no repositório:

1. Validar antes de commitar:
   - `npm run build` (build + type-check) deve passar
   - `npm run lint` deve passar sem erros
   - `npm run test:e2e` deve passar (no mínimo os specs da área alterada)
   - Se falhar, corrigir; se não for possível corrigir, **não** commitar e informar o usuário.
2. Revisar `git status` / `git diff` e adicionar somente os arquivos relacionados à task
   (nunca commitar `.env`, credenciais ou arquivos gerados como `dist/` e `node_modules/`).
3. Criar um commit seguindo o padrão abaixo.
4. Fazer `git push` para o branch atual (`git push -u origin <branch>` se ainda não tiver upstream).
5. Informar ao usuário o hash do commit e o resultado do push.

Não usar `--no-verify`, `--force` ou reescrever histórico já publicado.

### Padrão de mensagem de commit

[Conventional Commits](https://www.conventionalcommits.org/) em português:

```
<tipo>: <descrição curta no imperativo>

<corpo opcional explicando o porquê>
```

Tipos: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `build`, `ci`.

Exemplo: `feat: adiciona página de listagem de cursos`
