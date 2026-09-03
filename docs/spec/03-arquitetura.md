# 3. Arquitetura

[← Índice](./README.md)

## 3.1 Diagrama de contexto

```mermaid
flowchart TB
    subgraph client [Cliente]
        FE[React Frontend]
    end

    subgraph api [API NestJS]
        AUTH[Auth Module]
        TEN[Tenants Module]
        INT[Integrations Module]
        EXEC[Executions Module]
        DB[Database Module]
    end

    subgraph infra [Infra]
        PG[(PostgreSQL)]
        EXT[Serviços Externos / n8n]
    end

    FE -->|JWT| AUTH
    FE --> INT
    FE --> EXEC
    AUTH --> DB
    TEN --> DB
    INT --> DB
    EXEC --> DB
    INT -->|HTTP| EXT
    DB -->|Prisma 8| PG
```

## 3.2 Módulos NestJS

```
src/
├── auth/           # login, refresh, JWT strategy, guards
├── tenants/        # bootstrap de tenant + admin
├── integrations/   # CRUD + trigger
├── executions/     # listagem e detalhe
├── database/       # DatabaseModule — wrapper de db (Prisma 8)
├── prisma/         # contract.prisma, db.ts, seed.ts (não é módulo Nest)
└── common/         # decorators, filters, guards
    ├── decorators/ # @CurrentUser(), @Roles()
    └── guards/     # JwtAuthGuard, RolesGuard
```

## 3.3 Multi-tenancy — estratégia

Tenant ID no JWT + filtro explícito em todas as queries no **service**.

```typescript
const integration = await db.orm.Integration
  .where({ id, tenantId: user.tenantId })
  .first();
if (!integration) throw new NotFoundException();
```

Execuções: validar tenant via relação com `Integration` (tabela não tem `tenantId`).

**Proibido:** retornar recurso de outro tenant (404, não 403).

Prisma 8: `nexus-backend/.cursor/skills/prisma-8/SKILL.md`.

## 3.4 Fluxo de autenticação

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as AuthController
    participant DB as PostgreSQL

    C->>A: POST /auth/login
    A->>DB: valida credenciais
    A-->>C: accessToken + refreshToken

    C->>A: POST /auth/refresh
    A->>DB: valida refresh token
    A-->>C: novo accessToken

    Note over C,A: Authorization: Bearer {accessToken}
```
