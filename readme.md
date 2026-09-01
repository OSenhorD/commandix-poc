# Commandix PoC (Nexus)

Plataforma de automação B2B — módulo de gestão de integrações multi-tenant.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`docs/spec/`](./docs/spec/README.md) | Spec técnica (funcionalidades, API, schema, checklist) |
| [`AGENTS.md`](./AGENTS.md) | Contexto para agentes de IA |
| [`.cursor/rules/`](./.cursor/rules/) | Regras Cursor por domínio |

## Status

| Componente | Diretório | Status |
|------------|-----------|--------|
| API NestJS | `nexus-backend/` | Starter — implementação pendente |
| Frontend React | `nexus-frontend/` | A criar |
| PostgreSQL + Prisma | `nexus-backend/prisma/` | A configurar |
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

- **Backend:** NestJS 12, TypeScript (ESM), Prisma, PostgreSQL, JWT
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

| Tópico | Decisão |
|--------|---------|
| Infra local | Docker Compose com um comando (`docker compose up --build`) |
| Migrations no Docker | `prisma migrate deploy` no entrypoint da API, após Postgres healthy |
| Seed | `prisma/seed.ts`; idempotente — pula se tenant `acme` já existir |
| Frontend no Docker | Build Vite + nginx na porta 80, exposta como `5173` no host |
| API prefix | `/api/v1` (global prefix no NestJS) |

_Pontos em aberto (auth, secrets, soft delete, etc.) serão documentados nas fases seguintes._

## Licença

Projeto de desafio técnico — uso interno.
