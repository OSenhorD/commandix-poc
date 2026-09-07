# Commandix PoC (Nexus)

Plataforma de automação B2B — módulo de gestão de integrações multi-tenant.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`docs/spec/`](./docs/spec/README.md) | Spec técnica — escopo, arquitetura, modelo de dados, contrato da API, checklist |
| [`AGENTS.md`](./AGENTS.md) | Contexto e log de decisões para agentes de IA |
| [`.agents/rules/`](./.agents/rules/) | Regras por domínio (NestJS, Prisma, React, Docker) |
| [`nexus-backend/.agents/skills/prisma-8/`](./nexus-backend/.agents/skills/prisma-8/SKILL.md) | Skill oficial do Prisma 8 (sincronizada, não editar à mão) |

## Pré-requisitos

Docker + Docker Compose. Nada é instalado no host — nem Node, nem npm.

## Início rápido

```bash
cp .env.example .env
docker compose -f docker/production/docker-compose.yml --project-directory . up --build
```

Para desenvolvimento (bind mount do código, watch mode e o serviço `frontend`):

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . up --build
```

`--project-directory .` mantém `.env` e caminhos relativos (`./nexus-backend`, volumes) resolvidos a partir da raiz, mesmo com os arquivos de compose em `docker/`.

Aguarde os healthchecks. A API sobe sozinha executando `prisma db migrate` → seed idempotente → `node dist/main.js`.

### Serviços

| Serviço | URL / porta | Observação |
|---------|-------------|------------|
| API | http://localhost:3000/api/v1 | prefixo global NestJS |
| Health | http://localhost:3000/api/v1/health | `{ "status": "ok" }` |
| Docs (Swagger UI) | http://localhost:3000/api/docs | Try-it com JWT (`Authorize` → Bearer) |
| OpenAPI JSON | http://localhost:3000/api/openapi.json | Documento OpenAPI 3.x via `@nestjs/swagger` |
| PostgreSQL | `localhost:5432` | Só no compose de desenvolvimento; user/senha/db default `commandix` |
| Frontend | http://localhost:5173 | Compose de **desenvolvimento** ou **produção** (nginx servindo o build estático + proxy `/api/`) |
| n8n | http://localhost:5678 | Bônus; só no compose de **desenvolvimento**. Primeiro acesso pede criar a conta owner |

### Credenciais demo (seed)

| Campo | Valor |
|-------|-------|
| Tenant | `Acme Corp` (slug `acme`) |
| Admin | `admin@acme.com` / `Admin123!` |
| Viewer | `viewer@acme.com` / `Admin123!` |

O seed roda no entrypoint da API em toda subida e é idempotente: se o tenant `acme` já existir, encerra sem inserir nada.

## Comandos

Nada roda no host — tudo é `exec` no container. Defina o atalho uma vez por sessão do shell:

```bash
alias dc='docker compose -f docker/development/docker-compose.yml --project-directory .'
```

O Compose de desenvolvimento precisa estar no ar para os comandos abaixo.

### Docker

```bash
dc up --build -d        # subir em background
dc logs -f api          # acompanhar a API
dc down                 # parar
dc down -v              # parar e apagar os volumes (reset do banco **e** dos workflows do n8n)
dc up database -d       # subir só o banco
```

Em produção, troque o `-f` por `docker/production/docker-compose.yml`.

### Testes

```bash
dc exec api npm test           # unitários (src/**/*.spec.ts)
dc exec api npm run test:e2e   # e2e (test/*.e2e-spec.ts)
dc exec api npm run test:cov   # com cobertura
dc exec frontend npm test      # frontend (cliente HTTP e gate de role)
```

Os e2e usam o `TEST_DATABASE_URL` que o Compose de desenvolvimento já injeta (banco `commandix_test`). O `seed.e2e-spec.ts` é ignorado se `DATABASE_URL` não estiver definida.

### Lint e formatação

Prettier é **isolado por pacote** — `nexus-backend/.prettierrc` (aspas simples) e `nexus-frontend/.prettierrc` (aspas duplas). Não há config na raiz; a extensão do VS Code resolve a mais próxima do arquivo.

```bash
dc exec api npm run lint             # oxlint
dc exec frontend npm run lint        # ESLint 10
dc exec frontend npm run typecheck   # tsc -b
dc exec api npm run format           # Prettier (write) — idem para o frontend
dc exec api npm run format:check     # Prettier (só verifica) — idem para o frontend
```

### Prisma 8

Skill de referência: [`nexus-backend/.agents/skills/prisma-8/SKILL.md`](./nexus-backend/.agents/skills/prisma-8/SKILL.md).

| Situação | Comando |
|----------|---------|
| Após editar `contract.prisma` | `dc exec api npm run contract:emit` |
| Dev (schema em fluxo) | `dc exec api npx prisma db update` |
| Nova migration versionada | `dc exec api npx prisma migration plan --name <slug>` → `dc exec api npx prisma db migrate` |
| DB vazio (primeira vez) | `dc exec api npx prisma db init` |
| Seed manual | `dc exec api npm run seed` |

**Docker / CI:** usar `db migrate`, nunca `db update`.

### Build

O `docker/production/Dockerfile` da API já executa `contract:emit` e `build`; o entrypoint cuida de migrate + seed + start. No dia a dia o watch mode rebuilda sozinho, mas `dc exec api npm run build` força uma compilação (`nest build` + `tsc-alias`).

## Bônus — n8n

O compose de desenvolvimento sobe um n8n em http://localhost:5678 para exercitar o tipo de integração `N8N`. Ele é um **serviço externo**: a plataforma não depende dele para subir, ele não espera pela API, e não existe no compose de produção.

O workflow demo (Webhook → Code → Respond to Webhook) já sobe **pronto e ativo** — o serviço `n8n-import` importa [`docker/n8n/workflows/commandix.json`](./docker/n8n/workflows/commandix.json) antes do `n8n` iniciar (`depends_on: service_completed_successfully`). Não é preciso montar nada na UI para testar.

### 1. Primeiro acesso

Abra http://localhost:5678 e crie a conta owner (e-mail e senha quaisquer — ficam no volume `n8n_dev_data`). O n8n removeu o basic auth por variável de ambiente na linha 1.x; a conta owner é o único login. O workflow **Commandix Demo** já aparece na lista, ativo.

### 2. Cadastrar a integração

Copie a **Production URL** do nó Webhook (aba **Commandix Demo** → nó **Webhook**). Graças a `N8N_WEBHOOK_URL` (fixada no compose) ela já sai como `http://n8n:5678/webhook/commandix` — o hostname que a API enxerga dentro da rede do Compose. Em http://localhost:5173 → **Integrações** → **Nova integração**:

| Campo | Valor |
|-------|-------|
| Nome | `n8n demo` |
| Tipo | `N8N` |
| URL de destino | `http://n8n:5678/webhook/commandix` |
| Payload padrão | `{ "pedido": 42 }` |

> Se a URL aparecer com `localhost`, troque por `n8n` antes de salvar — `localhost` dentro do container da API aponta para a própria API, não para o n8n.

### 3. Testar end-to-end

Na lista de integrações, clique em **Disparar**. Em **Execuções**, o registro deve sair com status `SUCCESS`, `httpStatusCode` 200 e o `responseBody` contendo o JSON devolvido pelo nó *Respond to Webhook*. No n8n, a aba **Executions** mostra o mesmo disparo do outro lado.

Para bater no webhook direto do host, sem passar pela plataforma, use `localhost` no lugar de `n8n`:

```bash
curl -X POST http://localhost:5678/webhook/commandix \
  -H 'Content-Type: application/json' \
  -d '{"pedido":42}'
```

### Editar o workflow

Editou o workflow na UI e quer versionar a mudança? Exporte de dentro do container e sobrescreva o arquivo do repo:

```bash
dc exec n8n n8n export:workflow --id=al0kKuoHKErreeDP --output=/tmp/wf.json
docker cp commandix-poc-n8n-1:/tmp/wf.json docker/n8n/workflows/commandix.json
```

O export já sai no formato de lista que o `n8n-import` espera. `dc down -v` (que apaga `n8n_dev_data`) faz o próximo `up` reimportar do zero a partir do JSON versionado — é assim que outro dev sobe com os dados já preenchidos.

## Variáveis de ambiente

Copie `.env.example` → `.env` na **raiz** do monorepo. Lista completa e variáveis derivadas pelo Compose: [`docs/spec/08-docker.md`](./docs/spec/08-docker.md) §8.2.

| Variável | Default | Uso |
|----------|---------|-----|
| `JWT_ACCESS_SECRET` | — | Assinatura do access token — **obrigatória em produção** (`up` falha se ausente) |
| `JWT_REFRESH_SECRET` | — | Assinatura do refresh token — **obrigatória em produção** |
| `DB_PASSWORD` | — | Senha do Postgres — **obrigatória em produção** |
| `DB_DATABASE` / `DB_USERNAME` | `commandix` | Postgres no Compose |
| `DB_PORT` | `5432` | Porta exposta do Postgres — **só em desenvolvimento**; em produção o banco não publica porta no host |
| `API_PORT` | `3000` | Porta exposta da API |
| `ENABLE_API_DOCS` | `true` | Liga/desliga `/api/docs` e `/api/openapi.json` (`false` → 404) |
| `VITE_API_URL` | `/api/v1` | Base do cliente HTTP no browser — override opcional |
| `VITE_API_PROXY_TARGET` | `http://api:3000` | Alvo do proxy do `vite dev` |
| `N8N_PORT` | `5678` | Porta exposta do n8n — **só em desenvolvimento** |
| `N8N_ENCRYPTION_KEY` | `dev-n8n-encryption-key` | Cifra as credenciais do n8n no volume `n8n_dev_data`; trocá-la torna ilegíveis as já gravadas |

A API recebe `DATABASE_URL` montada internamente pelo Compose (`database:5432`) — não vai no `.env`.

## CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — push/PR em `main`. Dois jobs:

- `validate` (Node 24.16.0 + Postgres 16 como service): `npm ci`, `contract:emit` com checagem de diff, `prisma db migrate`, lint, Prettier, testes unitários e e2e, build.
- `frontend` (Node 24.16.0): `npm ci`, ESLint, Vitest, `vite build`.

A validação por Docker Compose ainda não existe — ver [`docs/todo/backend/ci-sem-job-docker.md`](./docs/todo/backend/ci-sem-job-docker.md).

## Status

| Componente | Diretório | Status |
|------------|-----------|--------|
| API NestJS | `nexus-backend/` | Funcional — auth, tenants, integrações, execuções, OpenAPI, testes críticos |
| Frontend React | `nexus-frontend/` | Funcional — login/bootstrap, shell, CRUD de integrações, disparo, histórico + detalhe, Docker de produção |
| PostgreSQL + Prisma 8 | `nexus-backend/src/prisma/` | Contract + migrations + seed |
| Docker Compose | `docker/` | Dev: `database` + `api` + `frontend` + `n8n-import` + `n8n`; prod: `database` + `api` + `frontend` (nginx) |

## Decisões técnicas

Log completo das decisões em [`AGENTS.md`](./AGENTS.md) § Decisões adotadas. As que mais afetam a leitura do código:

**`authKey` at-rest: texto plano.** A credencial de cada integração é gravada sem criptografia. Foi decisão consciente de PoC — criptografia simétrica exigiria uma chave mestra, rotação e um caminho de migração que não agregam ao que está sendo avaliado. A mitigação existente é de exposição, não de armazenamento: a API sempre devolve a chave **mascarada** (`****-key`) e o valor real só sai do banco para montar o header `Authorization: Bearer` do disparo. Em produção isso viraria um campo cifrado com envelope encryption (KMS) ou uma referência a um cofre externo.

**Multi-tenancy por filtro explícito no service.** O `tenantId` vem do JWT e entra em toda query de negócio; nada é lido do body ou da query string. Acesso cross-tenant devolve **404**, nunca 403 — um 403 confirmaria que o recurso existe em outro tenant. Execuções não têm `tenantId` próprio: o escopo é validado pela relação com `Integration`.

**Disparo HTTP sem retry.** Sempre POST, timeout de 30s, uma tentativa. Retry automático em webhook não idempotente duplicaria efeito no serviço externo; o registro da execução fica com `FAILURE` e o reenvio é manual. `responseBody` é truncado em 10 240 bytes UTF-8 para o histórico não virar depósito de payload.

**Seed no entrypoint, em toda subida.** Garante que `docker compose up` entregue dados demo funcionais ao avaliador. É idempotente (pula se o tenant `acme` existir), mas **não é padrão de produção** — em produção real o seed não roda a cada deploy.

**Tokens no `localStorage` do frontend.** Escolha de PoC, com a limitação conhecida de exposição a XSS. A alternativa mais defensável seria refresh token em cookie `httpOnly` + `SameSite`, que exigiria mesma origem ou CORS com credenciais. O acesso é isolado em `shared/lib/storage.ts`, então a troca fica contida num arquivo.

## Pontos em aberto

- **CI sem validação de Docker Compose** — o workflow valida o backend direto no runner; ninguém garante que `docker compose up` sobe. Ver [`docs/todo/backend/ci-sem-job-docker.md`](./docs/todo/backend/ci-sem-job-docker.md).
- **`authKey` sem criptografia at-rest** — ver decisão acima.
- **Bônus não implementado** — cobertura de testes além do mínimo crítico.
- Demais itens da fila em [`docs/todo/`](./docs/todo/README.md).

## Licença

Projeto de desafio técnico — uso interno.
