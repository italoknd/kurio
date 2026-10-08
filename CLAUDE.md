# Instruções para o agente

Este arquivo é lido automaticamente pelo agente (Claude Code) em toda sessão.
Contém as regras de automação e convenções do projeto Kurio.

## Projeto

Frontend em React 19 + TypeScript + Vite, com React Router e Tailwind CSS v4.
Detalhes de stack, scripts e estrutura de pastas estão no [README.md](README.md).

## Automações

### Commit e push ao finalizar cada task

Sempre que uma instrução/task do usuário for concluída e houver alterações no repositório:

1. Validar antes de commitar:
   - `npm run build` (type-check + build) deve passar
   - `npm run lint` deve passar sem erros
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
