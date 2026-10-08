# Kurio

Frontend em React + TypeScript criado com Vite.

## Stack

- [React 19](https://react.dev) + TypeScript
- [Vite](https://vite.dev)
- [React Router](https://reactrouter.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- [oxlint](https://oxc.rs) para lint

## Como rodar

```bash
npm install
cp .env.example .env   # configure VITE_API_URL
npm run dev
```

| Script            | Descrição                        |
| ----------------- | -------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento      |
| `npm run build`   | Type-check e build de produção   |
| `npm run preview` | Pré-visualiza o build            |
| `npm run lint`    | Executa o linter                 |

## Estrutura

```
src/
  components/   componentes reutilizáveis
  hooks/        hooks customizados
  layouts/      layouts de página (header, footer, etc.)
  pages/        páginas ligadas às rotas
  services/     acesso a APIs (api.ts = cliente HTTP base)
  types/        tipos compartilhados
  router.tsx    definição das rotas
```

Imports usam o alias `@/` apontando para `src/`.
