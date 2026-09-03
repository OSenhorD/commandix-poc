# 6. Stack e requisitos

[← Índice](./README.md)

> **Política de versões:** usar sempre as versões mais recentes de runtime, frameworks, ORM e imagens Docker. Detalhes normativos em [`AGENTS.md`](../../AGENTS.md).

## 6.1 Backend (obrigatório)

| Tecnologia | Versão / nota | Status |
|------------|---------------|--------|
| Node.js | 24.x (`engines` em `nexus-backend/package.json`) | Configurado |
| NestJS | 12.x (`nexus-backend/`) | Starter |
| TypeScript | 6.x, ESM (`"type": "module"`) | Configurado |
| PostgreSQL | 16+ | Via Docker |
| Prisma Next | v8 RC — `@prisma/orm-postgres`, contract em `src/prisma/` | Inicializado |
| class-validator | DTOs + `ValidationPipe` global | Pendente |
| @nestjs/jwt + passport | Guards de autenticação | Pendente |
| bcrypt | Hash de senhas | Pendente |
| Vitest | 4.x | Starter |

## 6.2 Frontend (mínimo funcional)

| Tecnologia | Nota | Status |
|------------|------|--------|
| React + TypeScript | React 19, Vite (última versão) | Pendente |
| React Router | Rotas protegidas | Pendente |
| Fetch/axios | Cliente HTTP com interceptor JWT | Pendente |

**Telas mínimas (spec):**

1. **Login** — email/senha, armazena tokens
2. **Integrações** — tabela com nome, tipo, status, ações (trigger para admin)
3. **Histórico** — execuções de uma integração com filtros

## 6.3 Infraestrutura (obrigatório)

| Requisito | Status |
|-----------|--------|
| Docker Compose: `api`, `frontend`, `postgres` | Pendente |
| Healthcheck no PostgreSQL antes da API subir | Pendente |
| Migrations automáticas no entrypoint da API | Pendente (`prisma db init` — Prisma Next) |
| `.env.example` com todas as variáveis | Pendente |

Detalhes em [Infraestrutura (Docker)](./08-docker.md).
