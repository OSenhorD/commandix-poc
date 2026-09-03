# Skills do monorepo

## Layout

| Caminho | Conteúdo |
|---------|----------|
| `.cursor/skills/prisma-8/` | Symlink → `nexus-backend/.cursor/skills/prisma-8/` |
| `nexus-backend/.cursor/skills/prisma-8/` | **Fonte** — skill oficial Prisma 8 (gerenciada por `prisma skills sync`) |
| `nexus-backend/.cursor/skills/prisma-composer/` | Skill Composer (opcional; fora do escopo PoC) |

## Por que o symlink?

O Prisma instala skills junto ao `prisma.config.ts` (em `nexus-backend/`). O symlink na raiz permite que o Cursor descubra a skill quando o workspace é o monorepo inteiro (`commandix-poc/`).

**Não editar** arquivos em `prisma-8/` — rodar `npm run skills:sync` em `nexus-backend/` após bump de versão do Prisma.

## Uso por agentes

1. Abrir `nexus-backend/.cursor/skills/prisma-8/SKILL.md` (routing table)
2. Seguir referência indicada (`references/contract.md`, `references/migrations.md`, etc.)
3. Comandos Prisma sempre com `cwd` em `nexus-backend/`
