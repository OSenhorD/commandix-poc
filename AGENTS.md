# AGENTS.md — Commandix PoC

Contexto para agentes de IA trabalhando neste repositório.

## Projeto

**Commandix PoC** (codename interno: **Nexus**) — módulo de gestão de integrações multi-tenant para plataforma de automação B2B. Desafio técnico de processo seletivo.

**Spec completa:** [`docs/spec/`](./docs/spec/README.md)  
**Revisão de planejamento (brechas resolvidas):** [`docs/spec/12-revisao-planejamento.md`](./docs/spec/12-revisao-planejamento.md)

## Estado atual

| Componente | Status |
|------------|--------|
| `nexus-backend/` | NestJS 12 starter (ESM, Vitest) — **Prisma Next inicializado**; sem módulos de negócio |
| `nexus-frontend/` | **Não criado** |
| Prisma Next | `src/prisma/contract.prisma` + `db.ts` — modelos demo a substituir pelo domínio |
| Docker Compose | **Não criado** |

## Arquitetura alvo

Monorepo com API NestJS + React (Vite) + PostgreSQL via Docker Compose.

```
Frontend (React) → API (NestJS) → PostgreSQL (Prisma Next)
                        ↓
                 Serviços externos (webhook, REST, n8n)
```

Módulos backend: `auth`, `tenants`, `integrations`, `executions`, `database` (wrapper do client Prisma), `common`.

> O módulo `users/` é **fora de escopo** — bootstrap cria o admin; novos usuários não são requisito da PoC.

## Decisões adotadas

Padrões normativos para implementação. Detalhes e rationale em [`12-revisao-planejamento.md`](./docs/spec/12-revisao-planejamento.md).

| Tópico | Decisão |
|--------|---------|
| Versões | **Sempre as mais recentes** — runtime, frameworks, ORM e imagens Docker; ver `engines`/`package.json` |
| ORM | **Prisma Next** (v8 RC) — contract em `src/prisma/contract.prisma`, client em `src/prisma/db.ts` |
| Multi-tenancy | `tenantId` no JWT + filtro explícito no **service** (não confiar em body/query) |
| Cross-tenant | `NotFoundException` (404), nunca 403 |
| Role insuficiente | 403 |
| Tenant UK | Apenas `slug` único; `name` é descritivo |
| Email UK | Global (um email = um tenant) |
| `IntegrationType` | Metadado; disparo HTTP idêntico para `WEBHOOK`, `REST_API`, `N8N` |
| Desativar integração | `PATCH { isActive: false }` |
| DELETE integração | Hard delete + cascade em execuções |
| Trigger inativo | Rejeitar (integração deve estar `isActive: true`) |
| HTTP outbound | POST; timeout 30s; sem retry |
| Merge payload | Shallow: `{ ...defaultPayload, ...payload }` |
| `authKey` outbound | `Authorization: Bearer {authKey}` se presente |
| `authKey` PATCH | Omitido = mantém valor anterior |
| `customHeaders` vs auth | `customHeaders` aplicados primeiro; `Authorization` de `authKey` sobrescreve se ambos existirem |
| SUCCESS / FAILURE | SUCCESS = HTTP 2xx recebido; FAILURE = timeout, erro de rede ou HTTP não-2xx |
| Erro de rede | `FAILURE`, `httpStatusCode: null` |
| Execuções — tenant | Sempre validar via join/relação com `Integration.tenantId` (tabela não tem `tenantId`) |
| Ordenação execuções | `executedAt DESC` |
| Truncamento | `responseBody` limitado a 10 KB |
| Filtros de data | ISO 8601; `from`/`to` inclusive |
| Frontend UI | Login + lista integrações + trigger (admin) + histórico; **CRUD via API** (sem forms create/edit na UI) |
| Tokens frontend | `localStorage` |
| CORS (dev) | `http://localhost:5173` |
| Seed Docker | Idempotente; pula se tenant `acme` existir |
| Node | 24.x (ver `engines` em `nexus-backend/package.json`) |

## Convenções

### Geral

- **Versões mais recentes** — preferir sempre a última versão estável (ou RC, se for o único caminho da stack escolhida) de runtime, frameworks, bibliotecas e imagens Docker; alinhar `package.json`, `engines` e Dockerfiles
- **Sempre TypeScript** — backend, frontend, seed, scripts de app; sem `.js` para código de negócio
- Idioma do código: **inglês** (nomes de variáveis, rotas, enums)
- Idioma da documentação: **português**
- Commits: só quando o usuário pedir
- Escopo mínimo: implementar só o necessário para a spec

### Backend (NestJS)

- ESM com sufixo `.js` nos imports relativos (`import { X } from './x.js'`)
- Um módulo por domínio (`auth.module.ts`, `integrations.module.ts`)
- DTOs com `class-validator`; `ValidationPipe` global com `whitelist: true, transform: true`
- Global prefix: `api/v1`
- Guards: `JwtAuthGuard` → `RolesGuard` → tenant scoping no service
- JWT payload: `{ sub: userId, tenantId, role, email }`
- Nunca expor `passwordHash`, `tokenHash` ou `authKey` completo nas respostas
- Mascarar `authKey` na resposta (ex.: `****-key`)
- Cross-tenant access → `NotFoundException` (404), não 403
- CORS habilitado para frontend local
- `GET /api/v1/health` — healthcheck para Docker

### Banco (Prisma Next)

- Contract: `nexus-backend/src/prisma/contract.prisma`
- Client: `import { db } from './prisma/db.js'` (wrapper NestJS injectable recomendado)
- Após alterar contract: `npm run contract:emit`
- Schema de domínio: [`docs/spec/04-modelo-dados.md`](./docs/spec/04-modelo-dados.md) §4.2 (adaptar sintaxe Prisma Next)
- PKs: UUID (`@default(uuid())`)
- Índices em FKs (`tenantId`, `integrationId`) e campos de filtro (`executedAt`, `status`)
- Seed: script idempotente com tenant + admin + viewer + integração demo
- Senha seed: `Admin123!` (documentada no readme)

> **Nota:** docs `04`, `07`, `08` ainda referenciam Prisma clássico (`prisma/schema.prisma`, `migrate deploy`). Seguir **este arquivo** e `.cursor/rules/prisma-database.mdc` como fonte de verdade para ORM.

### Frontend (React)

- Vite + React 19 + TypeScript
- React Router v6+ — rotas protegidas com redirect para login
- Tokens em `localStorage`
- Interceptor: em 401, tenta refresh; se falhar, logout
- UI funcional, sem foco em design; HTML/CSS simples (sem biblioteca UI pesada)

### Testes

- Vitest (já no backend)
- Prioridade: tenant isolation, auth guards, trigger service, scoping de execuções
- E2E com supertest para fluxos críticos

## Comandos úteis

```bash
# Docker — sobe postgres + api + frontend (após implementação)
docker compose up --build

# Prisma Next — backend
cd nexus-backend
npm run contract:emit    # após editar contract.prisma
npx prisma db init       # criar/atualizar tabelas (dev)
```

## O que NÃO fazer

- Não fixar versões antigas quando existe release mais recente compatível — exceto se o usuário pedir pin explícito
- Não usar Prisma clássico (`PrismaClient`, `prisma/schema.prisma`) — projeto adotou Prisma Next
- Não criar abstrações prematuras (repositórios genéricos, CQRS)
- Não adicionar features fora da spec (OAuth social, 2FA, rate limiting avançado, CRUD de usuários)
- Não usar GraphQL
- Não escrever código de aplicação em JavaScript puro
- Não commitar `.env` ou secrets
- Não ignorar tenant scoping em nenhuma query — **incluindo execuções**
- Não query `IntegrationExecution` por `id` sem validar tenant via `Integration`

## Arquivos de referência

| Arquivo | Conteúdo |
|---------|----------|
| `docs/spec/` | Spec funcional, API, schema, checklist |
| `docs/spec/12-revisao-planejamento.md` | Brechas, ambiguidades, decisões |
| `.cursor/rules/*.mdc` | Regras por domínio para o Cursor |
| `readme.md` | Setup, seed, decisões do candidato |

## Fluxo de trabalho sugerido para IA

1. Ler o arquivo relevante em `docs/spec/`
2. Consultar **decisões adotadas** neste arquivo antes de implementar
3. Verificar [checklist](./docs/spec/11-checklist.md) antes e depois da tarefa
4. Seguir regras em `.cursor/rules/`
5. Implementar com diff mínimo
6. Rodar testes/lint antes de declarar concluído
7. Atualizar README apenas quando pedido ou ao finalizar fase
