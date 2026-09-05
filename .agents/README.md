# Skills do monorepo

## Layout

| Caminho | Conteúdo |
|---------|----------|
| `nexus-backend/.agents/skills/prisma-8/` | Skill oficial Prisma 8 (gerenciada por `prisma skills sync`) — **fonte da verdade para Prisma** |

**Não editar** arquivos em `prisma-8/` — rodar `npm run skills:sync` em `nexus-backend/` após bump de versão do Prisma.

## Uso por agentes

1. Abrir `nexus-backend/.agents/skills/prisma-8/SKILL.md` (routing table)
2. Seguir referência indicada (`references/contract.md`, `references/migrations.md`, etc.)
3. Comandos Prisma sempre com `cwd` em `nexus-backend/`
