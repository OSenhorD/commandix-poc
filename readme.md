# Commandix PoC (Nexus)

Plataforma de automação B2B — módulo de gestão de integrações multi-tenant.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`docs/spec/`](./docs/spec/README.md) | Spec técnica (funcionalidades, API, schema, checklist) |
| [`docs/spec/12-revisao-planejamento.md`](./docs/spec/12-revisao-planejamento.md) | Brechas resolvidas e decisões adotadas |
| [`AGENTS.md`](./AGENTS.md) | Contexto para agentes de IA |
| [`.cursor/skills/`](./.cursor/skills/README.md) | Skills do monorepo (Prisma 8) |
| [`.cursor/rules/`](./.cursor/rules/) | Regras Cursor por domínio |

## Status

| Componente | Diretório | Status |
|------------|-----------|--------|
| API NestJS | `nexus-backend/` | Starter — implementação pendente |
| Frontend React | `nexus-frontend/` | A criar |
| PostgreSQL + Prisma 8 | `nexus-backend/src/prisma/` | Contract demo — domínio pendente |
| Docker Compose | raiz | A criar |

## Setup (local)

> Disponível após implementação das fases 1–6 do [checklist](./docs/spec/11-checklist.md).

```bash
# Docker — sobe postgres + api + frontend
cp .env.example .env
docker compose up --build
```

Serviços após subir:

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api/v1 |
| Health | http://localhost:3000/api/v1/health |
| PostgreSQL | localhost:5432 |

**Seed (primeira execução):**

- Tenant: `Acme Corp` (slug `acme`)
- Admin: `admin@acme.com` / `Admin123!`
- Viewer: `viewer@acme.com` / `Admin123!`

## Stack

- **Backend:** NestJS 12, Node 24, TypeScript 6 (ESM), Prisma 8, PostgreSQL, JWT
- **Frontend:** React 19, TypeScript, Vite
- **Infra:** Docker Compose (Postgres 16, nginx)
- **Testes:** Vitest (+ supertest E2E planejado)

## Extensões sugeridas (VS Code / Cursor)

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
| ORM | Prisma 8 — skill em `nexus-backend/.cursor/skills/prisma-8/` |
| Migrations | `migrations/app/` + `db migrate` no Docker |
| Schema no Docker | `contract emit` (build) → `db migrate` → seed idempotente (sempre no entrypoint) |
| Multi-tenancy | `tenantId` no JWT + filtro no service; cross-tenant → 404 |
| Infra local | Docker Compose com um comando (`docker compose up --build`) |
| Trigger HTTP | POST, timeout 30s, `authKey` como Bearer, merge shallow de payload |
| Execuções | `responseBody` truncado em 10 240 bytes UTF-8 |
| Integrações | PATCH parcial; desativar via PATCH; DELETE hard + cascade |
| Frontend API | URL relativa `/api/v1` + proxy nginx/Vite |
| CORS | Dev: `localhost:5173` → API `:3000`; Docker: mesma origem |
| Frontend auth | Interceptor 401 → refresh → logout |
| Frontend UI | Escopo completo — cadastros e ações via UI (CRUD integrações, trigger, histórico) |
| API prefix | `/api/v1` (global prefix no NestJS) |
| Health | `GET /api/v1/health` → `{ "status": "ok" }` |
| JWT | Access `15m`, refresh `7d`; claims `{ sub, tenantId, role, email }` |
| Logout | Apenas dispositivo atual — outras sessões permanecem |
| Bootstrap | Rate limit básico — 5 req / 60s por IP em `POST /tenants/bootstrap` |
| Usuários | Criação **somente** no bootstrap (`ADMIN`); sem convite/CRUD |

## Licença

Projeto de desafio técnico — uso interno.
