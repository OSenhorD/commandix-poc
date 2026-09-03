# 11. Checklist de implementação

[← Índice](./README.md)

> Prisma 8: seguir `nexus-backend/.cursor/skills/prisma-8/SKILL.md` em tarefas de contract, migration e query.

## Fase 1 — Fundação

- [ ] Domínio em `src/prisma/contract.prisma` (§4 de [modelo de dados](./04-modelo-dados.md))
- [ ] `npm run contract:emit`
- [ ] Migration inicial: `migration plan --name initial` → commit em `migrations/app/`
- [ ] `DatabaseModule` (wrapper injectable de `db`)
- [ ] Seed idempotente em `src/prisma/seed.ts`
- [ ] `GET /api/v1/health` (público; healthcheck Docker)
- [ ] CORS em dev — `enableCors({ origin: 'http://localhost:5173' })` em `main.ts`
- [ ] Docker Compose (postgres + api + frontend)
- [ ] Entrypoint: `db migrate` → seed idempotente (sempre) → start

## Fase 2 — Auth

- [ ] Bootstrap de tenant + rate limit básico (`@nestjs/throttler`, 5 req / 60s por IP)
- [ ] Login / refresh / logout (access `15m`, refresh `7d`; claims §5.2 de [05-api](./05-api.md))
- [ ] JwtAuthGuard + RolesGuard
- [ ] Decorator @CurrentUser()

## Fase 3 — Integrações

- [ ] CRUD de integrações com tenant scoping (PATCH parcial — [05-api §5.3](./05-api.md#patch-integrationsid))
- [ ] Listagem paginada ([05-api §5.0](./05-api.md#50-paginação-listagens) + filtro `isActive` — [§5.3](./05-api.md#get-integrations))
- [ ] Serviço HTTP para disparo
- [ ] Registro de execuções (`responseBody` truncado em 10 240 bytes)

## Fase 4 — Histórico

- [ ] Ordenação execuções (`executedAt DESC`)
- [ ] Listagem paginada com filtros ([05-api §5.0](./05-api.md#50-paginação-listagens) + `status`, `from`/`to`)
- [ ] Detalhe de execução (tenant via `Integration`)

## Fase 5 — Frontend

- [ ] Cliente HTTP (`src/api/client.ts`) com base `/api/v1`
- [ ] Interceptor 401 → refresh → logout
- [ ] Proxy Vite dev (`/api` → localhost:3000)
- [ ] Login + logout + token storage (`localStorage`)
- [ ] Bootstrap (cadastro tenant + admin)
- [ ] Integrações — listar (ADMIN + VIEWER)
- [ ] Integrações — criar / editar / desativar / excluir (ADMIN)
- [ ] Trigger manual (ADMIN)
- [ ] Histórico — listagem, filtros, detalhe execução
- [ ] Controle de UI por role (ocultar ações de escrita para VIEWER)

## Fase 6 — Polish

- [ ] `.env.example` completo
- [ ] README com decisões
- [ ] Testes críticos (auth, tenant isolation, execuções)
- [ ] (Bônus) n8n workflow
