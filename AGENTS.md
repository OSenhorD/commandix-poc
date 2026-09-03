# AGENTS.md — Commandix PoC

Contexto para agentes de IA trabalhando neste repositório.

## Projeto

**Commandix PoC** (codename interno: **Nexus**) — módulo de gestão de integrações multi-tenant para plataforma de automação B2B. Desafio técnico de processo seletivo.

**Spec completa:** [`docs/spec/`](./docs/spec/README.md)  
**Revisão de planejamento (brechas resolvidas):** [`docs/spec/12-revisao-planejamento.md`](./docs/spec/12-revisao-planejamento.md)

## Estado atual

| Componente | Status |
|------------|--------|
| `nexus-backend/` | NestJS 12 starter — **Prisma 8 inicializado**; sem módulos de negócio |
| `nexus-frontend/` | **Não criado** |
| Prisma 8 | `src/prisma/contract.prisma` + `db.ts` — modelos demo a substituir |
| Docker Compose | **Não criado** |

## Arquitetura alvo

Monorepo com API NestJS + React (Vite) + PostgreSQL via Docker Compose.

```
Frontend (React) → API (NestJS) → PostgreSQL (Prisma 8)
                        ↓
                 Serviços externos (webhook, REST, n8n)
```

Módulos backend: `auth`, `tenants`, `integrations`, `executions`, `database` (wrapper do client Prisma), `common`.

> O módulo `users/` é **fora de escopo** — bootstrap cria o admin; novos usuários não são requisito da PoC.

## Monorepo

| Pacote | Diretório | Notas |
|--------|-----------|-------|
| API | `nexus-backend/` | NestJS + Prisma 8; `prisma.config.ts` e skills aqui |
| Frontend | `nexus-frontend/` | A criar |
| Spec / rules | raiz | `docs/spec/`, `.cursor/rules/` |
| Skills Prisma | `nexus-backend/.cursor/skills/prisma-8/` | Symlink na raiz: `.cursor/skills/prisma-8/` |

**Workspace:** abrir `commandix-poc/` (raiz). Comandos Prisma: `cd nexus-backend` antes de `contract emit`, `db migrate`, etc.

## Decisões adotadas

Padrões normativos para implementação. Detalhes e rationale em [`12-revisao-planejamento.md`](./docs/spec/12-revisao-planejamento.md).

| Tópico | Decisão |
|--------|---------|
| Versões | **Sempre as mais recentes** — runtime, frameworks, ORM e imagens Docker; ver `engines`/`package.json` |
| ORM | **Prisma 8** — contract em `src/prisma/contract.prisma`, client em `src/prisma/db.ts` |
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

### Banco (Prisma 8)

- **Skill (obrigatória em tarefas Prisma):** `nexus-backend/.cursor/skills/prisma-8/SKILL.md` — abrir a routing table antes de codar
- Contract: `nexus-backend/src/prisma/contract.prisma`
- Client: `src/prisma/db.ts` → wrapper NestJS `DatabaseModule` / `DatabaseService`
- Após editar contract: `npm run contract:emit`
- Dev local (schema em fluxo): `npx prisma db update`
- Mudanças versionadas (branch/Docker): `npx prisma migration plan --name <slug>` → `npx prisma db migrate`
- Primeira bootstrap (DB vazio): `npx prisma db init`
- Migrations: `nexus-backend/migrations/app/` (commitar)
- Domínio: [`docs/spec/04-modelo-dados.md`](./docs/spec/04-modelo-dados.md) §4.1–4.3
- Seed: `src/prisma/seed.ts` idempotente; senha `Admin123!`
- Scripts one-off: `await db.close()` ao final (ver skill `references/runtime.md`)

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

# Prisma 8 — backend (ver skill prisma-8/SKILL.md)
cd nexus-backend
npm run contract:emit              # após editar contract.prisma
npx prisma db update               # dev: sync rápido
npx prisma migration plan --name x # versionado: gera migration
npx prisma db migrate              # aplica migrations pendentes
```

## O que NÃO fazer

- Não fixar versões antigas quando existe release mais recente compatível — exceto se o usuário pedir pin explícito
- Não usar Prisma ORM 7 (`PrismaClient`, `schema.prisma`, `migrate deploy`)
- Não editar `contract.json` / `contract.d.ts` manualmente
- Não colocar `DATABASE_URL` em `prisma.config.ts`
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
| `.cursor/rules/*.mdc` | Regras por domínio (raiz do monorepo) |
| `.cursor/skills/prisma-8/` | Symlink → skill Prisma 8 |
| `nexus-backend/.cursor/skills/prisma-8/` | Fonte da skill (sync via `npm run skills:sync`) |
| `readme.md` | Setup, seed, decisões do candidato |

## Fluxo de trabalho sugerido para IA

1. Ler o arquivo relevante em `docs/spec/`
2. Consultar **decisões adotadas** neste arquivo antes de implementar
3. Verificar [checklist](./docs/spec/11-checklist.md) antes e depois da tarefa
4. Tarefas Prisma → ler `nexus-backend/.cursor/skills/prisma-8/SKILL.md` primeiro
5. Seguir regras em `.cursor/rules/`
6. Implementar com diff mínimo
7. Rodar testes/lint antes de declarar concluído
8. Atualizar README apenas quando pedido ou ao finalizar fase
