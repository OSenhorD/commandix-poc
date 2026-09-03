# 11. Checklist de implementação

[← Índice](./README.md)

> Prisma 8: seguir `nexus-backend/.cursor/skills/prisma-8/SKILL.md` em tarefas de contract, migration e query.

## Fase 1 — Fundação

- [ ] Domínio em `src/prisma/contract.prisma` (§4 de [modelo de dados](./04-modelo-dados.md))
- [ ] `npm run contract:emit`
- [ ] Migration inicial: `migration plan --name initial` → commit em `migrations/app/`
- [ ] `DatabaseModule` (wrapper injectable de `db`)
- [ ] Seed idempotente em `src/prisma/seed.ts`
- [ ] Docker Compose (postgres + api + frontend)
- [ ] Entrypoint: `db migrate` → seed → start

## Fase 2 — Auth

- [ ] Bootstrap de tenant
- [ ] Login / refresh / logout
- [ ] JwtAuthGuard + RolesGuard
- [ ] Decorator @CurrentUser()

## Fase 3 — Integrações

- [ ] CRUD de integrações com tenant scoping
- [ ] Serviço HTTP para disparo
- [ ] Registro de execuções

## Fase 4 — Histórico

- [ ] Listagem paginada com filtros
- [ ] Detalhe de execução (tenant via `Integration`)

## Fase 5 — Frontend

- [ ] Login + logout + token storage (`localStorage`) + interceptor refresh
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
