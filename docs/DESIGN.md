# Guia de design — Kurio

Referência visual extraída do export do Figma (`Frontend Challenge.png`, 8000×7453).
Os frames recortados ficam em [docs/figma/](figma/) e são a fonte da verdade para
fidelidade visual. Cores foram amostradas diretamente dos pixels do export.

## Frames

| Arquivo | Tela | Tamanho |
| --- | --- | --- |
| [desktop-01-inicio.png](figma/desktop-01-inicio.png) | Início | 1440×3668 |
| [desktop-02-detalhe-nft.png](figma/desktop-02-detalhe-nft.png) | Detalhe do NFT | 1440×2246 |
| [desktop-03-carrinho.png](figma/desktop-03-carrinho.png) | Carrinho | 1440×1754 |
| [desktop-04-pagamento.png](figma/desktop-04-pagamento.png) | Pagamento | 1440×1657 |
| [desktop-05-confirmacao-pedido.png](figma/desktop-05-confirmacao-pedido.png) | Confirmação (modal) | 1440×1657 |
| [desktop-06-login.png](figma/desktop-06-login.png) | Login (modal sobre Início) | 1440×1981 |
| [desktop-07-cadastro.png](figma/desktop-07-cadastro.png) | Cadastro (modal sobre Início) | 1440×1981 |
| [desktop-08-perfil.png](figma/desktop-08-perfil.png) | Perfil do colecionador | 1440×1080 |
| [desktop-09-carteiras.png](figma/desktop-09-carteiras.png) | Carteiras | 1440×1080 |
| [mobile-01-inicio.png](figma/mobile-01-inicio.png) | Início | 414×896 |
| [mobile-02-detalhe-nft.png](figma/mobile-02-detalhe-nft.png) | Detalhe do NFT | 414×896 |
| [mobile-03-carrinho.png](figma/mobile-03-carrinho.png) | Carrinho | 414×896 |
| [mobile-04-pagamento.png](figma/mobile-04-pagamento.png) | Pagamento com carteira | 414×896 |
| [mobile-05-login.png](figma/mobile-05-login.png) | Login (página cheia) | 414×896 |
| [mobile-06-cadastro.png](figma/mobile-06-cadastro.png) | Cadastro (página cheia) | 414×896 |

Sem frame mobile: perfil, carteiras e confirmação (devem ser adaptados no mesmo padrão).

## Tokens

### Cores

| Token | Hex | Uso |
| --- | --- | --- |
| `background` | `#140d0a` | Fundo da página, fundo dos inputs |
| `surface` | `#241612` | Cards, sidebar, modais, rodapé, linhas do carrinho |
| `surface-strong` | `#38220f` | Faixa de contato do rodapé, bordas suaves |
| `border` | `#442c1a` | Divisória do header, separadores |
| `input-border` | `#3f2319` | Borda dos inputs |
| `primary` | `#d28a4c` | Botões, links ativos, preços, destaques, badges |
| `primary-hover` | `#e89b55` | Hover/realce do primário (estimado) |
| `primary-foreground` | `#140d0a` | Texto sobre botões primários |
| `foreground` | `#f5f1eb` | Texto principal |
| `muted-foreground` | `#cfb28c` | Texto secundário, descrições, placeholders |
| `required` | `#f0805f` | Asterisco de campo obrigatório |

### Tipografia

- Família única: **Roboto Mono** (Google Fonts), pesos 400, 500, 700.
- Título hero: ~48px, 700, caixa alta, entrelinha ~70px.
- Títulos de seção / nome do NFT no detalhe: ~28px, 700.
- Subtítulos de card/sidebar: 18px, 700.
- Corpo: 14–15px, 400, entrelinha ~24px, `muted-foreground` para descrições.
- Preços: 16–18px, 700, `primary`; preço riscado/anterior em `muted-foreground`.
- Letter-spacing levemente positivo (monoespaçada já dá o ritmo).

### Layout e espaçamento

- Desktop: frame 1440px, conteúdo em container de **1200px** (margem lateral 120px).
- Header: altura ~68px, logo "KURIO" à esquerda, nav central (Início, Mercado, Criadores,
  Aprenda) com sublinhado `primary` de 3px no item ativo, ações à direita (busca, carrinho
  com badge numérico, botão "Entrar").
- Catálogo: sidebar de 310px + grid de 3 colunas (cards ~258px, gap ~34px).
- Mobile: frame 414px, padding lateral ~18px, navegação inferior (início, favoritos,
  carrinho, perfil) e botão flutuante central.
- Raios: botões 4px; cards de NFT 0–4px com imagem 16px; hero 24px; botões mobile
  pílula (totalmente arredondados).

### Componentes recorrentes

- **Botão primário**: fundo `primary`, texto `primary-foreground` 700, altura 40px.
- **Botão outline**: borda `primary` 1px, texto `primary` (ex.: "Favoritar").
- **Input**: fundo `background`, borda `input-border`, altura 40px, placeholder `muted-foreground`;
  foco com borda `primary`.
- **Chip de edição** (1/1, 1/10, 1/50, ABERTA): pílula com borda; selecionado em `primary`.
- **Stepper de quantidade**: botões circulares `primary` com − / +.
- **Tag "RARO"**: retângulo `primary` no canto superior esquerdo do card.
- **Badge de carteiras**: pílula `surface-strong` com "METAMASK • WALLETCONNECT • COINBASE".
- **Modal**: fundo `surface`, borda inferior `primary` de ~10px, botão fechar (X) `primary`.
- **Tabs**: texto ativo `primary` com sublinhado; inativo `foreground`.
- **Paginação**: quadrados 34px com borda; ativo preenchido `primary`.

## Assets

- Ilustrações dos NFTs em [public/nfts/](../public/nfts/) (WebP, recortadas do export):
  `emerald-ape` (434px), `sage-nomad`, `neon-vessel`, `golden-beat` (238px).
  Todos os NFTs do layout reutilizam esses 4 personagens com nomes/recortes diferentes.
  A resolução é limitada pelo export; registrar em `ARCHITECTURE.md` como substituição de asset.
- Ícones exportados do Figma em [docs/figma/icons/](figma/icons/) (Arrow-Down, Message, X,
  Search, Shop, User). Demais ícones: usar `lucide-react` (padrão do shadcn/ui) com traço similar.
