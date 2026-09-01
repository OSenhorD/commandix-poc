# 5. Contrato da API

[← Índice](./README.md)

Base URL: `/api/v1`

> DTOs de request/response abaixo. Campos sensíveis (`passwordHash`, `tokenHash`, `authKey` completo) não aparecem nas respostas. Tenant scoping é implícito via JWT — `tenantId` nunca vem do body.

## 5.1 Auth

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/tenants/bootstrap` | — | Cria tenant + admin |
| POST | `/auth/login` | — | Retorna tokens |
| POST | `/auth/refresh` | — | Renova access token |
| POST | `/auth/logout` | JWT | Revoga refresh token |

### POST /tenants/bootstrap

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

Request:

```json
{ "refreshToken": "..." }
```

Response `204` (sem body).

## 5.2 Integrations

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/integrations` | ADMIN, VIEWER | Lista do tenant |
| POST | `/integrations` | ADMIN | Cria |
| GET | `/integrations/:id` | ADMIN, VIEWER | Detalhe |
| PATCH | `/integrations/:id` | ADMIN | Atualiza |
| DELETE | `/integrations/:id` | ADMIN | Remove (soft delete opcional) |
| POST | `/integrations/:id/trigger` | ADMIN | Dispara execução |

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

### POST /integrations/:id/trigger

Request (payload opcional; faz merge com `defaultPayload`):

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

## 5.3 Executions

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/integrations/:id/executions` | ADMIN, VIEWER | Lista paginada |
| GET | `/executions/:id` | ADMIN, VIEWER | Detalhe |

Query params: `page`, `limit`, `status`, `from`, `to`.

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
  "meta": { "page": 1, "limit": 20, "total": 1 }
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

## 5.4 Códigos de erro padrão

| Código | Uso |
|--------|-----|
| 400 | Validação de DTO |
| 401 | Token ausente/inválido |
| 403 | Role insuficiente |
| 404 | Recurso não encontrado (inclui cross-tenant) |
| 409 | Conflito (email/slug duplicado) |
