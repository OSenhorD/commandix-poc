# 8. Infraestrutura (Docker)

[← Índice](./README.md)

## 8.1 Serviços

Versões pinadas — ver `nexus-backend/package.json` (`engines.node`) e imagens abaixo.

| Serviço | Porta (host) | Imagem / build |
|---------|--------------|----------------|
| database | 5432 (dev) / não exposto (prod) | `postgres:16-alpine` |
| api | 3000 | build `nexus-backend/docker/production/Dockerfile` (prod) / `docker/development/Dockerfile` (dev) — `node:24.16.0-alpine` |
| frontend | 5173 → 80 (prod) / 5173 (dev) | build `nexus-frontend/docker/production/Dockerfile` (nginx) / `docker/development/Dockerfile` (`vite dev --host`) |

Em produção, o Postgres **não expõe porta no host** — apenas os serviços da rede do compose acessam via hostname interno `database`.

## 8.2 Variáveis de ambiente

Copie [`.env.example`](../../.env.example) (raiz do monorepo) → `.env`. Cópia fiel do arquivo — comentários indicam o default aplicado pelos composes quando a variável é omitida:

```env
# JWT
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
# JWT_ACCESS_EXPIRES_IN=15m
# JWT_REFRESH_EXPIRES_IN=7d

# Database
# DB_DATABASE=commandix
# DB_USERNAME=commandix
DB_PASSWORD=change-me-db-password
# DB_PORT=5432

# API
# API_PORT=3000
ENABLE_API_DOCS=true

# HTTP trigger
# HTTP_TRIGGER_TIMEOUT_MS=30000

# Bootstrap rate limit
# BOOTSTRAP_THROTTLE_TTL=60000
# BOOTSTRAP_THROTTLE_LIMIT=5

# Frontend — opcional; default no código é /api/v1 (relativo)
# VITE_API_URL=/api/v1
# FRONTEND_PORT=5173
# VITE_API_PROXY_TARGET=http://api:3000
```

`ENABLE_API_DOCS` liga/desliga `/api/docs` e `/api/openapi.json` — `false` → `404` nas duas. Default: ligado. Ver [05-api §5.6](./05-api.md#56-documentação-openapi).

Frontend usa `/api/v1` relativo — ver §8.6. `VITE_API_URL` e `VITE_API_PROXY_TARGET` são opcionais:

| Variável | Default | Uso |
|----------|---------|-----|
| `FRONTEND_PORT` | `5173` | Porta publicada do serviço `frontend` (host) |
| `VITE_API_URL` | `/api/v1` | Base do cliente HTTP no browser — só sobrescrever se a API não estiver atrás do mesmo host |
| `VITE_API_PROXY_TARGET` | `http://api:3000` | Alvo do proxy do `vite dev` (build time do dev server, não do bundle) |

**Produção — obrigatórias:** `docker/production/docker-compose.yml` usa `${VAR:?...}` para `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` e `DB_PASSWORD` — sem fallback fraco; o `docker compose up` falha rápido se alguma faltar no `.env`.

### Variáveis derivadas ou fixadas no Compose

**Não** entram no `.env` — são montadas ou fixadas pelos arquivos de compose:

| Variável | Origem | Valor |
|----------|--------|-------|
| `DATABASE_URL` | Montada a partir de `DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE` + hostname interno `database` | `postgresql://<user>:<pass>@database:5432/<db>` |
| `TEST_DATABASE_URL` | Compose de desenvolvimento apenas — mesmo host/credenciais, banco `commandix_test` | `postgresql://<user>:<pass>@database:5432/commandix_test` |
| `NODE_ENV` | Fixado por serviço | `production` / `development` |
| `PORT` | Fixado — porta interna do processo Nest (não confundir com `API_PORT`, a porta publicada no host) | `3000` |
| `API_DEBUG_PORT` | Compose de desenvolvimento apenas — porta do inspector Node (`--inspect`) | default `9229` |

Host do Postgres é **`database`** (nome do serviço no compose), não `postgres`.

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
# Produção
docker compose -f docker/production/docker-compose.yml --project-directory . up --build

# Desenvolvimento (bind mount + watch)
docker compose -f docker/development/docker-compose.yml --project-directory . up --build
```

`--project-directory .` garante que `.env` e caminhos relativos do compose (`./nexus-backend`, volumes) resolvam a partir da raiz do monorepo, mesmo com os arquivos de compose dentro de `docker/`.

## 8.4 Startup

1. **Postgres** — healthcheck `pg_isready`
2. **API** — build inclui `contract emit` → entrypoint: `db migrate` → seed idempotente → `node dist/main.js`
3. **Frontend** — após API healthy (`GET /api/v1/health`)
   - prod: nginx servindo o build estático + proxy `/api/`
   - dev: `vite dev --host` com bind mount e proxy `/api` → `api:3000`

## 8.5 Seed no entrypoint

**Decisão PoC:** o entrypoint da API **sempre** executa o seed após `db migrate`, em qualquer `NODE_ENV`. Não há seed condicional.

| Aspecto | Comportamento |
|---------|---------------|
| Objetivo | Garantir dados demo após `docker compose up` em banco vazio |
| Idempotência | Se tenant `acme` já existir, seed encerra sem inserir nada |
| Restart / redeploy | Seed roda de novo, mas é no-op quando dados demo já existem |
| Produção real | **Fora de escopo** — em produção típica seed não roda a cada deploy; aqui é conveniência para avaliadores |

Implementação: `nexus-backend/docker/production/entrypoint.sh` (prod) / `docker/development/entrypoint.sh` (dev) chama o seed entre migrate e start.

## 8.6 Frontend — roteamento da API

O cliente HTTP usa **`/api/v1`** (caminho relativo). Mesma origem do browser → funciona com qualquer host (IP, hostname, domínio).

### Docker — produção (nginx)

```nginx
location /api/ {
  proxy_pass http://api:3000/api/;
}
```

**Proxiar todo o prefixo `/api/`**, não apenas `/api/v1/` — assim `/api/docs` (Swagger UI) e `/api/openapi.json` continuam acessíveis atrás do proxy, já que ficam fora do prefixo versionado ([05-api §5.6](./05-api.md#56-documentação-openapi)).

Rotas do SPA (React Router) precisam de fallback: `try_files $uri $uri/ /index.html`.

Build do frontend **não** precisa de `VITE_API_URL` absoluto.

### Docker — desenvolvimento (Vite)

O container do frontend em dev roda `vite dev` (bind mount + hot-reload), na mesma rede do Compose que o serviço `api` — o proxy resolve `api` pelo hostname interno do Docker, nunca por `localhost`:

```typescript
// vite.config.ts
server: {
  host: true, // expõe o dev server para fora do container
  port: 5173,
  proxy: {
    '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://api:3000',
  },
},
```

`VITE_API_PROXY_TARGET` existe para quem eventualmente rodar `npm run dev` fora do Compose — no host, `api` não resolve.

### Override opcional

`VITE_API_URL` no `.env` apenas se necessário (ex.: API publicada em porta/host diferente do padrão do Compose).

## 8.7 Arquivos de infra

| Item | Arquivo |
|------|---------|
| Compose | `docker/production/docker-compose.yml`, `docker/development/docker-compose.yml` |
| CI | `.github/workflows/ci.yml` |
| API | `nexus-backend/docker/production/Dockerfile`/`docker/production/entrypoint.sh` (prod), `docker/development/Dockerfile`/`docker/development/entrypoint.sh` (dev) |
| Frontend | `nexus-frontend/docker/production/Dockerfile` + `nginx.conf` (prod), `nexus-frontend/docker/development/Dockerfile` (dev) — mesma convenção do backend |
| Volume | `postgres_data` |

## 8.8 CORS

| Ambiente | Frontend | API | CORS na API |
|----------|----------|-----|-------------|
| **Docker — dev (Vite)** | container `vite dev`, porta publicada `:5173` | container `api`, porta publicada `:3000` | **Sim** — `origin: 'http://localhost:5173'` |
| **Docker — prod (nginx)** | container nginx `:5173` → `:80` | `:3000` (interno) | **Não** — browser usa mesma origem; `/api/` via proxy nginx |

### Docker — dev (Vite)

Frontend e API rodam em containers separados, cada um publicando sua porta no host → do ponto de vista do browser são origens diferentes, exigindo CORS para chamadas diretas à API (`http://localhost:3000`).

```typescript
// main.ts
app.enableCors({ origin: 'http://localhost:5173' });
```

Com proxy Vite (`/api` → `api:3000` via rede do Docker) e URL relativa `/api/v1`, a maioria das chamadas do frontend é **same-origin** (`localhost:5173`, porta publicada do container). CORS na API ainda é configurado para:

- ferramentas externas (Postman, curl com `Origin`)
- override `VITE_API_URL` apontando direto para a porta publicada da API

### Docker — prod (nginx)

nginx faz proxy `/api/` → `api:3000`. Browser só fala com o host do frontend — **sem preflight CORS** para rotas `/api/v1/*`.

## 8.9 CI (GitHub Actions)

Arquivo: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

| Job | Validações |
|-----|------------|
| `validate` | Backend: Node 24.16.0 + Postgres 16 service — `contract:emit`, diff do contract, migrate, lint, Prettier, test/e2e, build |
| `frontend` | Frontend: `npm ci`, ESLint, `tsc -b`, Vitest, `vite build` — **a criar na entrega F12** |

> **Não existe job de Docker Compose no CI** — ver [`docs/todo/ci-sem-job-docker.md`](../todo/ci-sem-job-docker.md).

Dispara em push/PR para `main`.
