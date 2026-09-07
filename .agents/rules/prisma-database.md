# Prisma 8 & PostgreSQL

> **Aplica-se a:** `nexus-backend/src/prisma/**`, `nexus-backend/migrations/**`, `nexus-backend/prisma.config.ts`, `nexus-backend/**/seed.ts` — e a qualquer query no ORM.

**Skill oficial (ler antes de codar):** `nexus-backend/.agents/skills/prisma-8/SKILL.md`. Ignorar qualquer skill genérica de Prisma vinda de fora deste projeto — cobrem Prisma ORM 7 clássico, proibido aqui.

Domínio (campos, enums, relações): `docs/spec/04-modelo-dados.md` §4.1–4.3 → implementar em `src/prisma/contract.prisma`.

## Layout canônico

```
nexus-backend/
├── prisma.config.ts
├── migrations/
│   ├── snapshots/
│   └── app/                    # migrations versionadas deste app
│       ├── refs/db.json
│       └── <timestamp>_<slug>/
└── src/prisma/
    ├── contract.prisma         # fonte — editar aqui
    ├── contract.json           # gerado — commitar
    ├── contract.d.ts           # gerado — commitar
    ├── db.ts                   # runtime entry point
    └── seed.ts                 # seed idempotente
```

## Workflow

| Situação | Comandos |
|----------|----------|
| Após editar contract | `npm run contract:emit` |
| Primeira vez (DB vazio) | `npx prisma db init` |
| Dev (schema em fluxo) | `npx prisma db update` |
| Mudança versionada (branch/CI/Docker) | `npx prisma migration plan --name <slug>` → `npx prisma db migrate` |
| Verificar drift | `npx prisma db verify` |

**Docker / PoC:** `contract emit` (build) → `db migrate` → seed (sempre; idempotente) → start. Não usar `db update` em ambientes compartilhados.

Todos os comandos da tabela rodam **dentro do container `api`** (Compose de desenvolvimento) via `docker compose -f docker/development/docker-compose.yml --project-directory . exec api <comando>` — nunca no host.

## NestJS

`DatabaseModule` / `DatabaseService` injectable — wrapper de `db` de `src/prisma/db.ts`. Controllers não importam `db` diretamente.

## Queries (ORM — Postgres)

Lane padrão: `db.orm.<Model>` (PascalCase). Ver `nexus-backend/.agents/skills/prisma-8/references/queries-postgres.md`.

```typescript
import { db } from '@/prisma/db.js';

// Multi-tenant
const integration = await db.orm.Integration
  .where({ id, tenantId })
  .first();

// Execução — validar tenant via relação
const execution = await db.orm.IntegrationExecution
  .where({ id })
  .include('integration', (i) => i.select('tenantId'))
  .first();
if (!execution || execution.integration.tenantId !== tenantId) {
  throw new NotFoundException();
}
```

## Schema (domínio Commandix)

- PKs: UUID (`@id @default(uuid())`)
- Índices: `User(tenantId)`, `Integration(tenantId, updatedAt)`, `IntegrationExecution(integrationId, executedAt)`, `RefreshToken(userId)`
- Enums: `Role`, `IntegrationType`, `ExecutionStatus`
- JSON: `customHeaders`, `defaultPayload`, `requestPayload`
- `Tenant.slug` — `@unique`; `Tenant.name` — sem unique
- DELETE `Integration` — cascade em `IntegrationExecution`

Tipos temporais e atributos PSL: `nexus-backend/.agents/skills/prisma-8/references/contract.md`.

## Seed

`src/prisma/seed.ts` — idempotente; pular se tenant `acme` existir. Entrypoint Docker **sempre** invoca seed (não condicional a `NODE_ENV`); ver `docs/spec/08-docker.md` §8.5. Scripts one-off: `await db.close()` ao final (`references/runtime.md` na skill prisma-8).

## Proibições

- Não editar `contract.json` / `contract.d.ts` manualmente
- Não colocar `DATABASE_URL` em `prisma.config.ts` (usar `.env`)
- Não usar Prisma ORM 7 (`schema.prisma`, `@prisma/client`, `migrate deploy`)
