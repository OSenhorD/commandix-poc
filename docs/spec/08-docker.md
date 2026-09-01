# 8. Infraestrutura (Docker)

[← Índice](./README.md)

## 8.1 Serviços

| Serviço | Porta (host) | Imagem / build |
|---------|--------------|----------------|
| postgres | 5432 | `postgres:16-alpine` |
| api | 3000 | build `nexus-backend/Dockerfile` |
| frontend | 5173 → 80 | build `nexus-frontend/Dockerfile` (nginx) |

## 8.2 Variáveis de ambiente

Ver [`.env.example`](../../.env.example) na raiz. Principais:

```env
# Database
DATABASE_URL=postgresql://commandix:commandix@postgres:5432/commandix

# JWT
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
```

## 8.3 Comando único

```bash
docker compose up --build
```

Fluxo de startup:

1. **Postgres** — healthcheck com `pg_isready`
2. **API** — entrypoint executa `prisma migrate deploy` → `prisma db seed` → `node dist/main.js`
3. **Frontend** — sobe após API healthy (healthcheck em `/api/v1/health`)

## 8.4 Implementação atual

| Item | Arquivo |
|------|---------|
| Compose | `docker-compose.yml` |
| API image | `nexus-backend/Dockerfile`, `docker-entrypoint.sh` |
| Frontend image | `nexus-frontend/Dockerfile`, `nginx.conf` |
| Volume persistente | `postgres_data` |
