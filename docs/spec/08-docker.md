# 8. Infraestrutura (Docker)

[← Índice](./README.md)

## 8.1 Serviços

| Serviço | Porta (host) | Imagem / build |
|---------|--------------|----------------|
| postgres | 5432 | `postgres:16-alpine` |
| api | 3000 | build `nexus-backend/Dockerfile` |
| frontend | 5173 → 80 | build `nexus-frontend/Dockerfile` (nginx) |

## 8.2 Variáveis de ambiente

Ver [`.env.example`](../../.env.example) na raiz:

```env
DATABASE_URL=postgresql://commandix:commandix@postgres:5432/commandix

JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development

VITE_API_URL=http://localhost:3000/api/v1
HTTP_TRIGGER_TIMEOUT_MS=30000
```

## 8.3 Comando único

```bash
docker compose up --build
```

## 8.4 Startup

1. **Postgres** — healthcheck `pg_isready`
2. **API** — build inclui `contract emit` → entrypoint: `db migrate` → seed idempotente → `node dist/main.js`
3. **Frontend** — após API healthy (`GET /api/v1/health`)

Migrations versionadas em `nexus-backend/migrations/app/` (Prisma 8). Skill: `nexus-backend/.cursor/skills/prisma-8/references/migrations.md`.

## 8.5 Arquivos de infra

| Item | Arquivo |
|------|---------|
| Compose | `docker-compose.yml` |
| API | `nexus-backend/Dockerfile`, `docker-entrypoint.sh` |
| Frontend | `nexus-frontend/Dockerfile`, `nginx.conf` |
| Volume | `postgres_data` |
