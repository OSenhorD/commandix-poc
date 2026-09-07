# Commandix PoC (Nexus)

Plataforma de automação B2B — módulo de gestão de integrações multi-tenant.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`docs/spec/`](./docs/spec/README.md) | Spec técnica (funcionalidades, API, schema, checklist) |
| [`AGENTS.md`](./AGENTS.md) | Contexto para agentes de IA |
| [`.agents/README.md`](./.agents/README.md) | Skills do monorepo (Prisma 8) |
| [`.agents/rules/`](./.agents/rules/) | Regras por domínio |

## Pré-requisitos

| Ferramenta | Versão |
|------------|--------|
| Docker + Docker Compose | Único requisito |

## Início rápido (Docker)

```bash
cp .env.example .env
docker compose -f docker/production/docker-compose.yml --project-directory . up --build
```

Para desenvolvimento (bind mount do código + watch mode):

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . up --build
```

`--project-directory .` mantém `.env` e caminhos relativos (`./nexus-backend`, volumes) resolvidos a partir da raiz, mesmo com os arquivos de compose em `docker/`.

Aguarde os healthchecks. A API sobe automaticamente com:

1. `prisma db migrate`
2. seed idempotente (pula se tenant `acme` já existir)
3. `node dist/main.js`

### Serviços

| Serviço | URL / porta | Observação |
|---------|-------------|------------|
| API | http://localhost:3000/api/v1 | prefixo global NestJS |
| Health | http://localhost:3000/api/v1/health | `{ "status": "ok" }` |
| Docs (Swagger UI) | http://localhost:3000/api/docs | Try-it com JWT (`Authorize` → Bearer) |
| OpenAPI JSON | http://localhost:3000/api/openapi.json | Documento OpenAPI 3.x gerado via `@nestjs/swagger` |
| PostgreSQL | `localhost:5432` | user/senha/db default: `commandix` |
| Frontend | http://localhost:5173 | Compose de **desenvolvimento** (F01); telas ainda placeholder (F04–F11). Produção pendente — entrega F12 de [`docs/plans/frontend.md`](./docs/plans/frontend.md) |

### Credenciais demo (seed)

| Campo | Valor |
|-------|-------|
| Tenant | `Acme Corp` (slug `acme`) |
| Admin | `admin@acme.com` / `Admin123!` |
| Viewer | `viewer@acme.com` / `Admin123!` |

### Comandos Docker úteis

```bash
# Subir em background (produção; troque o -f para docker/development/docker-compose.yml em desenvolvimento)
docker compose -f docker/production/docker-compose.yml --project-directory . up --build -d

# Ver logs da API
docker compose -f docker/production/docker-compose.yml --project-directory . logs -f api

# Parar serviços
docker compose -f docker/production/docker-compose.yml --project-directory . down

# Parar e apagar volume do Postgres (reset completo do banco)
docker compose -f docker/production/docker-compose.yml --project-directory . down -v

# Subir só o banco
docker compose -f docker/production/docker-compose.yml --project-directory . up database -d
```

### Variáveis de ambiente

Copie `.env.example` → `.env` na **raiz** do monorepo. Principais variáveis:

| Variável | Default | Uso |
|----------|---------|-----|
| `JWT_ACCESS_SECRET` | — | Assinatura do access token — **obrigatória em produção** (`docker compose up` falha se ausente) |
| `JWT_REFRESH_SECRET` | — | Assinatura do refresh token — **obrigatória em produção** |
| `DB_PASSWORD` | — | Senha do Postgres — **obrigatória em produção** |
| `DB_DATABASE` / `DB_USERNAME` | `commandix` | Postgres no Compose |
| `DB_PORT` | `5432` | Porta exposta do Postgres — **somente em desenvolvimento**; em produção o Postgres não expõe porta no host |
| `API_PORT` | `3000` | Porta exposta da API |
| `ENABLE_API_DOCS` | `true` | Liga/desliga `/api/docs` e `/api/openapi.json` (`false` → 404) |

No Compose, a API recebe `DATABASE_URL` montada internamente (`database:5432`). Ver [`.env.example`](./.env.example) e [`docs/spec/08-docker.md`](./docs/spec/08-docker.md).

## Desenvolvimento (bind mount + watch mode)

Suba o Compose de desenvolvimento (§ [Início rápido](#início-rápido-docker)) — código montado via bind mount, API reinicia sozinha a cada alteração em `src/` (`nodemon` + debug inspector na porta `9229`).

Comandos abaixo rodam **dentro do container `api`** via `docker compose exec` (sem instalar Node/npm no host):

```bash
# Após editar contract.prisma
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run contract:emit

# Compilar TypeScript (NestJS + tsc-alias) — normalmente não é necessário: o watch mode já builda a cada mudança
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run build
```

O **`docker/production/Dockerfile`** da API já executa `contract:emit` e `build` na etapa de build; o entrypoint (`docker/production/entrypoint.sh`) cuida de migrate + seed + start.

## Testes

Todos os comandos abaixo rodam dentro do container `api` (Compose de desenvolvimento, que já define `DATABASE_URL`/`TEST_DATABASE_URL`):

```bash
# unitários (*.spec.ts)
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm test
# e2e (*.e2e-spec.ts)
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run test:e2e
# com cobertura
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run test:cov
```

| Tipo | Arquivos | Banco necessário? |
|------|----------|-------------------|
| Unitários | `src/**/*.spec.ts` | Não |
| E2E (app, validation) | `test/*.e2e-spec.ts` | Não |
| E2E (seed) | `test/seed.e2e-spec.ts` | **Sim** — requer `DATABASE_URL`; teste é ignorado se ausente |

## Prisma 8

Comandos dentro do container `api` (skill: [`nexus-backend/.agents/skills/prisma-8/SKILL.md`](./nexus-backend/.agents/skills/prisma-8/SKILL.md)). Prefixo omitido na tabela: `docker compose -f docker/development/docker-compose.yml --project-directory . exec api`.

| Situação | Comando |
|----------|---------|
| Após editar `contract.prisma` | `npm run contract:emit` |
| Dev (schema em fluxo) | `npx prisma db update` |
| Nova migration versionada | `npx prisma migration plan --name <slug>` → `npx prisma db migrate` |
| DB vazio (primeira vez) | `npx prisma db init` |
| Seed manual | `npm run seed` |

**Docker / CI:** usar `db migrate` (não `db update`).

## Lint e formatação

Prettier é **isolado por pacote** (`nexus-backend/.prettierrc` com aspas simples; `nexus-frontend/.prettierrc` com aspas duplas). Sem config na raiz.

```bash
# backend — oxlint
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run lint
# backend — prettier (write / CI)
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run format
docker compose -f docker/development/docker-compose.yml --project-directory . exec api npm run format:check

# frontend — ESLint
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run lint
# frontend — prettier (write / CI)
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run format
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run format:check
```

## CI (GitHub Actions)

Workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — push/PR em `main`:

| Job | O que valida |
|-----|----------------|
| **validate** | Backend — `npm ci`, `contract:emit` (+ contract commitado), `prisma db migrate`, lint, Prettier, testes unit/e2e, build |

Node **24.16.0** + Postgres **16** como service. O job de frontend entra na entrega F12 ([`docs/plans/frontend.md`](./docs/plans/frontend.md)); a validação por Docker Compose ainda não existe — ver [`docs/todo/ci-sem-job-docker.md`](./docs/todo/ci-sem-job-docker.md).

## Status

| Componente | Diretório | Status |
|------------|-----------|--------|
| API NestJS | `nexus-backend/` | Em implementação |
| Frontend React | `nexus-frontend/` | F01–F03 (ambiente, cliente HTTP, sessão, rotas); telas F04–F12 — [`docs/plans/frontend.md`](./docs/plans/frontend.md) |
| PostgreSQL + Prisma 8 | `nexus-backend/src/prisma/` | Contract + migrations + seed |
| Docker Compose | `docker/` | Dev: postgres + api + frontend; prod: postgres + api (`frontend` em F12) |

## Stack

- **Backend:** NestJS 12, Node 24, TypeScript 6 (ESM), Prisma 8, PostgreSQL, JWT
- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, shadcn (estilo `base-lyra` sobre Base UI), React Router 7, TanStack Query v5, react-hook-form + zod
- **Infra:** Docker Compose (Postgres 16, nginx)
- **Testes:** Vitest + supertest (backend) — **testes críticos obrigatórios** (tenant isolation, auth, trigger, execuções); Vitest + Testing Library (frontend) no cliente HTTP e no gate de role; cobertura extra = bônus

## Extensões sugeridas (VS Code / Cursor)

Opcionais.

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma)
- [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)
- [Git History](https://marketplace.visualstudio.com/items?itemName=donjayamanne.githistory)
- [Tailwind CSS](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Mermaid Chart](https://marketplace.visualstudio.com/items?itemName=MermaidChart.vscode-mermaid-chart)

## Decisões técnicas

Decisões completas em [`AGENTS.md`](./AGENTS.md). Resumo:

| Tópico | Decisão |
|--------|---------|
| Versões | Sempre as mais recentes (runtime, frameworks, ORM, Docker) |
| Imports backend | Alias `@/` → `src/`; sufixo `.js`; `tsc-alias` no build |
| ORM | Prisma 8 — skill em [`nexus-backend/.agents/skills/prisma-8/`](./nexus-backend/.agents/skills/prisma-8/SKILL.md) |
| Migrations | `migrations/app/` + `db migrate` no Docker |
| Schema no Docker | `contract emit` (build) → `db migrate` → seed idempotente (sempre no entrypoint) |
| Multi-tenancy | `tenantId` no JWT + filtro no service; cross-tenant → 404 |
| Infra | Docker Compose com um comando (`docker compose -f docker/production/docker-compose.yml --project-directory . up --build`); nada roda fora de container |
| Trigger HTTP | Sempre POST, timeout 30s, sem retry, `authKey` como Bearer |
| `authKey` at-rest | Texto plano na PoC (sem criptografia) |
| Execuções | `responseBody` truncado em 10 240 bytes UTF-8 |
| Integrações | PATCH parcial; desativar via PATCH; DELETE hard + cascade |
| Frontend API | URL relativa `/api/v1` + proxy nginx/Vite |
| CORS | Dev (container Vite): `localhost:5173` → API `:3000`; prod (nginx): mesma origem |
| Frontend auth | Interceptor 401 → refresh **single-flight** → logout; tokens em `localStorage` |
| Frontend UI | Escopo completo na UI; acabamento visual usa o default do shadcn (prioridade baixa na avaliação) |
| Frontend estrutura | Feature-sliced (`app/`, `shared/`, `features/`); dados com TanStack Query; forms com react-hook-form + zod |
| Frontend `authKey` | Nunca pré-preenchida na edição — a API devolve mascarada; campo vazio mantém o valor |
| API prefix | `/api/v1` (global prefix no NestJS) |
| Health | `GET /api/v1/health` → `{ "status": "ok" }` |
| JWT | Access `15m`, refresh `7d`; claims `{ sub, tenantId, role, email }` |
| Logout | Apenas dispositivo atual — outras sessões permanecem |
| Bootstrap | Rate limit básico — 5 req / 60s por IP em `POST /tenants/bootstrap` |
| Usuários | Criação **somente** no bootstrap (`ADMIN`); sem convite/CRUD |

## Licença

Projeto de desafio técnico — uso interno.
