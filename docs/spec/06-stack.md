# 6. Stack e requisitos

[← Índice](./README.md)

## 6.1 Backend (obrigatório)

| Tecnologia | Versão / nota | Status |
|------------|---------------|--------|
| NestJS | 12.x (`nexus-backend/`) | Starter |
| TypeScript | ESM (`"type": "module"`) | Configurado |
| PostgreSQL | 16+ | Via Docker |
| Prisma | ORM + migrations | Pendente |
| class-validator | DTOs + `ValidationPipe` global | Pendente |
| @nestjs/jwt + passport | Guards de autenticação | Pendente |
| bcrypt | Hash de senhas | Usado no seed |
| Vitest | Testes | Starter |

## 6.2 Frontend (mínimo funcional)

| Tecnologia | Nota | Status |
|------------|------|--------|
| React + TypeScript | Vite | Pendente |
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
| Migrations automáticas no entrypoint da API | Pendente |
| `.env.example` com todas as variáveis | Pendente |

Detalhes em [Infraestrutura (Docker)](./08-docker.md).
