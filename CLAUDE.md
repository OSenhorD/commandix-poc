# Commandix PoC

Contexto completo para agentes de IA: [`AGENTS.md`](./AGENTS.md) — leia antes de implementar qualquer coisa.

Resumo rápido:
- Spec funcional: [`docs/spec/`](./docs/spec/README.md)
- Regras por domínio (backend, frontend, Prisma, Docker): [`.agents/rules/`](./.agents/rules/)
- Tarefas Prisma: ler primeiro [`nexus-backend/.agents/skills/prisma-8/SKILL.md`](./nexus-backend/.agents/skills/prisma-8/SKILL.md) — projeto usa Prisma 8 (contract-first), nunca Prisma ORM 7 (`schema.prisma`, `migrate`, `@prisma/client`)
- Setup, comandos, decisões técnicas: [`readme.md`](./readme.md)
