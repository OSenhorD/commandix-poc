# 2. Escopo funcional

[← Índice](./README.md)

## 2.1 Autenticação e multi-tenancy

| Requisito | Detalhe |
|-----------|---------|
| Cadastro/login | JWT com **access token** (`15m`) + **refresh token** (`7d`) — ver [08-docker §8.2](./08-docker.md#82-variáveis-de-ambiente) |
| Isolamento | Usuário só acessa dados do **próprio tenant** |
| Papéis | `ADMIN` — CRUD de integrações; `VIEWER` — somente leitura |
| Bootstrap | Rota pública para criar tenant + primeiro usuário Admin; **rate limit básico** por IP |
| Criação de usuários | **Somente bootstrap** — tenant + um `ADMIN`; sem convite, sem CRUD de usuários |
| Logout | Revoga **apenas** o refresh token do dispositivo atual; sessões em outros dispositivos permanecem |

**Regras de negócio:**

- Email único **globalmente** (não por tenant)
- Tenant `slug` único globalmente; `name` é descritivo (sem unique)
- Refresh token armazenado com hash no banco; **um registro por login/dispositivo**
- Logout preenche `revokedAt` **somente** no refresh token enviado no body — não revoga tokens de outras sessões
- Todas as queries de integração/execução filtradas por `tenantId` derivado do JWT
- Bootstrap: rate limit por IP — default **5 req / 60s** (`@nestjs/throttler`); ver [05-api §5.2](./05-api.md#post-tenantsbootstrap)
- **Fora de escopo:** convite de usuários, criação de `VIEWER`/`ADMIN` após bootstrap, módulo `users/` — usuários extras no seed (`viewer@acme.com`) são **dados demo**, não feature de API

## 2.2 Cadastro de integrações

- Entidade `Integration` — campos e tipos em [Modelo de dados §4.3](./04-modelo-dados.md#43-definição-das-tabelas)
- Apenas `ADMIN` pode criar, editar ou desativar integrações
- `VIEWER` pode listar e ver detalhes
- Listagem paginada — padrão [05-api §5.0](./05-api.md#50-paginação-listagens); filtro opcional `isActive`; ordenação `updatedAt DESC` — [05-api §5.3](./05-api.md#get-integrations)

## 2.3 Disparo de integração

- Disparo **manual** com payload opcional (merge com `defaultPayload` da integração)
- Sistema executa HTTP request para `targetUrl` com headers configurados
- Registra execução na entidade `IntegrationExecution` — campos em [Modelo de dados §4.3](./04-modelo-dados.md#43-definição-das-tabelas)
- Endpoint e contrato HTTP em [API §5.3](./05-api.md#53-integrations)

**Fluxo esperado:**

1. Valida tenant + permissão (`ADMIN`)
2. Valida integração ativa
3. Monta request (**sempre POST**, headers + auth; sem campo `httpMethod`; sem retry)
4. Executa com timeout (ex.: 30s)
5. Persiste `IntegrationExecution` — `SUCCESS` se a API externa retornar sucesso (HTTP 2xx); `FAILURE` caso contrário; `responseBody` truncado em 10 240 bytes ([05-api §5.4](./05-api.md#truncamento-de-responsebody))
6. Retorna resultado da execução

## 2.4 Histórico de execuções

- Listagem paginada de execuções por integração
- Ordenação: **`executedAt DESC`** (mais recentes primeiro)
- Filtros por `status` e intervalo de datas (`from`, `to`) — ISO 8601, UTC, **inclusive**; ver [05-api §5.4](./05-api.md#54-executions)
- Detalhe de execução individual
- Paginação — padrão [05-api §5.0](./05-api.md#50-paginação-listagens)
- Endpoints e exemplos em [API §5.4](./05-api.md#54-executions)
