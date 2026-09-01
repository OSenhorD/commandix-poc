# 7. Estrutura do repositório

[← Índice](./README.md)

```
commandix-poc/
├── docs/
│   └── spec/                 # Spec técnica (este diretório)
├── AGENTS.md
├── readme.md
├── docker-compose.yml
├── .env.example
├── nexus-backend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh  # migrate deploy → seed → node dist/main.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── app.controller.ts   # inclui GET /health
│       ├── app.service.ts
│       └── prisma/
│           ├── prisma.module.ts
│           └── prisma.service.ts
│       # (futuro) auth/, tenants/, integrations/, executions/, common/
├── nexus-frontend/
│   └── src/
│       # (futuro) pages/, components/, hooks/, api/
└── .cursor/rules/
```
