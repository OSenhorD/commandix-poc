# AGENTS.md — Commandix PoC

Contexto para agentes de IA trabalhando neste repositório.

## Projeto

**Commandix PoC** (codename interno: **Nexus**) — módulo de gestão de integrações multi-tenant para plataforma de automação B2B. Desafio técnico de processo seletivo.

**Spec completa:** [`docs/spec/`](./docs/spec/README.md)

## Estado atual

| Componente | Status |
|------------|--------|
| `nexus-backend/` | **Funcional** — módulos `auth`, `tenants`, `integrations`, `executions`, `common`, `openapi`, `database`; Prisma 8 (contract + migration + seed); Docker (Dockerfile + entrypoint); testes unitários + e2e (falta `test/executions-scoping.e2e-spec.ts`) |
| `nexus-frontend/` | **Em andamento (F01–F03)** — Vite 8 + React 19 + TS 6 + Tailwind 4 + shadcn; cliente HTTP (`apiFetch` + refresh single-flight), `AuthProvider`, router e guardas. Telas ainda placeholder (F04–F11). Plano: [`docs/plans/frontend.md`](./docs/plans/frontend.md) |
| Prisma 8 | `contract.prisma` — domínio Commandix; migration `20260903T0509_initial` |
| Docker Compose | **dev:** postgres + api + frontend; **prod:** postgres + api (`frontend` comentado — entrega F12) |

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
| Frontend | `nexus-frontend/` | F01–F03 feitos; telas F04–F12 em [`docs/plans/frontend.md`](./docs/plans/frontend.md) |
| Spec / rules | raiz | `docs/spec/`, `.agents/rules/` |
| Skills Prisma | `nexus-backend/.agents/skills/prisma-8/` | Sem symlink na raiz — ler direto neste caminho |

**Workspace:** abrir `commandix-poc/` (raiz). Comandos Prisma rodam **dentro do container `api`** (Compose de desenvolvimento): `docker compose -f docker/development/docker-compose.yml --project-directory . exec api <comando>` (`contract emit`, `db migrate`, etc.).

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
| Trigger inativo | Rejeitar com **`400`** — integração deve estar `isActive: true` (existe e é do tenant, então não é 404) |
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
| Campo `TimestamptzString` (Prisma 8) | Tipo JS é **`string`** (ISO) em input e output do ORM — não `Date`; filtros `.gte()`/`.lte()` precisam de `date.toISOString()` do lado da aplicação |
| Truncamento | `responseBody` limitado a **10 240 bytes** UTF-8 (+ sufixo `… [truncated]` se cortado) |
| PATCH integração | Parcial — todos os campos opcionais; `authKey` omitido mantém; JSON substitui inteiro |
| Filtros de data | ISO 8601/RFC 3339; UTC; `from`/`to` **inclusive**; date-only `YYYY-MM-DD` → dia inteiro UTC; `from > to` → 400 |
| Paginação | Envelope `{ data, meta }` — `page`/`limit` (default 20, máx. 100); `meta`: `total`, `totalPages`, `hasNextPage`, `hasPreviousPage` — [05-api §5.0](./docs/spec/05-api.md#50-paginação-listagens) |
| Listagem integrações | Filtro opcional `isActive`; `updatedAt DESC` — [05-api §5.3](./docs/spec/05-api.md#get-integrations) |
| Frontend UI | **Escopo completo do protótipo** — login, logout, bootstrap, CRUD integrações (admin), trigger, histórico + detalhe; viewer somente leitura |
| Frontend — stack | React 19 + Vite 8 + TS 6; Tailwind 4 (**CSS-first**, sem `tailwind.config.js`); shadcn estilo `base-lyra` sobre **`@base-ui/react`** (não Radix); lucide-react; React Router 7; TanStack Query v5; react-hook-form + zod; ESLint 10 |
| Frontend — estrutura | **Feature-sliced**: `app/`, `shared/`, `features/{auth,integrations,executions}/`. `components/ui/` **fica em `@/components/ui`** — `components.json` fixa esse alias; mover quebra o `shadcn add` |
| Frontend — imports | Alias `@/` → `src/` **sem** sufixo `.js` — ao contrário do backend, que exige `.js` |
| Frontend — `erasableSyntaxOnly` | Ligado no `tsconfig.app.json`: **sem `enum`, `namespace` ou parameter property** (`constructor(private x)`). Usar união `as const` e atribuir no corpo do construtor |
| Frontend — contexto React | Contexto e provider em arquivos separados (`*-context.ts` sem JSX + `*-provider.tsx`) — um arquivo que exporta componente **e** não-componente quebra o Fast Refresh |
| Frontend — lint | **ESLint 10 (`strictTypeChecked`)** no frontend; **oxlint** no backend. Um linter por pacote, proposital — não unificar |
| Prettier | Isolado por pacote — `nexus-backend/.prettierrc` (aspas simples, estilo Nest) e `nexus-frontend/.prettierrc` (aspas duplas). Sem `.prettierrc` na raiz; a extensão VS Code resolve a config mais próxima do arquivo |
| Frontend — sessão | `AuthProvider` (contexto) expõe `{ user, isLoading, login, logout, bootstrap }`; reidratação por `useQuery(["auth","me"])` → `GET /auth/me` |
| Frontend — estado de lista | Paginação e filtros vivem na **URL** (`useSearchParams`); a query key do TanStack Query deriva da URL — sobrevive ao reload e o link é compartilhável |
| Frontend — `authKey` no form | **Nunca** pré-preencher no formulário de edição: a API devolve a chave **mascarada** (`****-key`) e salvar isso destrói a credencial. Campo vazio = manter o valor atual |
| Frontend — PATCH | Enviar **só os campos alterados** (diff contra o valor carregado); `PATCH {}` vazio → `400`; `customHeaders`/`defaultPayload` substituem o objeto inteiro |
| Frontend — testes | Vitest + Testing Library (jsdom), `fetch` stubado — cobre **só** o cliente HTTP (refresh single-flight) e o gate de role |
| Frontend — `@testing-library/dom` | Peer **explícito** de `@testing-library/react` v16 — não entra no lockfile se omitido. Sem o pacote, o TypeScript resolve `render`/`screen` como tipo `error` e o ESLint (`strictTypeChecked` → `no-unsafe-return` / `no-unsafe-call`) reprova os testes |
| Proxy dev (Vite) | `server.proxy['/api']` → `VITE_API_PROXY_TARGET ?? 'http://api:3000'` (hostname da rede do Compose, nunca `localhost`) |
| nginx (prod) | Proxia **todo** o prefixo `/api/` — não só `/api/v1/` — para manter `/api/docs` e `/api/openapi.json` acessíveis; SPA com `try_files $uri $uri/ /index.html` |
| API URL (frontend) | Default **`/api/v1`** (relativo) — nginx (Docker, prod) e proxy Vite (Docker, dev) encaminham para a API |
| Refresh 401 | Interceptor **single-flight**: uma única promise de `POST /auth/refresh` compartilhada por chamadas concorrentes; sucesso → repete a original 1×; falha → limpa storage e vai para `/login`. `/auth/login` e `/auth/refresh` nunca entram no ciclo |
| JWT claims | `{ sub, tenantId, role, email }` — ver [05-api](./docs/spec/05-api.md) §5.2 |
| JWT access / refresh | `15m` / `7d` — `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` |
| Logout | Revoga **só** o refresh token do dispositivo atual; outras sessões permanecem |
| Bootstrap rate limit | `@nestjs/throttler` em `POST /tenants/bootstrap` — default 5 req / 60s por IP |
| Criação de usuários | **Somente bootstrap** (tenant + `ADMIN`); sem convite/CRUD de usuários; módulo `users/` fora de escopo |
| Health | `GET /api/v1/health` → `{ "status": "ok" }` — público; Docker healthcheck |
| Tokens frontend | `localStorage`, chaves `nexus.accessToken` / `nexus.refreshToken`, acessadas por `shared/lib/storage.ts` — **fora do React**, para o interceptor não depender da árvore de componentes |
| CORS (dev, container Vite) | `http://localhost:5173` → API `:3000`; ver [08-docker §8.8](./docs/spec/08-docker.md#88-cors) |
| Seed Docker | Idempotente; pula se tenant `acme` existir |
| Seed no startup | **Sempre** no entrypoint Docker (`db migrate` → seed → start); idempotente — não re-insere se `acme` já existir; **decisão consciente da PoC**, não padrão de produção |
| Node | **24.16.0** — `engines` em `nexus-backend/package.json`; imagem Docker `node:24.16.0-alpine` |
| Docker Compose (arquivos) | `docker/production/docker-compose.yml` e `docker/development/docker-compose.yml`; Dockerfiles em `nexus-backend/` (`docker/production/Dockerfile`/`docker/development/Dockerfile`) |
| PostgreSQL | **16** (`postgres:16-alpine`) — alvo da app; atende mínimo Prisma Next 15+ |
| Imports backend | Alias **`@/`** → `src/`; sufixo **`.js`** obrigatório; build com **`tsc-alias`** |
| CI | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — lint, test, build, Docker Compose |
| Pre-commit (Husky raiz) | `git diff --cached` no host; `format` / `lint` / `test:related` **dentro** dos containers (`api` / `frontend`, `exec -T`). Scripts aceitam arquivos (`npm run lint -- src/foo.ts`); sem args = projeto inteiro (CI). `*.e2e-spec.ts` fora do related. Compose de dev precisa estar no ar |

## Convenções

### Geral

- **Versões mais recentes** — preferir sempre a última versão estável (ou RC, se for o único caminho da stack escolhida) de runtime, frameworks, bibliotecas e imagens Docker; alinhar `package.json`, `engines` e Dockerfiles
- **Sempre TypeScript** — backend, frontend, seed, scripts de app; sem `.js` para código de negócio
- Idioma do código: **inglês** (nomes de variáveis, rotas, enums)
- Idioma da documentação: **português**
- Commits: só quando o usuário pedir
- Escopo mínimo: implementar só o necessário para a spec

### Backend (NestJS)

- **Imports ESM:** alias `@/` → `src/` (`tsconfig.json` → `paths: { "@/*": ["./src/*"] }`); sufixo `.js` obrigatório (`import { X } from '@/common/x.js'`)
- **Build:** `nest build && tsc-alias` reescreve `@/` em caminhos relativos no `dist/` (Node ESM não resolve aliases nativamente)
- **Relativos (`./`):** permitidos apenas entre arquivos do **mesmo diretório** (ex.: `auth.controller.ts` → `./auth.service.js`)
- Um módulo por domínio (`auth.module.ts`, `integrations.module.ts`)
- DTOs com `class-validator`; `ValidationPipe` global com `whitelist: true, transform: true`
- Global prefix: `api/v1`
- Guards: `JwtAuthGuard` → `RolesGuard` → tenant scoping no service
- JWT payload: `{ sub: userId, tenantId, role, email }`
- Nunca expor `passwordHash`, `tokenHash` ou `authKey` completo nas respostas
- Mascarar `authKey` na resposta (ex.: `****-key`)
- Cross-tenant access → `NotFoundException` (404), não 403
- Rota com prefixo top-level diferente do resto do módulo (ex.: `GET /executions/:id` vs. `GET /integrations/:integrationId/executions`): criar um **segundo `@Controller()`** no mesmo módulo (pode ficar no mesmo arquivo `*.controller.ts`) e registrar ambos em `controllers: []` — Nest não permite path absoluto por método dentro de um controller com prefixo próprio
- Validar tenant de uma entidade sem `tenantId` direto (ex.: `IntegrationExecution`) via `.include('relation', (r) => r.select('tenantId'))` no ORM Prisma 8 — evita duas queries separadas; comparar `entity.relation.tenantId !== tenantId` → 404
- CORS habilitado no **dev (container Vite)** — `origin: 'http://localhost:5173'` (frontend Vite `:5173`, API `:3000`, ambos em containers); prod com nginx: mesma origem, CORS desnecessário
- `GET /api/v1/health` — healthcheck para Docker

### Banco (Prisma 8)

- **Skill (obrigatória em tarefas Prisma):** `nexus-backend/.agents/skills/prisma-8/SKILL.md` — abrir a routing table antes de codar
- Contract: `nexus-backend/src/prisma/contract.prisma`
- Client: `src/prisma/db.ts` → wrapper NestJS `DatabaseModule` / `DatabaseService`
- Após editar contract: `npm run contract:emit`
- Dev (schema em fluxo): `npx prisma db update`
- Mudanças versionadas (branch/Docker): `npx prisma migration plan --name <slug>` → `npx prisma db migrate`
- Primeira bootstrap (DB vazio): `npx prisma db init`
- Todos os comandos acima rodam dentro do container `api` (Compose de desenvolvimento) — nunca no host
- Migrations: `nexus-backend/migrations/app/` (commitar)
- Domínio: [`docs/spec/04-modelo-dados.md`](./docs/spec/04-modelo-dados.md) §4.1–4.3
- Seed: `src/prisma/seed.ts` idempotente; senha `Admin123!`; entrypoint Docker sempre executa seed (ver decisão acima)
- Scripts one-off: `await db.close()` ao final (ver skill `references/runtime.md`)

### Frontend (React)

**Regras completas:** [`.agents/rules/react-frontend.mdc`](./.agents/rules/react-frontend.mdc). **Plano:** [`docs/plans/frontend.md`](./docs/plans/frontend.md).

- Stack: React 19 + Vite 8 + TypeScript 6; Tailwind 4 (CSS-first); shadcn `base-lyra` sobre `@base-ui/react`; React Router 7; TanStack Query v5; react-hook-form + zod
- Estrutura **feature-sliced** — `app/` (providers, router), `shared/` (api, types, lib, componentes transversais), `features/{auth,integrations,executions}/`, `components/ui/` (shadcn, alias fixo)
- Alias `@/` → `src/`, **sem** sufixo `.js`
- Tipagem estrita, **sem `any`** — ESLint roda regras type-checked
- **API base:** `import.meta.env.VITE_API_URL ?? '/api/v1'` (URL relativa)
- Tokens em `localStorage` via `shared/lib/storage.ts`; cliente HTTP em `shared/api/client.ts` com refresh single-flight
- Toda tela com dados tem loading (`Skeleton`), erro (com retry) e vazio
- Ações de escrita **ocultas** para `VIEWER` (`RoleGate`), e rotas de escrita barradas no router
- Paginação e filtros na URL (`useSearchParams`)
- Prettier próprio em `nexus-frontend/.prettierrc` (aspas duplas, `printWidth` 120) — não usar o do backend

**Infra API no frontend:**

| Ambiente | Como `/api/v1` chega na API |
|----------|----------------------------|
| Docker — prod (nginx) | `location /api/` → proxy `http://api:3000/api/` (todo o prefixo `/api/`) |
| Docker — dev (`vite dev`, container) | `server.proxy['/api']` → `http://api:3000` (rede Docker) |

`VITE_API_URL` é opcional (override); default no código: `/api/v1`. Evita quebrar ao acessar por IP/hostname diferente.

### Testes

- **Obrigatório (PoC):** Vitest + supertest — tenant isolation, auth guards, trigger service, scoping de execuções
- **Bônus:** cobertura E2E/unitária adicional além do mínimo crítico
- Ver [10-criterios](./docs/spec/10-criterios.md)

## Comandos úteis

```bash
# Docker — desenvolvimento já sobe postgres + api + frontend; produção ainda sem frontend (F12)
docker compose -f docker/production/docker-compose.yml --project-directory . up --build   # produção
docker compose -f docker/development/docker-compose.yml --project-directory . up --build  # desenvolvimento

# Frontend — dentro do container `frontend` (dev compose)
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run lint
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run format
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run format:check
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm test
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npx shadcn add <componente>

# Prisma 8 — dentro do container `api` (dev compose; ver skill prisma-8/SKILL.md)

# após editar contract.prisma
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run contract:emit
# dev: sync rápido
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npx prisma db update
# versionado: gera migration
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npx prisma migration plan --name x
# aplica migrations pendentes
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npx prisma db migrate
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
- Não usar Radix diretamente no frontend — os componentes shadcn deste projeto são **Base UI**
- Não criar `tailwind.config.js` — Tailwind 4 é CSS-first, configurado em `src/index.css`
- Não mover `nexus-frontend/src/components/ui/` — o `components.json` fixa esse alias
- Não usar sufixo `.js` em imports do frontend (é regra do backend, não do Vite)
- Não pré-preencher `authKey` em formulário de edição — a API devolve mascarada
- Não omitir `@testing-library/dom` no frontend — peer do RTL v16; sem ele `render`/`screen` viram tipo `error` no ESLint type-checked
- Não adicionar TanStack Table, axios ou date-fns — fora do escopo escolhido (tabelas fixas, `fetch`, `Intl`)
- Não criar `.prettierrc` na raiz — Prettier é isolado por pacote (`nexus-backend/` e `nexus-frontend/`)

## Arquivos de referência

| Arquivo | Conteúdo |
|---------|----------|
| `docs/spec/` | Spec funcional, API, schema, checklist |
| `.agents/rules/*.mdc` | Regras por domínio (raiz do monorepo) |
| `nexus-backend/.agents/skills/prisma-8/` | Skill Prisma 8 (sync via `npm run skills:sync`) |
| `readme.md` | Setup, seed, decisões do candidato |
| `docs/plans/` | Planos de entrega rastreados (`frontend.md` — F04–F12 restantes; `testes-criticos.md`) |
| `docs/todo/` | Melhorias possíveis, erros encontrados, acoplamentos percebidos — não bloqueiam a entrega atual |

## Fluxo de trabalho sugerido para IA

1. **Antes de implementar:** se a tarefa não estiver bem explicada (spec/critério de done ambíguo ou incompleto), fazer perguntas relevantes ao usuário antes de codar — não assumir. Se já bem explicada (ticket com escopo, arquivos e critério de done claros, ex.: entregas em `docs/plans/`), pode prosseguir direto
2. Ler o arquivo relevante em `docs/spec/`
3. Consultar **decisões adotadas** neste arquivo antes de implementar
4. Verificar [checklist](./docs/spec/11-checklist.md) antes e depois da tarefa
5. Tarefas Prisma → ler `nexus-backend/.agents/skills/prisma-8/SKILL.md` primeiro
6. Seguir regras em `.agents/rules/`
7. Implementar com diff mínimo
8. Rodar testes/lint dentro do container `api` (Compose de desenvolvimento) antes de declarar concluído
9. **Ao concluir uma entrega:** marcar como feita no `.md` correspondente (`docs/plans/*.md` — título + critério de done; [`docs/spec/11-checklist.md`](./docs/spec/11-checklist.md) — item da fase)
10. **Ao observar** uma melhoria possível, erro encontrado ou acoplamento percebido durante o trabalho (mesmo fora do escopo da tarefa atual): registrar em `docs/todo/<item>.md`, sem bloquear a entrega
11. **Ao observar** um padrão de código, decisão técnica ou comportamento não óbvio da stack (ex.: tipagem de um campo no ORM, convenção implícita repetida em vários arquivos): registrar aqui neste `AGENTS.md`, na seção de **decisões adotadas** ou **convenções**, conforme o caso
12. Atualizar README apenas quando pedido ou ao finalizar fase
