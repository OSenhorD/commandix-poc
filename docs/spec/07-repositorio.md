# 7. Estrutura do repositório

[← Índice](./README.md)

```
commandix-poc/
├── docs/spec/
├── AGENTS.md
├── readme.md
├── docker/
│   ├── production/
│   │   └── docker-compose.yml
│   └── development/
│       └── docker-compose.yml
├── .env.example
├── .agents/
│   ├── README.md                   # aponta para a skill em nexus-backend/
│   └── rules/                      # regras Cursor (monorepo)
├── nexus-backend/
│   ├── prisma.config.ts
│   ├── tsconfig.json               # paths: "@/*" → "./src/*"
│   ├── docker/
│   │   ├── production/
│   │   │   ├── Dockerfile
│   │   │   └── entrypoint.sh       # db migrate → seed → node dist/main.js
│   │   └── development/
│   │       ├── Dockerfile
│   │       └── entrypoint.sh       # db migrate → seed → start:debug (watch)
│   ├── migrations/app/
│   ├── .agents/skills/prisma-8/    # fonte da skill (skills:sync)
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
│   ├── components.json             # shadcn (estilo base-lyra, alias @/components/ui)
│   ├── vite.config.ts              # alias @/ + proxy /api → api:3000 (dev)
│   ├── eslint.config.js            # ESLint 10 strictTypeChecked
│   ├── docker/
│   │   ├── production/
│   │   │   ├── Dockerfile          # build Vite → nginx
│   │   │   └── nginx.conf          # SPA + proxy /api/ → api:3000
│   │   └── development/
│   │       └── Dockerfile          # vite dev --host (bind mount)
│   └── src/
│       ├── app/                    # providers, router, protected-route
│       ├── components/ui/          # shadcn (alias fixo)
│       ├── shared/                 # api/, types/, lib/, components/
│       └── features/               # auth/, integrations/, executions/
└── ...
```

## Skills Prisma 8 (monorepo)

| Caminho | Papel |
|---------|-------|
| `nexus-backend/.agents/skills/prisma-8/` | **Fonte única** — `npm run skills:sync` |

**Sem symlink na raiz** — ler a skill direto neste caminho (ver [`AGENTS.md`](../../AGENTS.md) § Monorepo).

**Comandos Prisma:** rodam **dentro do container `api`** (Compose de desenvolvimento), nunca no host — o `DATABASE_URL` só existe na rede do Compose:

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . exec api <comando>
```

O `cwd` dentro do container já é a raiz do backend (`/app`). Ver [`AGENTS.md`](../../AGENTS.md) § Comandos úteis e [`readme.md`](../../readme.md) § Prisma 8.

**Imports TypeScript:** alias `@/` → `src/`; build (`npm run build`) usa `tsc-alias` para reescrever no `dist/`. Detalhes em [`AGENTS.md`](../../AGENTS.md).

## Referências

| Recurso | Caminho |
|---------|---------|
| Skill | `nexus-backend/.agents/skills/prisma-8/SKILL.md` |
| Contract | `nexus-backend/src/prisma/contract.prisma` |
| Runtime | `nexus-backend/src/prisma/db.ts` |
| Migrations | `nexus-backend/migrations/app/` |
| Config | `nexus-backend/prisma.config.ts` |
