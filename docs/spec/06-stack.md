# 6. Stack e requisitos

[← Índice](./README.md)

> Política de versões e skill Prisma 8: ver [`AGENTS.md`](../../AGENTS.md) e `nexus-backend/.cursor/skills/prisma-8/SKILL.md`.

## 6.1 Backend (obrigatório)

| Tecnologia | Versão / nota | Status |
|------------|---------------|--------|
| Node.js | **24.16.0** (`engines` + `node:24.16.0-alpine` no Dockerfile) | Configurado |
| NestJS | 12.x (`nexus-backend/`) | Starter |
| TypeScript | 6.x, ESM (`"type": "module"`) | Configurado |
| PostgreSQL | **16** (`postgres:16-alpine`; mínimo Prisma Next 15+) | Via Docker |
| Prisma 8 | v8 RC — `@prisma/orm-postgres`, contract em `src/prisma/` | Inicializado |
| class-validator | DTOs + `ValidationPipe` global | Pendente |
| @nestjs/throttler | Rate limit básico em `POST /tenants/bootstrap` | Pendente |
| @nestjs/jwt + passport | Guards de autenticação | Pendente |
| bcrypt | Hash de senhas | Pendente |
| Vitest + supertest | 4.x — **testes críticos obrigatórios** (ver [10-criterios § Testes](./10-criterios.md)) | Starter |

## 6.2 Frontend (mínimo funcional)

| Tecnologia | Nota | Status |
|------------|------|--------|
| React 19 | React 19 + TypeScript, Vite (última versão) | Pendente |
| React Router | Rotas protegidas | Pendente |
| Fetch/axios | Cliente HTTP com interceptor JWT | Pendente |

**Telas (escopo completo do protótipo):**

1. **Login / logout** — email/senha, tokens, refresh
2. **Bootstrap** — cadastro de tenant + admin (rota pública)
3. **Integrações** — listar; criar/editar/desativar/excluir (ADMIN); trigger (ADMIN); link para histórico
4. **Histórico** — execuções por integração; filtros; detalhe de execução

VIEWER: leitura em integrações e histórico. ADMIN: todas as ações de escrita.

**API no browser:** URL relativa `/api/v1`; proxy Vite (dev) ou nginx (Docker) — ver [08-docker §8.6](./08-docker.md#86-frontend--roteamento-da-api).

## 6.3 Infraestrutura (obrigatório)

| Requisito | Status |
|-----------|--------|
| Docker Compose: `api`, `frontend`, `postgres` | Pendente |
| Healthcheck no PostgreSQL antes da API subir | Pendente |
| CORS dev (`localhost:5173`) | Fase 1 — ver [08-docker §8.8](./08-docker.md#88-cors) |
| Migrations no Docker | `db migrate` no entrypoint (migrations em `migrations/app/`) |
| `.env.example` com todas as variáveis | Pendente |

Detalhes em [Infraestrutura (Docker)](./08-docker.md).
