# AGENTS.md — Commandix PoC

Contexto para agentes de IA trabalhando neste repositório.

## Projeto

**Commandix PoC** (codename interno: **Nexus**) — módulo de gestão de integrações multi-tenant para plataforma de automação B2B. Desafio técnico de processo seletivo.

**Spec completa:** [`docs/spec/`](./docs/spec/README.md)

## Estado atual

| Componente | Status |
|------------|--------|
| `nexus-backend/` | NestJS 12 starter (ESM, Vitest) — **sem módulos de negócio** |
| `nexus-frontend/` | **Não criado** |
| Prisma / PostgreSQL | **Não configurado** |
| Docker Compose | **Não criado** |

## Arquitetura alvo

Monorepo com API NestJS + React (Vite) + PostgreSQL via Docker Compose.

```
Frontend (React) → API (NestJS) → PostgreSQL (Prisma)
                        ↓
                 Serviços externos (webhook, REST, n8n)
```

Módulos backend: `auth`, `tenants`, `integrations`, `executions`, `prisma`, `common`.

## Convenções

### Geral

- **Sempre TypeScript** — backend, frontend, seed, scripts de app; sem `.js` para código de negócio
- Idioma do código: **inglês** (nomes de variáveis, rotas, enums)
- Idioma da documentação: **português**
- Commits: só quando o usuário pedir
- Escopo mínimo: implementar só o necessário para a spec

### Backend (NestJS)

- ESM com sufixo `.js` nos imports relativos (`import { X } from './x.js'`)
- Um módulo por domínio (`auth.module.ts`, `integrations.module.ts`)
- DTOs com `class-validator`; `ValidationPipe` global com `whitelist: true`
- Guards: `JwtAuthGuard` → `RolesGuard` → tenant scoping no service
- Nunca expor `passwordHash` ou `authKey` completo nas respostas
- Cross-tenant access → `NotFoundException` (404), não 403

### Banco (Prisma)

- UUIDs como PK
- Migrations versionadas; rodar com `prisma migrate deploy` no Docker
- Seed em `prisma/seed.ts` com tenant + admin + viewer + integração demo
- Índices em `tenantId` e campos de filtro (`executedAt`, `status`)

### Frontend (React)

- Vite + TypeScript
- Rotas protegidas com redirect para login
- Tokens em `localStorage` ou `sessionStorage` (documentar escolha)
- Interceptor para refresh automático em 401
- UI funcional, sem foco em design

### Testes

- Vitest (já no backend)
- Prioridade: tenant isolation, auth guards, trigger service
- E2E com supertest para fluxos críticos

## Comandos úteis

```bash
# Docker — sobe postgres + api + frontend
docker compose up --build
```

## Decisões técnicas esperadas (documentar no README)

- Estratégia de multi-tenancy (JWT tenantId + query filter)
- Tratamento de secrets (`authKey` — criptografia vs. mascaramento)
- Timeout e retry no disparo HTTP
- Soft delete vs. hard delete de integrações
- Truncamento de `responseBody` em execuções

## O que NÃO fazer

- Não criar abstrações prematuras (repositórios genéricos, CQRS)
- Não adicionar features fora da spec (OAuth social, 2FA, rate limiting avançado)
- Não usar GraphQL
- Não escrever código de aplicação em JavaScript puro (usar TypeScript)
- Não commitar `.env` ou secrets
- Não ignorar tenant scoping em nenhuma query

## Arquivos de referência

| Arquivo | Conteúdo |
|---------|----------|
| `docs/spec/` | Spec funcional, API, schema, checklist (por arquivo) |
| `.cursor/rules/*.mdc` | Regras por domínio para o Cursor |
| `readme.md` | Setup, seed, decisões do candidato |

## Fluxo de trabalho sugerido para IA

1. Ler o arquivo relevante em `docs/spec/`
2. Verificar [checklist](./docs/spec/11-checklist.md) antes e depois da tarefa
3. Seguir regras em `.cursor/rules/`
4. Implementar com diff mínimo
5. Rodar testes/lint antes de declarar concluído
6. Atualizar README apenas quando pedido ou ao finalizar fase
