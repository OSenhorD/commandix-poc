# 8. Infraestrutura (Docker)

[← Índice](./README.md)

## 8.1 Serviços

Versões pinadas — ver `nexus-backend/package.json` (`engines.node`) e imagens abaixo.

| Serviço | Porta (host) | Imagem / build |
|---------|--------------|----------------|
| postgres | 5432 | `postgres:16-alpine` |
| api | 3000 | build `nexus-backend/Dockerfile` (`node:24.16.0-alpine`) |
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

HTTP_TRIGGER_TIMEOUT_MS=30000
```

Frontend usa `/api/v1` relativo — ver §8.6. `VITE_API_URL` opcional.

### JWT — duração dos tokens

| Token | Variável | Default | Uso |
|-------|----------|---------|-----|
| Access | `JWT_ACCESS_EXPIRES_IN` | `15m` | Curta duração; enviado em `Authorization: Bearer` |
| Refresh | `JWT_REFRESH_EXPIRES_IN` | `7d` | Longa duração; body de `/auth/refresh` e `/auth/logout` |

Formato: string compatível com biblioteca JWT (ex.: `15m`, `7d`, `1h`). Claims do access token: [05-api §5.2](./05-api.md#jwt--access-token).

Secrets separados: `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`.

### Rate limit (bootstrap)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `BOOTSTRAP_THROTTLE_TTL` | `60000` | Janela em ms |
| `BOOTSTRAP_THROTTLE_LIMIT` | `5` | Máx. requisições por IP na janela |

Aplica-se **somente** a `POST /tenants/bootstrap`. Resposta `429` quando excedido. Ver [05-api §5.2](./05-api.md#post-tenantsbootstrap).

## 8.3 Comando único

```bash
docker compose up --build
```

## 8.4 Startup

1. **Postgres** — healthcheck `pg_isready`
2. **API** — build inclui `contract emit` → entrypoint: `db migrate` → seed idempotente → `node dist/main.js`
3. **Frontend** — após API healthy (`GET /api/v1/health`)

## 8.5 Seed no entrypoint

**Decisão PoC:** o entrypoint da API **sempre** executa o seed após `db migrate`, em qualquer `NODE_ENV`. Não há seed condicional.

| Aspecto | Comportamento |
|---------|---------------|
| Objetivo | Garantir dados demo após `docker compose up` em banco vazio |
| Idempotência | Se tenant `acme` já existir, seed encerra sem inserir nada |
| Restart / redeploy | Seed roda de novo, mas é no-op quando dados demo já existem |
| Produção real | **Fora de escopo** — em produção típica seed não roda a cada deploy; aqui é conveniência para avaliadores |

Implementação: `nexus-backend/docker-entrypoint.sh` chama `tsx src/prisma/seed.ts` (ou equivalente) entre migrate e start.

## 8.6 Frontend — roteamento da API

O cliente HTTP usa **`/api/v1`** (caminho relativo). Mesma origem do browser → funciona com qualquer host (localhost, IP, hostname).

### Docker (nginx)

```nginx
location /api/ {
  proxy_pass http://api:3000/api/;
}
```

Build do frontend **não** precisa de `VITE_API_URL` absoluto.

### Dev local (Vite)

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3000',
  },
},
```

### Override opcional

`VITE_API_URL` no `.env` apenas se necessário (ex.: API em outro host durante dev).

## 8.8 CORS

| Ambiente | Frontend | API | CORS na API |
|----------|----------|-----|-------------|
| **Dev local** | Vite `:5173` | Nest `:3000` | **Sim** — `origin: 'http://localhost:5173'` |
| **Docker** | nginx `:5173` → `:80` | `:3000` (interno) | **Não** — browser usa mesma origem; `/api/` via proxy nginx |

### Dev local

Frontend e API em portas diferentes → browser exige CORS para chamadas diretas à API (`http://localhost:3000`).

```typescript
// main.ts
app.enableCors({ origin: 'http://localhost:5173' });
```

Com proxy Vite (`/api` → `:3000`) e URL relativa `/api/v1`, a maioria das chamadas do frontend é **same-origin** (`localhost:5173`). CORS na API ainda é configurado para:

- ferramentas externas (Postman, curl com `Origin`)
- override `VITE_API_URL` apontando direto para `:3000`

### Docker

nginx faz proxy `/api/` → `api:3000`. Browser só fala com o host do frontend — **sem preflight CORS** para rotas `/api/v1/*`.

## 8.7 Arquivos de infra

| Item | Arquivo |
|------|---------|
| Compose | `docker-compose.yml` |
| API | `nexus-backend/Dockerfile`, `docker-entrypoint.sh` |
| Frontend | `nexus-frontend/Dockerfile`, `nginx.conf` |
| Volume | `postgres_data` |
