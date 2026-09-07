# 6. Stack e requisitos

[← Índice](./README.md)

> Este documento lista **o que a stack é**. O que já está implementado fica no [checklist](./11-checklist.md) — única fonte de status. Política de versões e decisões: [`AGENTS.md`](../../AGENTS.md).

## 6.1 Backend (obrigatório)

| Tecnologia | Versão / nota |
|------------|---------------|
| Node.js | **24.16.0** (`engines` + `node:24.16.0-alpine` no Dockerfile) |
| NestJS | 12.x (`nexus-backend/`) |
| TypeScript | 6.x, ESM (`"type": "module"`), alias `@/` → `src/` com sufixo `.js` obrigatório |
| PostgreSQL | **16** (`postgres:16-alpine`; mínimo Prisma Next 15+) |
| Prisma 8 | v8 RC — `@prisma/orm-postgres`, contract em `src/prisma/` |
| class-validator | DTOs + `ValidationPipe` global (`whitelist` + `transform`) |
| @nestjs/throttler | Rate limit básico em `POST /tenants/bootstrap` |
| @nestjs/jwt + passport | Guards de autenticação (`JwtAuthGuard` + `RolesGuard` globais) |
| @nestjs/swagger | OpenAPI 3.x + Swagger UI — ver [05-api §5.6](./05-api.md#56-documentação-openapi) |
| bcrypt | Hash de senhas |
| Vitest + supertest | 4.x — **testes críticos obrigatórios** (ver [10-criterios](./10-criterios.md)) |
| tsc-alias | Pós-build — reescreve `@/` em paths relativos no `dist/` |
| oxlint | Linter do backend — **não** ESLint; Prettier isolado em `nexus-backend/.prettierrc` (aspas simples) |
| nodemon | Watch mode do Compose de desenvolvimento (+ inspector na `9229`) |

Padrões de código: [`.agents/rules/nestjs-backend.mdc`](../../.agents/rules/nestjs-backend.mdc).

## 6.2 Frontend

Acabamento visual é prioridade **baixa** na avaliação ([10-criterios](./10-criterios.md)) — mas **fluxo completo** na UI é entregável obrigatório ([01-visao-geral](./01-visao-geral.md)).

| Tecnologia | Nota |
|------------|------|
| React 19 + TypeScript 6 | Vite 8; React Compiler via `babel-plugin-react-compiler` + `@rolldown/plugin-babel` |
| Tailwind CSS 4 | CSS-first — `@import "tailwindcss"` em `src/index.css`, **sem** `tailwind.config.js` |
| shadcn (estilo `base-lyra`) | Sobre **`@base-ui/react`** (não Radix); `components.json` fixa o alias `@/components/ui` |
| lucide-react | Biblioteca de ícones (`iconLibrary` do `components.json`) |
| React Router 7 | `createBrowserRouter`; rotas protegidas + gate por role |
| TanStack Query v5 | Cache, paginação (`keepPreviousData`), invalidação após mutations |
| react-hook-form + zod | Forms e validação espelhando os DTOs `class-validator` do backend |
| `fetch` (client próprio) | `shared/api/client.ts` — Bearer + 401 → refresh **single-flight** → logout |
| ESLint 10 (`strictTypeChecked`) | Linter do frontend — o backend usa **oxlint**; um linter por pacote |
| Prettier | Isolado em `nexus-frontend/.prettierrc` (aspas duplas, `printWidth` 120) |
| Vitest + Testing Library | Só o crítico: client HTTP e gate de role |

Padrões e armadilhas do contrato: [`.agents/rules/react-frontend.mdc`](../../.agents/rules/react-frontend.mdc). Plano de entregas: [`docs/plans/frontend.md`](../plans/frontend.md).

**Telas (escopo completo do protótipo):**

1. **Login / logout** — email/senha, tokens em `localStorage`, refresh transparente
2. **Bootstrap** — cadastro de tenant + admin (rota pública)
3. **Integrações** — listar (filtro `isActive`, paginação); criar/editar/ativar-desativar/excluir (ADMIN); trigger com payload opcional (ADMIN)
4. **Histórico** — execuções por integração; filtros `status`/`from`/`to`; detalhe com `requestPayload` e `responseBody`

VIEWER: leitura em integrações e histórico — ações de escrita **ocultas**, não apenas desabilitadas. ADMIN: todas as ações.

**API no browser:** URL relativa `/api/v1`; proxy Vite (dev) ou nginx (prod) — ver [08-docker §8.6](./08-docker.md#86-frontend--roteamento-da-api).

## 6.3 Infraestrutura (obrigatório)

- Docker Compose com `api`, `frontend` e `database`
- Healthcheck no PostgreSQL antes da API subir (`pg_isready` + `depends_on: service_healthy`)
- CORS de desenvolvimento para o container Vite — [08-docker §8.8](./08-docker.md#88-cors)
- Migrations aplicadas no Docker (`db migrate` no entrypoint)
- `.env.example` com todas as variáveis

Detalhes em [Infraestrutura (Docker)](./08-docker.md).
