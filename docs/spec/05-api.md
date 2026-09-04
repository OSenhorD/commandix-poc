# 5. Contrato da API

[← Índice](./README.md)

Base URL: `/api/v1`

> DTOs de request/response abaixo. Campos sensíveis (`passwordHash`, `tokenHash`, `authKey` completo) não aparecem nas respostas. Tenant scoping é implícito via JWT — `tenantId` nunca vem do body.

## 5.0 Paginação (listagens)

Padrão único para `GET /integrations` e `GET /integrations/:id/executions`.

### Query params

| Param | Default | Regras |
|-------|---------|--------|
| `page` | `1` | Inteiro ≥ 1 (1-based) |
| `limit` | `20` | Inteiro ≥ 1, máx. **100** |

Validação: `page < 1`, `limit < 1` ou `limit > 100` → `400`.

Offset interno (Prisma): `offset = (page - 1) * limit`.

### Envelope de resposta

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

| Campo `meta` | Descrição |
|--------------|-----------|
| `page` | Página atual |
| `limit` | Tamanho da página |
| `total` | Total de itens **após filtros** (count separado) |
| `totalPages` | `Math.ceil(total / limit)` — `0` se `total === 0` |
| `hasNextPage` | `page < totalPages` |
| `hasPreviousPage` | `page > 1` |

Página além do fim (`page > totalPages` com `total > 0`) → `200` com `data: []` e `meta` coerente (não é erro).

## 5.1 Health

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | — | Healthcheck da API (Docker Compose, load balancers) |

Response `200`:

```json
{ "status": "ok" }
```

- Sem autenticação; rota pública.
- Usado pelo healthcheck do serviço `api` no Docker (`GET /api/v1/health` com global prefix).
- Falha (5xx ou timeout) impede o frontend de subir (`depends_on: service_healthy`).

## 5.2 Auth

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/tenants/bootstrap` | — | Cria tenant + admin (rate limit por IP) |
| POST | `/auth/login` | — | Retorna tokens |
| POST | `/auth/refresh` | — | Renova access token |
| POST | `/auth/logout` | JWT | Revoga refresh token **do dispositivo atual** |

### JWT — access token

Header: `Authorization: Bearer <accessToken>`.

Payload (claims):

| Claim | Tipo | Descrição |
|-------|------|-----------|
| `sub` | UUID | ID do usuário |
| `tenantId` | UUID | Tenant do usuário — usado para scoping no service |
| `role` | `ADMIN` \| `VIEWER` | Papel do usuário |
| `email` | string | Email do usuário |
| `iat` | number | Emitido em (padrão JWT) |
| `exp` | number | Expira em (padrão JWT) |

Duração configurável via env — ver [08-docker §8.2](./08-docker.md#82-variáveis-de-ambiente):

| Token | Variável | Default PoC |
|-------|----------|-------------|
| Access | `JWT_ACCESS_EXPIRES_IN` | `15m` |
| Refresh | `JWT_REFRESH_EXPIRES_IN` | `7d` |

Refresh token é opaco (string aleatória); hash armazenado em `RefreshToken.tokenHash` — **não** é JWT.

### POST /tenants/bootstrap

Rota pública. **Rate limit básico** por IP — default **5 requisições / 60 segundos** (`@nestjs/throttler`, escopo só nesta rota). Excesso → `429 Too Many Requests`.

**Única forma de criar usuários:** cria tenant + **primeiro usuário com role `ADMIN`**. Não há rotas para convidar ou cadastrar `VIEWER`/outros `ADMIN` — ver [02-escopo §2.1](./02-escopo-funcional.md).

Variáveis opcionais: `BOOTSTRAP_THROTTLE_TTL` (ms, default `60000`), `BOOTSTRAP_THROTTLE_LIMIT` (default `5`). Ver [08-docker §8.2](./08-docker.md#82-variáveis-de-ambiente).

`tenantSlug` deve ser único globalmente; `tenantName` é descritivo (pode repetir entre tenants).

Request:

```json
{
  "tenantName": "Acme Corp",
  "tenantSlug": "acme",
  "adminEmail": "admin@acme.com",
  "adminPassword": "secure123"
}
```

Response `201`:

```json
{
  "tenant": { "id": "...", "name": "Acme Corp", "slug": "acme" },
  "user": { "id": "...", "email": "admin@acme.com", "role": "ADMIN", "tenantId": "..." }
}
```

### POST /auth/login

Request:

```json
{ "email": "admin@acme.com", "password": "secure123" }
```

Response `200`:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "email": "...", "role": "ADMIN", "tenantId": "..." }
}
```

### POST /auth/refresh

Request:

```json
{ "refreshToken": "..." }
```

Response `200`:

```json
{ "accessToken": "..." }
```

### POST /auth/logout

Revoga **apenas** o refresh token enviado no body (dispositivo/sessão atual). Outros refresh tokens do mesmo usuário **permanecem válidos** até expirarem ou serem revogados individualmente em outro logout.

Request:

```json
{ "refreshToken": "..." }
```

Response `204` (sem body).

Comportamento:

- Localiza registro por hash do token; preenche `revokedAt`.
- Idempotente: token já revogado ou inexistente → `204` (sem vazar existência).
- Não invalida access tokens já emitidos (expiram naturalmente em ~15m).

## 5.3 Integrations

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/integrations` | ADMIN, VIEWER | Lista paginada do tenant |
| POST | `/integrations` | ADMIN | Cria |
| GET | `/integrations/:id` | ADMIN, VIEWER | Detalhe |
| PATCH | `/integrations/:id` | ADMIN | Atualiza |
| DELETE | `/integrations/:id` | ADMIN | Remove (hard delete + cascade execuções) |
| POST | `/integrations/:id/trigger` | ADMIN | Dispara execução |

### GET /integrations

Paginação: [§5.0](./05-api.md#50-paginação-listagens). Query params adicionais: `isActive` (opcional).

| Param | Default | Descrição |
|-------|---------|-----------|
| `isActive` | — (omitido) | Omitido = **todas**; `true` = só ativas; `false` = só inativas |

**Ordenação:** `updatedAt DESC` (fixa — sem parâmetro `sort` na PoC).

Integrações inativas (`isActive: false`) **aparecem** na listagem por padrão — necessário para ADMIN gerenciar/desativar. Filtro `?isActive=true` para UI que queira só ativas.

Response `200`:

```json
{
  "data": [
    {
      "id": "...",
      "name": "Order Webhook",
      "type": "WEBHOOK",
      "targetUrl": "https://webhook.site/abc-123",
      "authKey": "****-key",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Listagem retorna campos resumidos (sem `customHeaders` / `defaultPayload` completos) — detalhe em `GET /integrations/:id`.

### POST /integrations

Request:

```json
{
  "name": "Order Webhook",
  "type": "WEBHOOK",
  "targetUrl": "https://webhook.site/abc-123",
  "authKey": "secret-key",
  "customHeaders": { "X-Custom": "value" },
  "defaultPayload": { "source": "commandix" },
  "isActive": true
}
```

Response `201` (representação da integração):

```json
{
  "id": "...",
  "name": "Order Webhook",
  "type": "WEBHOOK",
  "targetUrl": "https://webhook.site/abc-123",
  "authKey": "****-key",
  "customHeaders": { "X-Custom": "value" },
  "defaultPayload": { "source": "commandix" },
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

### PATCH /integrations/:id

**PATCH parcial** — todos os campos são **opcionais**; apenas os enviados são alterados. Body vazio `{}` → `400`.

| Campo | Omitido | Enviado |
|-------|---------|---------|
| `name` | Mantém | Atualiza |
| `type` | Mantém | Atualiza |
| `targetUrl` | Mantém | Atualiza |
| `authKey` | **Mantém** (não apaga) | Substitui valor |
| `customHeaders` | Mantém | **Substitui** objeto inteiro (não merge) |
| `defaultPayload` | Mantém | **Substitui** objeto inteiro (não merge) |
| `isActive` | Mantém | Atualiza |

Request (exemplo — desativar):

```json
{ "isActive": false }
```

Request (exemplo — atualizar URL e headers):

```json
{
  "targetUrl": "https://webhook.site/new-id",
  "customHeaders": { "X-Custom": "new-value" }
}
```

Response `200` — mesma forma de `POST /integrations` (representação completa, `authKey` mascarada).

Campos **não** patcháveis: `id`, `tenantId`, `createdAt` (`updatedAt` atualizado pelo ORM).

### POST /integrations/:id/trigger

Disparo HTTP outbound: **sempre POST** para `targetUrl`; timeout 30s; **sem retry**. Não há campo `httpMethod` no modelo.

Request (payload opcional; merge shallow com `defaultPayload`):

> **Status da execução:** `SUCCESS` se a API externa responder com HTTP 2xx; `FAILURE` em qualquer outro caso (não-2xx, timeout, erro de rede). Body da resposta não altera o status.

> **`responseBody`:** truncado na persistência — ver [§5.4 — Truncamento](./05-api.md#truncamento-de-responsebody).

```json
{ "payload": { "event": "order.created", "orderId": "123" } }
```

Response `200` (execução criada):

```json
{
  "id": "...",
  "integrationId": "...",
  "status": "SUCCESS",
  "httpStatusCode": 200,
  "responseTimeMs": 342,
  "requestPayload": { "event": "order.created", "orderId": "123", "source": "commandix" },
  "responseBody": "{\"ok\":true}",
  "executedAt": "2026-01-01T00:00:00.000Z"
}
```

## 5.4 Executions

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/integrations/:id/executions` | ADMIN, VIEWER | Lista paginada |
| GET | `/executions/:id` | ADMIN, VIEWER | Detalhe |

Query params: paginação [§5.0](./05-api.md#50-paginação-listagens); filtros: `status`, `from`, `to`.

**Ordenação:** `executedAt DESC` (mais recentes primeiro). Fixa — sem parâmetro `sort` na PoC.

### Truncamento de `responseBody`

Ao persistir execução (trigger), corpo da resposta HTTP externa é limitado:

| Aspecto | Regra |
|---------|-------|
| Limite | **10 KB** = **10 240 bytes** UTF-8 |
| Quando | Antes de gravar em `IntegrationExecution.responseBody` |
| Como | Manter primeiros 10 240 bytes; sufixo `… [truncated]` se houve corte |
| API | Detalhe e trigger retornam valor **já truncado** armazenado (sem indicador extra além do sufixo) |
| `requestPayload` | **Sem** truncamento na PoC |

**Filtros de data (`from`, `to`):**

| Aspecto | Regra |
|---------|-------|
| Formato | **ISO 8601 / RFC 3339** — ex.: `2026-01-15T14:30:00.000Z`, `2026-01-15T14:30:00-03:00` |
| Atalho date-only | `YYYY-MM-DD` — `from` = início do dia UTC (`T00:00:00.000Z`); `to` = fim do dia UTC (`T23:59:59.999Z`) |
| Timezone | Offset na string ou `Z`; **sem offset → UTC**. Comparação sempre em UTC vs `executedAt` (timestamptz) |
| Inclusividade | **`from` e `to` inclusive** — `executedAt >= from` e `executedAt <= to` |
| Opcionalidade | Params independentes — só `from`, só `to`, ou ambos |
| Validação | ISO inválido → `400`; `from > to` → `400` |

Exemplos:

- `?from=2026-01-01&to=2026-01-31` — janeiro/2026 (UTC, dias inteiros)
- `?from=2026-01-15T00:00:00-03:00` — a partir do instante informado (normalizado para UTC)

Response `200` (listagem):

```json
{
  "data": [
    {
      "id": "...",
      "integrationId": "...",
      "status": "SUCCESS",
      "httpStatusCode": 200,
      "responseTimeMs": 342,
      "executedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Response `200` (detalhe — inclui `requestPayload` e `responseBody`):

```json
{
  "id": "...",
  "integrationId": "...",
  "status": "SUCCESS",
  "httpStatusCode": 200,
  "responseTimeMs": 342,
  "requestPayload": { "event": "order.created", "orderId": "123" },
  "responseBody": "{\"ok\":true}",
  "executedAt": "2026-01-01T00:00:00.000Z"
}
```

## 5.5 Códigos de erro padrão

| Código | Uso |
|--------|-----|
| 400 | Validação de DTO ou query inválida (ex.: paginação, ISO 8601 inválido, `from > to`) |
| 401 | Token ausente/inválido |
| 403 | Role insuficiente |
| 404 | Recurso não encontrado (inclui cross-tenant) |
| 409 | Conflito (`email` ou `tenantSlug` duplicado) |
| 429 | Rate limit excedido (bootstrap) |
