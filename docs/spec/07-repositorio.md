# 7. Estrutura do repositório

[← Índice](./README.md)

```
commandix-poc/
├── docs/spec/
├── AGENTS.md
├── readme.md
├── docker-compose.yml
├── .env.example
├── .cursor/
│   ├── rules/                      # regras Cursor (monorepo)
│   └── skills/
│       ├── README.md
│       └── prisma-8/               # symlink → nexus-backend/.cursor/skills/prisma-8
├── nexus-backend/
│   ├── prisma.config.ts
│   ├── tsconfig.json               # paths: "@/*" → "./src/*"
│   ├── Dockerfile
│   ├── docker-entrypoint.sh        # db migrate → seed → node dist/main.js
│   ├── migrations/app/
│   ├── .cursor/skills/prisma-8/    # fonte da skill (skills:sync)
│   └── src/
│       ├── database/               # DatabaseModule
│       └── prisma/
│           ├── contract.prisma
│           ├── contract.json
│           ├── contract.d.ts
│           ├── db.ts
│           └── seed.ts
│       # auth/, tenants/, integrations/, executions/, common/
├── nexus-frontend/
│   └── src/
└── ...
```

## Skills Prisma 8 (monorepo)

| Caminho | Papel |
|---------|-------|
| `nexus-backend/.cursor/skills/prisma-8/` | **Fonte** — `npm run skills:sync` |
| `.cursor/skills/prisma-8/` | Symlink para descoberta na raiz do workspace |

Comandos Prisma: `cwd` em `nexus-backend/`.

**Imports TypeScript:** alias `@/` → `src/`; build (`npm run build`) usa `tsc-alias` para reescrever no `dist/`. Detalhes em [`AGENTS.md`](../../AGENTS.md).

## Referências

| Recurso | Caminho |
|---------|---------|
| Skill | `nexus-backend/.cursor/skills/prisma-8/SKILL.md` |
| Contract | `nexus-backend/src/prisma/contract.prisma` |
| Runtime | `nexus-backend/src/prisma/db.ts` |
| Migrations | `nexus-backend/migrations/app/` |
| Config | `nexus-backend/prisma.config.ts` |
