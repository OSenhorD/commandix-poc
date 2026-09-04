# Commandix PoC (Nexus)

Plataforma de automação B2B — módulo de gestão de integrações multi-tenant.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`docs/spec/`](./docs/spec/README.md) | Spec técnica (funcionalidades, API, schema, checklist) |
| [`AGENTS.md`](./AGENTS.md) | Contexto para agentes de IA |
| [`.cursor/skills/`](./.cursor/skills/README.md) | Skills do monorepo (Prisma 8) |
| [`.cursor/rules/`](./.cursor/rules/) | Regras Cursor por domínio |

## Pré-requisitos

| Ferramenta | Versão |
|------------|--------|
| Node.js | **24.16.0** (`nexus-backend/package.json` → `engines.node`) |
| npm | **12.x** |
| Docker + Docker Compose | Para subir Postgres e API com um comando |

## Início rápido (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Aguarde os healthchecks. A API sobe automaticamente com:

1. `prisma db migrate`
2. seed idempotente (pula se tenant `acme` já existir)
3. `node dist/main.js`

### Serviços

| Serviço | URL / porta | Observação |
|---------|-------------|------------|
| API | http://localhost:3000/api/v1 | prefixo global NestJS |
| Health | http://localhost:3000/api/v1/health | `{ "status": "ok" }` |
| PostgreSQL | `localhost:5432` | user/senha/db default: `commandix` |
| Frontend | — | **Pendente** (`nexus-frontend/` ainda não existe; serviço comentado no Compose) |

### Credenciais demo (seed)

| Campo | Valor |
|-------|-------|
| Tenant | `Acme Corp` (slug `acme`) |
| Admin | `admin@acme.com` / `Admin123!` |
| Viewer | `viewer@acme.com` / `Admin123!` |

### Comandos Docker úteis

```bash
# Subir em background
docker compose up --build -d

# Ver logs da API
docker compose logs -f api

# Parar serviços
docker compose down

# Parar e apagar volume do Postgres (reset completo do banco)
docker compose down -v

# Subir só o banco (útil para dev local da API)
docker compose up database -d
```

### Variáveis de ambiente

Copie `.env.example` → `.env` na **raiz** do monorepo. Principais variáveis:

| Variável | Default | Uso |
|----------|---------|-----|
| `JWT_ACCESS_SECRET` | — | Assinatura do access token |
| `JWT_REFRESH_SECRET` | — | Assinatura do refresh token |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | `commandix` | Postgres no Compose |
| `DB_PORT` | `5432` | Porta exposta do Postgres |
| `API_PORT` | `3000` | Porta exposta da API |

No Compose, a API recebe `DATABASE_URL` montada internamente (`database:5432`). Ver [`.env.example`](./.env.example) e [`docs/spec/08-docker.md`](./docs/spec/08-docker.md).

## Desenvolvimento local (sem rebuild da API)

Com Postgres rodando (via Docker ou local):

```bash
cd nexus-backend
npm ci
```

Crie `nexus-backend/.env` (ou exporte as variáveis) apontando para o banco:

```env
DATABASE_URL=postgresql://commandix:commandix@localhost:5432/commandix
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
PORT=3000
```

Sincronize o banco e rode o seed:

```bash
npx prisma db migrate    # aplica migrations versionadas
npm run seed             # idempotente
```

Inicie a API em modo watch:

```bash
npm run start:dev
```

A API fica em http://localhost:3000/api/v1. CORS habilitado para `http://localhost:5173` (frontend Vite, quando existir).

## Build

```bash
cd nexus-backend

# Após editar contract.prisma
npm run contract:emit

# Compilar TypeScript (NestJS + tsc-alias)
npm run build

# Rodar build de produção localmente
npm run start:prod
```

O **Dockerfile** da API já executa `contract:emit` e `build` na etapa de build; o entrypoint (`docker-entrypoint.sh`) cuida de migrate + seed + start.

## Testes

Todos os comandos abaixo em `nexus-backend/`:

```bash
npm test              # unitários (*.spec.ts)
npm run test:e2e      # e2e (*.e2e-spec.ts)
npm run test:watch    # watch mode
npm run test:cov      # com cobertura
```

| Tipo | Arquivos | Banco necessário? |
|------|----------|-------------------|
| Unitários | `src/**/*.spec.ts` | Não |
| E2E (app, validation) | `test/*.e2e-spec.ts` | Não |
| E2E (seed) | `test/seed.e2e-spec.ts` | **Sim** — requer `DATABASE_URL`; teste é ignorado se ausente |

Para rodar o teste de seed com banco:

```bash
# Postgres no ar (ex.: docker compose up database -d)
export DATABASE_URL=postgresql://commandix:commandix@localhost:5432/commandix
npm run test:e2e
```

## Prisma 8

Comandos em `nexus-backend/` (skill: [`nexus-backend/.cursor/skills/prisma-8/SKILL.md`](./nexus-backend/.cursor/skills/prisma-8/SKILL.md)):

| Situação | Comando |
|----------|---------|
| Após editar `contract.prisma` | `npm run contract:emit` |
| Dev local (schema em fluxo) | `npx prisma db update` |
| Nova migration versionada | `npx prisma migration plan --name <slug>` → `npx prisma db migrate` |
| DB vazio (primeira vez) | `npx prisma db init` |
| Seed manual | `npm run seed` |

**Docker / CI:** usar `db migrate` (não `db update`).

## Lint e formatação

```bash
cd nexus-backend
npm run lint      # oxlint
npm run format    # prettier
```

## Status

| Componente | Diretório | Status |
|------------|-----------|--------|
| API NestJS | `nexus-backend/` | Em implementação |
| Frontend React | `nexus-frontend/` | A criar |
| PostgreSQL + Prisma 8 | `nexus-backend/src/prisma/` | Contract + migrations + seed |
| Docker Compose | raiz | **Postgres + API** (frontend pendente) |

## Stack

- **Backend:** NestJS 12, Node 24, TypeScript 6 (ESM), Prisma 8, PostgreSQL, JWT
- **Frontend:** React 19, TypeScript, Vite
- **Infra:** Docker Compose (Postgres 16, nginx)
- **Testes:** Vitest + supertest — **testes críticos obrigatórios** (tenant isolation, auth, trigger, execuções); cobertura extra = bônus

## Extensões sugeridas (VS Code / Cursor)

Opcionais — a UI da PoC usa **HTML/CSS simples** (sem Tailwind ou biblioteca de componentes obrigatória).

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma)
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
| ORM | Prisma 8 — skill em `nexus-backend/.cursor/skills/prisma-8/` |
| Migrations | `migrations/app/` + `db migrate` no Docker |
| Schema no Docker | `contract emit` (build) → `db migrate` → seed idempotente (sempre no entrypoint) |
| Multi-tenancy | `tenantId` no JWT + filtro no service; cross-tenant → 404 |
| Infra local | Docker Compose com um comando (`docker compose up --build`) |
| Trigger HTTP | Sempre POST, timeout 30s, sem retry, `authKey` como Bearer |
| `authKey` at-rest | Texto plano na PoC (sem criptografia) |
| Execuções | `responseBody` truncado em 10 240 bytes UTF-8 |
| Integrações | PATCH parcial; desativar via PATCH; DELETE hard + cascade |
| Frontend API | URL relativa `/api/v1` + proxy nginx/Vite |
| CORS | Dev: `localhost:5173` → API `:3000`; Docker: mesma origem |
| Frontend auth | Interceptor 401 → refresh → logout |
| Frontend UI | Escopo completo na UI |
| API prefix | `/api/v1` (global prefix no NestJS) |
| Health | `GET /api/v1/health` → `{ "status": "ok" }` |
| JWT | Access `15m`, refresh `7d`; claims `{ sub, tenantId, role, email }` |
| Logout | Apenas dispositivo atual — outras sessões permanecem |
| Bootstrap | Rate limit básico — 5 req / 60s por IP em `POST /tenants/bootstrap` |
| Usuários | Criação **somente** no bootstrap (`ADMIN`); sem convite/CRUD |

## Licença

Projeto de desafio técnico — uso interno.
