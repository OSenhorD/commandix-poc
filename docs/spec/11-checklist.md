# 11. Checklist de implementação

[← Índice](./README.md)

> Prisma 8: seguir `nexus-backend/.agents/skills/prisma-8/SKILL.md` em tarefas de contract, migration e query.

## Fase 1 — Fundação

- [x] Domínio Prisma 8 (`contract.prisma` + migrations)
- [x] `DatabaseModule` (wrapper do client Prisma)
- [x] Bootstrap da aplicação NestJS (`main.ts`, prefixo `api/v1`, `GET /health`)
- [x] Seed idempotente (`src/prisma/seed.ts`)
- [ ] Docker Compose (`database` + `api` ✅; `frontend` pendente — `nexus-frontend/` a criar)

## Fase 2 — Auth

- [x] Bootstrap de tenant (`POST /tenants/bootstrap`) — rate limit implementado (E10, `ThrottlerGuard`)
- [x] Login / refresh / logout (access `15m`, refresh `7d`; claims §5.2 de [05-api](./05-api.md))
- [x] JwtAuthGuard + RolesGuard
- [x] Decorator @CurrentUser()

## Fase 3 — Integrações

- [x] CRUD de integrações com tenant scoping (PATCH parcial — [05-api §5.3](./05-api.md#patch-integrationsid))
- [x] Listagem paginada ([05-api §5.0](./05-api.md#50-paginação-listagens) + filtro `isActive` — [§5.3](./05-api.md#get-integrations))
- [x] Serviço HTTP para disparo
- [x] Registro de execuções (`responseBody` truncado em 10 240 bytes)

## Fase 4 — Histórico

- [x] Ordenação execuções (`executedAt DESC`)
- [x] Listagem paginada com filtros ([05-api §5.0](./05-api.md#50-paginação-listagens) + `status`, `from`/`to`)
- [x] Detalhe de execução (tenant via `Integration`)

## Fase 5 — Frontend

- [ ] Cliente HTTP (`src/api/client.ts`) com base `/api/v1`
- [ ] Interceptor 401 → refresh → logout
- [ ] Proxy Vite dev (`/api` → `api:3000`, rede Docker)
- [ ] Login + logout + token storage (`localStorage`)
- [ ] Bootstrap (cadastro tenant + admin)
- [ ] Integrações — listar (ADMIN + VIEWER)
- [ ] Integrações — criar / editar / desativar / excluir (ADMIN)
- [ ] Trigger manual (ADMIN)
- [ ] Histórico — listagem, filtros, detalhe execução
- [ ] Controle de UI por role (ocultar ações de escrita para VIEWER)

## Fase 6 — Polish

- [x] `.env.example` completo
- [x] README com decisões
- [x] Testes críticos (auth, tenant isolation, trigger, scoping de execuções — ver [10-criterios](./10-criterios.md)) — **obrigatório**
- [ ] (Bônus) cobertura E2E/unitária extra
- [ ] (Bônus) n8n workflow
