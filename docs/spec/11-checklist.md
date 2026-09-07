# 11. Checklist de implementação

[← Índice](./README.md)

> Prisma 8: seguir `nexus-backend/.agents/skills/prisma-8/SKILL.md` em tarefas de contract, migration e query.

## Fase 1 — Fundação

- [x] Domínio Prisma 8 (`contract.prisma` + migrations)
- [x] `DatabaseModule` (wrapper do client Prisma)
- [x] Bootstrap da aplicação NestJS (`main.ts`, prefixo `api/v1`, `GET /health`)
- [x] Seed idempotente (`src/prisma/seed.ts`) — 2 tenants × 3 integrações × 10 execuções ([04-modelo-dados §4.4](./04-modelo-dados.md#44-seed))
- [x] Docker Compose (`database` + `api` + `frontend` dev — F01; `frontend` prod com nginx — F12)

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

> Stack: React 19 + Vite 8 + Tailwind 4 + shadcn (`base-lyra`/Base UI) + React Router 7 + TanStack Query v5 + react-hook-form/zod.

- [x] Scaffold Vite + React 19 + TypeScript + Tailwind 4 + shadcn (11 componentes base)
- [x] **F01** Dependências, Vitest, proxy Vite (`/api` → `api:3000`) e **serviço `frontend` no compose de desenvolvimento**
- [x] **F02** Tipos da API + cliente HTTP (`shared/api/client.ts`, base `/api/v1`) + storage dos tokens
- [x] **F02** Interceptor 401 → refresh **single-flight** → logout (+ teste)
- [x] **F03** Providers, router (`createBrowserRouter`), `ProtectedRoute` e `RoleGate` (+ teste)
- [x] **F04** Login + logout + reidratação de sessão (`GET /auth/me`)
- [x] **F05** Bootstrap (cadastro de tenant + admin)
- [x] **F06** Shell (topbar, tema, toasts) e componentes compartilhados (`DataTable`, paginação, vazio, erro)
- [x] **F07** Integrações — listar com filtro `isActive` e paginação (ADMIN + VIEWER)
- [x] **F08** Integrações — criar / editar (`authKey` nunca pré-preenchida; PATCH só do que mudou)
- [x] **F09** Integrações — ativar/desativar, excluir e disparar (ADMIN)
- [x] **F10** Histórico — listagem por integração com filtros `status`/`from`/`to`
- [x] **F11** Histórico — detalhe da execução (`requestPayload`, `responseBody` truncado)
- [x] **F12** Docker de produção (`frontend` + nginx) + job CI + READMEs

## Fase 6 — Polish

- [x] `.env.example` completo
- [x] README com decisões
- [x] Testes críticos (auth, tenant isolation, trigger, scoping de execuções — ver [10-criterios](./10-criterios.md)) — **obrigatório**
- [ ] (Bônus) cobertura E2E/unitária extra
- [x] (Bônus) n8n workflow
- [x] (Extra) Evolution API — segundo workflow do n8n enviando WhatsApp real
