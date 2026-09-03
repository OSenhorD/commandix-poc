# AGENTS.md — Commandix PoC

Contexto para agentes de IA trabalhando neste repositório.

## Projeto

**Commandix PoC** (codename interno: **Nexus**) — módulo de gestão de integrações multi-tenant para plataforma de automação B2B. Desafio técnico de processo seletivo.

**Spec completa:** [`docs/spec/`](./docs/spec/README.md)

## Estado atual

| Componente | Status |
|------------|--------|
| `nexus-backend/` | Domínio Prisma 8 + migration + seed; Docker (Dockerfile + entrypoint); sem módulos de negócio |
| `nexus-frontend/` | **Não criado** |
| Prisma 8 | `contract.prisma` — domínio Commandix; migration `20260903T0509_initial` |
| Docker Compose | **postgres + api** (`docker compose up --build`); frontend pendente |

## Arquitetura alvo

Monorepo com API NestJS + React (Vite) + PostgreSQL via Docker Compose.

```
Frontend (React) → API (NestJS) → PostgreSQL (Prisma 8)
                        ↓
                 Serviços externos (webhook, REST, n8n)
```

Módulos backend: `auth`, `tenants`, `integrations`, `executions`, `database` (wrapper do client Prisma), `common`.

> O módulo `users/` é **fora de escopo**. **Única criação de usuários:** `POST /tenants/bootstrap` (tenant + primeiro `ADMIN`). Sem convite ou CRUD de `VIEWER`/`ADMIN`.

## Monorepo

| Pacote | Diretório | Notas |
|--------|-----------|-------|
| API | `nexus-backend/` | NestJS + Prisma 8; `prisma.config.ts` e skills aqui |
| Frontend | `nexus-frontend/` | A criar |
| Spec / rules | raiz | `docs/spec/`, `.cursor/rules/` |
| Skills Prisma | `nexus-backend/.cursor/skills/prisma-8/` | Symlink na raiz: `.cursor/skills/prisma-8/` |

**Workspace:** abrir `commandix-poc/` (raiz). Comandos Prisma: `cd nexus-backend` antes de `contract emit`, `db migrate`, etc.

## Decisões adotadas

| Tópico | Decisão |
|--------|---------|
| Versões | **Sempre as mais recentes** — runtime, frameworks, ORM e imagens Docker; ver `engines`/`package.json` |
| ORM | **Prisma 8** — contract em `src/prisma/contract.prisma`, client em `src/prisma/db.ts` |
| Multi-tenancy | `tenantId` no JWT + filtro explícito no **service** (não confiar em body/query) |
| Cross-tenant | `NotFoundException` (404), nunca 403 |
| Role insuficiente | 403 |
| Tenant | `slug` UK global; `name` descritivo (sem UK) |
| Email UK | Global (um email = um tenant) |
| `IntegrationType` | Metadado; disparo HTTP idêntico para `WEBHOOK`, `REST_API`, `N8N` |
| Desativar integração | `PATCH { isActive: false }` |
| DELETE integração | Hard delete + cascade em execuções |
| Trigger inativo | Rejeitar (integração deve estar `isActive: true`) |
| HTTP outbound | **Sempre POST**; timeout 30s; **sem retry** |
| `authKey` at-rest | Texto ou criptografia — candidato documenta no README final |
| Merge payload | Shallow: `{ ...defaultPayload, ...payload }` |
| `authKey` outbound | `Authorization: Bearer {authKey}` se presente |
| `authKey` PATCH | Omitido = mantém valor anterior |
| `customHeaders` vs auth | `customHeaders` aplicados primeiro; `Authorization` de `authKey` sobrescreve se ambos existirem |
| SUCCESS / FAILURE | API externa retornou sucesso (HTTP 2xx) → `SUCCESS`; senão → `FAILURE` |
| Erro de rede / timeout | `FAILURE`, `httpStatusCode: null` |
| Execuções — tenant | Sempre validar via join/relação com `Integration.tenantId` (tabela não tem `tenantId`) |
| Ordenação execuções | `executedAt DESC` |
| Truncamento | `responseBody` limitado a **10 240 bytes** UTF-8 (+ sufixo `… [truncated]` se cortado) |
| PATCH integração | Parcial — todos os campos opcionais; `authKey` omitido mantém; JSON substitui inteiro |
| Filtros de data | ISO 8601/RFC 3339; UTC; `from`/`to` **inclusive**; date-only `YYYY-MM-DD` → dia inteiro UTC; `from > to` → 400 |
| Paginação | Envelope `{ data, meta }` — `page`/`limit` (default 20, máx. 100); `meta`: `total`, `totalPages`, `hasNextPage`, `hasPreviousPage` — [05-api §5.0](./docs/spec/05-api.md#50-paginação-listagens) |
| Listagem integrações | Filtro opcional `isActive`; `updatedAt DESC` — [05-api §5.3](./docs/spec/05-api.md#get-integrations) |
| Frontend UI | **Escopo completo do protótipo** — login, logout, bootstrap, CRUD integrações (admin), trigger, histórico + detalhe; viewer somente leitura |
| API URL (frontend) | Default **`/api/v1`** (relativo) — nginx (Docker) e proxy Vite (dev) encaminham para a API |
| Refresh 401 | Interceptor tenta `POST /auth/refresh`; falha → logout |
| JWT claims | `{ sub, tenantId, role, email }` — ver [05-api](./docs/spec/05-api.md) §5.2 |
| JWT access / refresh | `15m` / `7d` — `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` |
| Logout | Revoga **só** o refresh token do dispositivo atual; outras sessões permanecem |
| Bootstrap rate limit | `@nestjs/throttler` em `POST /tenants/bootstrap` — default 5 req / 60s por IP |
| Criação de usuários | **Somente bootstrap** (tenant + `ADMIN`); sem convite/CRUD de usuários; módulo `users/` fora de escopo |
| Health | `GET /api/v1/health` → `{ "status": "ok" }` — público; Docker healthcheck |
| Tokens frontend | `localStorage` |
| CORS (dev) | `http://localhost:5173` → API `:3000`; ver [08-docker §8.8](./docs/spec/08-docker.md#88-cors) |
| Seed Docker | Idempotente; pula se tenant `acme` existir |
| Seed no startup | **Sempre** no entrypoint Docker (`db migrate` → seed → start); idempotente — não re-insere se `acme` já existir; **decisão consciente da PoC**, não padrão de produção |
| Node | **24.16.0** — `engines` em `nexus-backend/package.json`; imagem Docker `node:24.16.0-alpine` |
| PostgreSQL | **16** (`postgres:16-alpine`) — alvo da app; atende mínimo Prisma Next 15+ |

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
- CORS habilitado em **dev local** — `origin: 'http://localhost:5173'` (frontend Vite `:5173`, API `:3000`); Docker com nginx: mesma origem, CORS desnecessário
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
- Seed: `src/prisma/seed.ts` idempotente; senha `Admin123!`; entrypoint Docker sempre executa seed (ver decisão acima)
- Scripts one-off: `await db.close()` ao final (ver skill `references/runtime.md`)

### Frontend (React)

- Vite + React 19 + TypeScript
- React Router v6+ — rotas protegidas com redirect para login
- **API base:** `/api/v1` (URL relativa; ver infra abaixo)
- Tokens em `localStorage`
- **Interceptor HTTP:** resposta 401 → tentar refresh → logout se falhar
- UI funcional com **todas as telas/ações do protótipo**; sem foco em design; HTML/CSS simples

**Infra API no frontend:**

| Ambiente | Como `/api/v1` chega na API |
|----------|----------------------------|
| Docker (nginx) | `location /api/` → proxy `http://api:3000` |
| Dev (`vite dev`) | `server.proxy['/api']` → `http://localhost:3000` |

`VITE_API_URL` é opcional (override); default no código: `/api/v1`. Evita quebrar ao acessar por IP/hostname diferente.

### Testes

- **Obrigatório (PoC):** Vitest + supertest — tenant isolation, auth guards, trigger service, scoping de execuções
- **Bônus:** cobertura E2E/unitária adicional além do mínimo crítico
- Ver [10-criterios](./docs/spec/10-criterios.md)

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
- Não adicionar features fora da spec (OAuth social, 2FA, rate limiting **global/avancado**, CRUD de usuários) — rate limit **básico no bootstrap** está no escopo
- Não usar GraphQL
- Não escrever código de aplicação em JavaScript puro
- Não commitar `.env` ou secrets
- Não ignorar tenant scoping em nenhuma query — **incluindo execuções**
- Não query `IntegrationExecution` por `id` sem validar tenant via `Integration`

## Arquivos de referência

| Arquivo | Conteúdo |
|---------|----------|
| `docs/spec/` | Spec funcional, API, schema, checklist |
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
