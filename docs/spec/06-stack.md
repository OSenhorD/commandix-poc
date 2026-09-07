# 6. Stack e requisitos

[← Índice](./README.md)

> Política de versões e skill Prisma 8: ver [`AGENTS.md`](../../AGENTS.md) e `nexus-backend/.agents/skills/prisma-8/SKILL.md`.

## 6.1 Backend (obrigatório)

| Tecnologia | Versão / nota | Status |
|------------|---------------|--------|
| Node.js | **24.16.0** (`engines` + `node:24.16.0-alpine` no Dockerfile) | Configurado |
| NestJS | 12.x (`nexus-backend/`) | Implementado |
| TypeScript | 6.x, ESM (`"type": "module"`), alias `@/` → `src/` | Configurado |
| PostgreSQL | **16** (`postgres:16-alpine`; mínimo Prisma Next 15+) | Via Docker |
| Prisma 8 | v8 RC — `@prisma/orm-postgres`, contract em `src/prisma/` | Implementado |
| class-validator | DTOs + `ValidationPipe` global (`whitelist` + `transform`) | Implementado |
| @nestjs/throttler | Rate limit básico em `POST /tenants/bootstrap` | Implementado |
| @nestjs/jwt + passport | Guards de autenticação (`JwtAuthGuard` + `RolesGuard` globais) | Implementado |
| @nestjs/swagger | OpenAPI 3.x + Swagger UI — ver [05-api §5.6](./05-api.md#56-documentação-openapi) | Implementado |
| bcrypt | Hash de senhas | Implementado |
| Vitest + supertest | 4.x — **testes críticos obrigatórios** (ver [10-criterios § Testes](./10-criterios.md)) | Implementado (falta e2e de execuções) |
| tsc-alias | Pós-build — reescreve `@/` em paths relativos no `dist/` | Configurado |
| oxlint | Linter do projeto (`npm run lint`) — **não** ESLint; formatação via Prettier isolado em `nexus-backend/.prettierrc` (aspas simples) | Configurado |
| nodemon | Watch mode do Compose de desenvolvimento (+ inspector na `9229`) | Configurado |

**Imports (backend):** preferir `@/…/arquivo.js` (mapeia para `src/`); sufixo `.js` obrigatório. Ver [`AGENTS.md`](../../AGENTS.md) § Convenções.

## 6.2 Frontend

Prioridade **baixa** de acabamento visual na avaliação ([10-criterios](./10-criterios.md)) — mas **fluxo completo** na UI é entregável obrigatório ([01-visao-geral](./01-visao-geral.md)).

| Tecnologia | Nota | Status |
|------------|------|--------|
| React 19 + TypeScript 6 | Vite 8; React Compiler via `babel-plugin-react-compiler` + `@rolldown/plugin-babel` | Ambiente + sessão + rotas (F01–F03); telas F04–F12 |
| Tailwind CSS 4 | CSS-first — `@import "tailwindcss"` em `src/index.css`, **sem** `tailwind.config.js` | Configurado |
| shadcn (estilo `base-lyra`) | Sobre **`@base-ui/react`** (não Radix); `components.json` fixa o alias `@/components/ui` | 11 componentes base |
| lucide-react | Biblioteca de ícones (`iconLibrary` do `components.json`) | Configurado |
| React Router 7 | `createBrowserRouter`; rotas protegidas + gate por role | Implementado (F03) |
| TanStack Query v5 | Cache, paginação (`keepPreviousData`), invalidação após mutations | QueryClient + `AuthProvider`; listagens em F07+ |
| react-hook-form + zod | Forms e validação espelhando os DTOs `class-validator` do backend | Instalado; formulários em F04+ |
| `fetch` (client próprio) | `shared/api/client.ts` — Bearer + 401 → refresh **single-flight** → logout | Implementado (F02) |
| ESLint 10 (`strictTypeChecked`) | Linter do frontend — o backend usa **oxlint**; um linter por pacote | Configurado |
| Prettier | Isolado em `nexus-frontend/.prettierrc` (aspas duplas, `printWidth` 120) — não compartilha o do backend | Configurado |
| Vitest + Testing Library | Só o crítico: client HTTP e gate de role (bônus na avaliação) | Implementado (F02 + F03) |

Plano restante: índice [`docs/plans/frontend.md`](../plans/frontend.md); brief por entrega em [`docs/plans/frontend/`](../plans/frontend/) (F04–F12). Padrões e armadilhas do contrato: [`.agents/rules/react-frontend.mdc`](../../.agents/rules/react-frontend.mdc).

**Telas (escopo completo do protótipo):**

1. **Login / logout** — email/senha, tokens em `localStorage`, refresh transparente
2. **Bootstrap** — cadastro de tenant + admin (rota pública)
3. **Integrações** — listar (filtro `isActive`, paginação); criar/editar/ativar-desativar/excluir (ADMIN); trigger com payload opcional (ADMIN)
4. **Histórico** — execuções por integração; filtros `status`/`from`/`to`; detalhe com `requestPayload` e `responseBody`

VIEWER: leitura em integrações e histórico — ações de escrita **ocultas**, não apenas desabilitadas. ADMIN: todas as ações.

**API no browser:** URL relativa `/api/v1`; proxy Vite (dev) ou nginx (Docker) — ver [08-docker §8.6](./08-docker.md#86-frontend--roteamento-da-api).

## 6.3 Infraestrutura (obrigatório)

| Requisito | Status |
|-----------|--------|
| Docker Compose: `api`, `frontend`, `database` | **Parcial** — `api` + `database` nos dois composes; `frontend` no compose de **desenvolvimento** (F01); `frontend` de produção comentado (F12) |
| Healthcheck no PostgreSQL antes da API subir | Implementado (`pg_isready` + `depends_on: service_healthy`) |
| CORS dev (`localhost:5173`) | Implementado em `configureApp()` — ver [08-docker §8.8](./08-docker.md#88-cors) |
| Migrations no Docker | Implementado — `db migrate` no entrypoint (migrations em `migrations/app/`) |
| `.env.example` com todas as variáveis | Implementado |

Detalhes em [Infraestrutura (Docker)](./08-docker.md).
