# 11. Checklist de implementação

[← Índice](./README.md)

> Prisma 8: seguir `nexus-backend/.agents/skills/prisma-8/SKILL.md` em tarefas de contract, migration e query.

## Fase 1 — Fundação

- [x] Domínio Prisma 8 (`contract.prisma` + migrations)
- [x] `DatabaseModule` (wrapper do client Prisma)
- [x] Bootstrap da aplicação NestJS (`main.ts`, prefixo `api/v1`, `GET /health`)
- [x] Seed idempotente (`src/prisma/seed.ts`)
- [ ] Docker Compose (`database` + `api` ✅; serviço `frontend` pendente — entrega **F12** de [`docs/plans/frontend.md`](../plans/frontend.md))

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

> Plano detalhado, com critério de done por entrega: [`docs/plans/frontend.md`](../plans/frontend.md).
> Stack: React 19 + Vite 8 + Tailwind 4 + shadcn (`base-lyra`/Base UI) + React Router 7 + TanStack Query v5 + react-hook-form/zod.

- [x] Scaffold Vite + React 19 + TypeScript + Tailwind 4 + shadcn (11 componentes base)
- [ ] **F01** Dependências, Vitest, proxy Vite (`/api` → `api:3000`) e **serviço `frontend` no compose de desenvolvimento**
- [ ] **F02** Tipos da API + cliente HTTP (`shared/api/client.ts`, base `/api/v1`) + storage dos tokens
- [ ] **F02** Interceptor 401 → refresh **single-flight** → logout (+ teste)
- [ ] **F03** Providers, router (`createBrowserRouter`), `ProtectedRoute` e `RoleGate` (+ teste)
- [ ] **F04** Login + logout + reidratação de sessão (`GET /auth/me`)
- [ ] **F05** Bootstrap (cadastro de tenant + admin)
- [ ] **F06** Shell (topbar, tema, toasts) e componentes compartilhados (`DataTable`, paginação, vazio, erro)
- [ ] **F07** Integrações — listar com filtro `isActive` e paginação (ADMIN + VIEWER)
- [ ] **F08** Integrações — criar / editar (`authKey` nunca pré-preenchida; PATCH só do que mudou)
- [ ] **F09** Integrações — ativar/desativar, excluir e disparar (ADMIN)
- [ ] **F10** Histórico — listagem por integração com filtros `status`/`from`/`to`
- [ ] **F11** Histórico — detalhe da execução (`requestPayload`, `responseBody` truncado)
- [ ] **F12** Docker (Dockerfiles, nginx, serviço `frontend` nos dois composes) + CI + READMEs

## Fase 6 — Polish

- [x] `.env.example` completo
- [x] README com decisões
- [x] Testes críticos (auth, tenant isolation, trigger, scoping de execuções — ver [10-criterios](./10-criterios.md)) — **obrigatório**
- [ ] (Bônus) cobertura E2E/unitária extra
- [ ] (Bônus) n8n workflow
