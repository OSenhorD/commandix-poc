# 2. Escopo funcional

[← Índice](./README.md)

## 2.1 Autenticação e multi-tenancy

| Requisito | Detalhe |
|-----------|---------|
| Cadastro/login | JWT com **access token** (curta duração) + **refresh token** (longa duração) |
| Isolamento | Usuário só acessa dados do **próprio tenant** |
| Papéis | `ADMIN` — CRUD de integrações; `VIEWER` — somente leitura |
| Bootstrap | Rota pública para criar tenant + primeiro usuário Admin |

**Regras de negócio:**

- Email único **globalmente** (não por tenant)
- Tenant `slug` único globalmente; `name` é descritivo (sem unique)
- Refresh token armazenado com hash no banco
- Todas as queries de integração/execução filtradas por `tenantId` derivado do JWT

## 2.2 Cadastro de integrações

- Entidade `Integration` — campos e tipos em [Modelo de dados §4.3](./04-modelo-dados.md#43-definição-das-tabelas)
- Apenas `ADMIN` pode criar, editar ou desativar integrações
- `VIEWER` pode listar e ver detalhes

## 2.3 Disparo de integração

- Disparo **manual** com payload opcional (merge com `defaultPayload` da integração)
- Sistema executa HTTP request para `targetUrl` com headers configurados
- Registra execução na entidade `IntegrationExecution` — campos em [Modelo de dados §4.3](./04-modelo-dados.md#43-definição-das-tabelas)
- Endpoint e contrato HTTP em [API §5.2](./05-api.md#52-integrations)

**Fluxo esperado:**

1. Valida tenant + permissão (`ADMIN`)
2. Valida integração ativa
3. Monta request (method POST por padrão, headers + auth)
4. Executa com timeout (ex.: 30s)
5. Persiste `IntegrationExecution`
6. Retorna resultado da execução

## 2.4 Histórico de execuções

- Listagem paginada de execuções por integração
- Filtros por `status` e intervalo de datas (`from`, `to`)
- Detalhe de execução individual
- Paginação: `page`, `limit` (default 20, max 100)
- Endpoints e exemplos em [API §5.3](./05-api.md#53-executions)
