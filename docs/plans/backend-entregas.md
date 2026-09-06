# Plano de Entregas — Backend Commandix PoC

> **Objetivo:** implementar o backend em slices pequenos, cada um entregando valor testável com diff mínimo.  
> **Fonte de verdade:** [`AGENTS.md`](../../AGENTS.md), [`docs/spec/`](../spec/README.md), checklist [`11-checklist.md`](../spec/11-checklist.md).

---

## Princípios de entrega

1. **Uma entrega = um PR/revisão** — evitar mega-commits que misturam domínio, auth e integrações.
2. **Backend first** — ordem: fundação → auth → integrações → execuções → infra Docker → testes críticos.
3. **Testável ao final de cada slice** — curl, Vitest ou ambos; não avançar sem critério de done atendido.
4. **Escopo mínimo** — só o que a spec pede; sem módulo `users/`, sem features bônus.
5. **Multi-tenancy desde o primeiro service de negócio** — `tenantId` do JWT, nunca do body.
6. **Imports** — alias `@/` → `src/`; sufixo `.js` (ver `AGENTS.md` § Convenções).

---

## Estado atual (baseline)

| Item | Status |
|------|--------|
| NestJS 12 starter | ✅ |
| Global prefix `api/v1` | ✅ (`main.ts`) |
| Prisma 8 — domínio Commandix | ✅ (`contract.prisma` + migrations) |
| Seed idempotente | ✅ (`src/prisma/seed.ts`) |
| `GET /api/v1/health` | ✅ |
| Módulos de negócio | ✅ `auth`, `tenants`, `integrations`, `executions`, `common`, `openapi` — ver [Concluído](#concluído-e01e19-por-fase) |
| `DatabaseModule` | ✅ |
| `ValidationPipe` / CORS | ✅ |
| Docker Compose | ⚠️ `database` + `api` prontos (dev e prod); `frontend` pendente |
| Testes críticos | ✅ — ver [10-criterios](../spec/10-criterios.md) |

E01–E19 (fundação → testes críticos) estão entregues — detalhe por fase em [Concluído](#concluído-e01e19-por-fase). Backend só falta o frontend (Fase 5, fora deste documento) e itens de bônus.

---

## Dependências npm (adicionar quando necessário)

| Pacote | Entrega |
|--------|---------|
| `class-validator`, `class-transformer` | E03/E06 |
| `bcrypt`, `@types/bcrypt` | E04/E06/E07 |
| `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `@types/passport-jwt` | E07/E08 |
| `@nestjs/throttler` | E10 |

Usar versões mais recentes compatíveis com NestJS 12.

---

## Referências rápidas

| Tópico | Documento |
|--------|-----------|
| Modelo de dados | [04-modelo-dados.md](../spec/04-modelo-dados.md) |
| Contrato API | [05-api.md](../spec/05-api.md) |
| Docker / env | [08-docker.md](../spec/08-docker.md) |
| Checklist completo | [11-checklist.md](../spec/11-checklist.md) |
| Regras NestJS | [.agents/rules/nestjs-backend.mdc](../../.agents/rules/nestjs-backend.mdc) |
| Prisma 8 | [nexus-backend/.agents/skills/prisma-8/SKILL.md](../../nexus-backend/.agents/skills/prisma-8/SKILL.md) |
