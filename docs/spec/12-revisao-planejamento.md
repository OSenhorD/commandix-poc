# 12. Revisão crítica do planejamento

[← Índice](./README.md)

> Análise de brechas, ambiguidades e inconsistências entre a spec, `AGENTS.md`, `.cursor/rules/` e o estado atual do repositório.  
> Data: 2026-09-02

## Resumo executivo

**Prioridade máxima:** fechar regras de disparo HTTP (`authKey`, merge de payload) antes da Fase 3.

---

## 2. Ambiguidades de negócio

### 2.2 `IntegrationType` — enum sem comportamento

Valores: `WEBHOOK`, `REST_API`, `N8N`.

O disparo descrito é sempre o mesmo: HTTP POST para `targetUrl`, headers configurados, merge de payload. Não há diferença de método, autenticação ou formato por tipo.

**Risco:** implementador ou avaliador assume comportamentos distintos que não existem na spec.

**Sugestão:** documentar que o tipo é **metadado/label** na PoC, exceto se `N8N` (bônus) exigir header ou URL específicos — nesse caso, especificar.

### 2.3 "Desativar" vs DELETE vs soft delete

| Fonte | Afirmação |
|-------|-----------|
| Escopo | ADMIN pode "**desativar**" integrações |
| API | `PATCH` (presumivelmente `isActive: false`) |
| API | `DELETE` — "(soft delete opcional)" |
| Trigger | "Valida integração **ativa**" |

**Perguntas em aberto:**

- `DELETE` remove o registro ou apenas seta `isActive = false`?
- Integração inativa aparece na listagem `GET /integrations`?
- O que acontece com execuções históricas após DELETE?
- Há cascade ou restrição de FK?

**Sugestão:** `PATCH isActive=false` para desativar; `DELETE` como hard delete com cascade nas execuções **ou** soft delete com filtro `deletedAt IS NULL` — escolher um e documentar.

### 2.4 Merge de payload no trigger

> "Payload opcional; faz merge com `defaultPayload`"

Não especifica:

- merge **raso** (shallow) ou **profundo** (deep)?
- `payload: {}` — mantém todo o `defaultPayload` ou sobrescreve?
- `defaultPayload` é `null` — body vazio, `{}`, ou omitir Content-Type?
- chaves com valor `null` no payload do trigger removem chaves do default?

O exemplo em [05-api](./05-api.md) sugere merge raso com chaves do default preservadas, mas não é normativo.

**Sugestão:** shallow merge; `{ ...defaultPayload, ...payload }`; se ambos ausentes, body `{}` ou omitido — definir um.

### 2.6 `authKey` — armazenamento e uso no HTTP outbound

| Fonte | Afirmação |
|-------|-----------|
| Modelo | "Armazenada criptografada **ou** em texto" |
| API | "Mascarada na API" (`****-key`) |
| Disparo | Não especifica como enviar no request externo |

**Perguntas em aberto:**

- Bearer token? Header custom (`X-Api-Key`)? Query param?
- Se `customHeaders` inclui `Authorization`, qual prevalece?
- Em `PATCH`, omitir `authKey` mantém valor anterior ou apaga?
- Criptografia at-rest é obrigatória ou decisão do candidato?

**Sugestão mínima para PoC:** enviar como `Authorization: Bearer {authKey}`; PATCH parcial não altera `authKey` se omitido; documentar no README.

---

## 3. Brechas de multi-tenancy

### 3.1 `IntegrationExecution` sem `tenantId`

A tabela de execuções referencia apenas `integrationId`. Isolamento depende de join com `Integration.tenantId`.

Endpoints afetados:

- `GET /integrations/:id/executions`
- `GET /executions/:id`

**Risco:** implementar `findUnique({ where: { id } })` na execução e vazar dados cross-tenant.

**Sugestão:** adicionar ao checklist e à spec: *"Toda query de execução deve validar tenant via relação com Integration"*.

### 3.2 `TenantGuard` vs scoping no service

| Fonte | Abordagem |
|-------|-----------|
| [03-arquitetura](./03-arquitetura.md) | Lista `TenantGuard` em `common/guards/` |
| `AGENTS.md` / rules | Scoping explícito no **service** com `tenantId` do JWT |

São compatíveis, mas a spec não escolhe uma estratégia primária.

**Risco:** duplicação de lógica ou omissão em um dos layers.

**Sugestão:** service como fonte de verdade; guard opcional como defense-in-depth — documentar.

### 3.3 Email único globalmente

Regra: email único **globalmente** (não por tenant).

Implica que o mesmo email não pode existir em dois tenants. Decisão válida para PoC, mas deve ser documentada como **intencional** no README (impede modelo "usuário em múltiplas empresas").

### 3.4 Cross-tenant: 404 vs 403

Bem definido para recursos de outro tenant → **404** (não vazar existência).

Para role insuficiente (VIEWER em rota ADMIN) → **403**. Consistente em [05-api](./05-api.md).

---

## 4. Brechas de API / contrato

| Lacuna | Detalhe | Onde deveria estar |
|--------|---------|-------------------|
| Health check | Docker exige `GET /api/v1/health` | [05-api](./05-api.md), checklist |
| JWT claims | Payload não documentado (`sub`, `tenantId`, `role`?) | [05-api](./05-api.md) ou arquitetura |
| Duração dos tokens | `.env.example`: `15m` / `7d`; escopo só "curta/longa" | [08-docker](./08-docker.md) |
| Logout multi-dispositivo | Revoga um refresh token; outros permanecem? | [02-escopo-funcional](./02-escopo-funcional.md) |
| Bootstrap aberto | Rota pública sem rate limit | README (decisão consciente para PoC) |
| Criação de usuários | Só bootstrap; sem convite de VIEWER/ADMIN | Escopo ou fora de escopo explícito |
| Ordenação de execuções | Não definida | [05-api](./05-api.md) — sugerir `executedAt DESC` |
| Filtros `from`/`to` | Formato ISO 8601? inclusive/exclusive? timezone? | [05-api](./05-api.md) |
| Truncamento `responseBody` | "Truncar se necessário" — limite? | Modelo + README |
| CORS | Frontend `:5173`, API `:3000` | Checklist Fase 1 ou 5 |
| PATCH parcial | Quais campos são opcionais no update? | [05-api](./05-api.md) |
| Listagem integrações | Filtro por `isActive`? paginação? | [05-api](./05-api.md) |

---

## 7. Inconsistências entre documentos

| Tema | Documento A | Documento B |
|------|-------------|-------------|
| Módulos NestJS | [03-arquitetura](./03-arquitetura.md): inclui `users/` (opcional) | `AGENTS.md`: não lista `users/` |
| React | `readme.md`: React 19 | [06-stack](./06-stack.md): "React + TypeScript" |
| Testes | [10-criterios](./10-criterios.md): bônus | `AGENTS.md`: prioridade alta |
| UI / Tailwind | `readme.md`: extensão Tailwind sugerida | `.cursor/rules/react-frontend.mdc`: sem biblioteca pesada |
| Retry no HTTP | `AGENTS.md`: decisão a documentar | [02-escopo-funcional](./02-escopo-funcional.md): só timeout, sem retry |
| HTTP method | "POST por padrão" | Não há campo `httpMethod` no modelo — sempre POST? |

---

## 8. Checklist — itens ausentes

Além das fases 1–6 em [11-checklist](./11-checklist.md), considerar:

- [ ] CORS na API
- [ ] `GET /api/v1/health` (contrato + implementação)
- [ ] Política de `authKey` no disparo HTTP
- [ ] Regras de merge de payload (shallow/deep)
- [ ] Soft delete vs hard delete + efeito em execuções
- [ ] Tenant scoping em **execuções** (via join com Integration)
- [ ] Truncamento de `responseBody` (limite em bytes/chars)
- [x] Escopo frontend: paridade funcional completa na UI (ver [01-visao-geral](./01-visao-geral.md), Fase 5 do checklist)
- [ ] Conflito `customHeaders` vs `authKey`
- [ ] Ordenação e formato de filtros de data na listagem

---

## 10. Recomendações prioritárias

| # | Ação | Bloqueia |
|---|------|----------|
| 1 | Implementar domínio em `contract.prisma` + migration inicial | Fase 1 |
| 2 | ADR/README: `authKey`, merge payload | Fase 3 |
| 3 | Spec: tenant scoping em execuções | Fase 4 |
| 4 | Spec: soft delete / desativar / DELETE | Fase 3 |
| 5 | ~~Definir escopo UI~~ — resolvido: escopo completo na UI | — |
| 6 | Completar [05-api](./05-api.md): health, datas, ordenação, PATCH | Fase 2–4 |
| 7 | Clarificar `IntegrationType` como metadado | Fase 3 |

---

## 11. Decisões adotadas

> **Normativas** — consolidadas em [`AGENTS.md`](../../AGENTS.md) e `.cursor/rules/`.

| Tópico | Default sugerido |
|--------|------------------|
| `IntegrationType` | Metadado; disparo idêntico para todos |
| Desativar | `PATCH { isActive: false }` |
| DELETE | Hard delete + cascade em execuções |
| Merge payload | Shallow: `{ ...defaultPayload, ...payload }` |
| `authKey` | `Authorization: Bearer {authKey}` |
| PATCH `authKey` | Omitido = mantém valor anterior |
| Execuções | Sempre filtrar via `integration.tenantId` |
| Ordenação | `executedAt DESC` |
| Truncamento | 10 KB em `responseBody` |
| Frontend | Escopo completo — cadastros e ações na UI (paridade com API) |
| Seed Docker | Idempotente; roda sempre na PoC |
| CORS | `origin: true` ou `http://localhost:5173` em dev |

---

## Referências cruzadas

| Documento | Relação |
|-----------|---------|
| [11-checklist](./11-checklist.md) | Deve incorporar itens da §8 |
| [05-api](./05-api.md) | Principal alvo de clarificações |
| [04-modelo-dados](./04-modelo-dados.md) | UK de tenant, cascade delete |
| [AGENTS.md](../../AGENTS.md) | Decisões técnicas em aberto |
| `.cursor/rules/` | Deve refletir decisão de ORM |
