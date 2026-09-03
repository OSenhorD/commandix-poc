# 7. Estrutura do repositório

[← Índice](./README.md)

```
commandix-poc/
├── docs/spec/
├── AGENTS.md
├── readme.md
├── docker-compose.yml
├── .env.example
├── .cursor/rules/                  # regras Cursor (monorepo)
├── nexus-backend/
│   ├── prisma.config.ts            # config Prisma 8
│   ├── Dockerfile
│   ├── docker-entrypoint.sh        # db migrate → seed → node dist/main.js
│   ├── migrations/app/             # migrations versionadas
│   ├── .cursor/skills/prisma-8/    # skill oficial Prisma 8 (não editar)
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── app.controller.ts       # GET /health
│       ├── database/               # DatabaseModule (wrapper de db)
│       ├── prisma/
│       │   ├── contract.prisma
│       │   ├── contract.json
│       │   ├── contract.d.ts
│       │   ├── db.ts
│       │   └── seed.ts
│       # auth/, tenants/, integrations/, executions/, common/
├── nexus-frontend/
│   └── src/
└── ...
```

## Referências Prisma 8

| Recurso | Caminho |
|---------|---------|
| Skill (routing) | `nexus-backend/.cursor/skills/prisma-8/SKILL.md` |
| Contract | `nexus-backend/src/prisma/contract.prisma` |
| Runtime | `nexus-backend/src/prisma/db.ts` |
| Migrations | `nexus-backend/migrations/app/` |
| Config | `nexus-backend/prisma.config.ts` |
