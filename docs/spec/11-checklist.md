# 11. Checklist de implementação

[← Índice](./README.md)

## Fase 1 — Fundação

- [ ] Prisma schema + migration inicial
- [ ] Docker Compose (postgres + api + frontend)
- [ ] Módulo Prisma global
- [ ] Seed com tenant e usuários

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
- [ ] Detalhe de execução

## Fase 5 — Frontend

- [ ] Login + token storage
- [ ] Lista de integrações
- [ ] Trigger manual
- [ ] Histórico com filtros

## Fase 6 — Polish

- [ ] `.env.example` completo
- [ ] README com decisões
- [ ] Testes críticos (auth, tenant isolation)
- [ ] (Bônus) n8n workflow
