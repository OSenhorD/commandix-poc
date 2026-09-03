# Commandix PoC (Nexus)

Plataforma de automação B2B — módulo de gestão de integrações multi-tenant.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`docs/spec/`](./docs/spec/README.md) | Spec técnica (funcionalidades, API, schema, checklist) |
| [`docs/spec/12-revisao-planejamento.md`](./docs/spec/12-revisao-planejamento.md) | Brechas resolvidas e decisões adotadas |
| [`AGENTS.md`](./AGENTS.md) | Contexto para agentes de IA |
| [`.cursor/rules/`](./.cursor/rules/) | Regras Cursor por domínio |

## Status

| Componente | Diretório | Status |
|------------|-----------|--------|
| API NestJS | `nexus-backend/` | Starter — implementação pendente |
| Frontend React | `nexus-frontend/` | A criar |
| PostgreSQL + Prisma Next | `nexus-backend/src/prisma/` | Contract demo — domínio pendente |
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

- **Backend:** NestJS 12, Node 24, TypeScript 6 (ESM), Prisma Next, PostgreSQL, JWT
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
| ORM | Prisma Next — `src/prisma/contract.prisma` + `db.ts` |
| Multi-tenancy | `tenantId` no JWT + filtro no service; cross-tenant → 404 |
| Infra local | Docker Compose com um comando (`docker compose up --build`) |
| Schema no Docker | `prisma db init` + seed idempotente no entrypoint da API |
| Trigger HTTP | POST, timeout 30s, `authKey` como Bearer, merge shallow de payload |
| Integrações | Desativar via PATCH; DELETE hard + cascade execuções |
| Frontend UI | Login + lista + trigger + histórico (CRUD via API) |
| API prefix | `/api/v1` (global prefix no NestJS) |

## Licença

Projeto de desafio técnico — uso interno.
