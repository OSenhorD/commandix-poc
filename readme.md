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
| Evolution API | http://localhost:8080 | Extra do bônus; só no compose de **desenvolvimento**. UI de pareamento em `/manager` (login com a `apikey`) |

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
dc down -v              # parar e apagar os volumes (reset do banco, dos workflows do n8n **e** do pareamento do WhatsApp — exige celular físico e novo QR code)
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

São **dois workflows versionados**, ambos importados e ativados pelo `n8n-import` antes do `n8n` iniciar (`depends_on: service_completed_successfully`) — não é preciso montar nada na UI para testar:

| Workflow | Webhook (dentro do Compose) | O que faz |
|----------|------------------------------|-----------|
| **Commandix Demo** | `http://n8n:5678/webhook/commandix` | Eco: devolve em JSON o payload recebido, com carimbo de tempo |
| **Commandix WhatsApp** | `http://n8n:5678/webhook/commandix-whatsapp` | Envia o texto por WhatsApp chamando o [Evolution API](https://github.com/evolution-foundation/evolution-api) |

O segundo fecha o fluxo `Commandix → n8n → Evolution API → WhatsApp`: o `defaultPayload` da integração é o que define destinatário (`number`) e conteúdo (`text`). Os arquivos ficam em [`docker/n8n/workflows/`](./docker/n8n/workflows/).

### 1. Primeiro acesso

Abra http://localhost:5678 e crie a conta owner (e-mail e senha quaisquer — ficam no volume `n8n_dev_data`). O n8n removeu o basic auth por variável de ambiente na linha 1.x; a conta owner é o único login. Os workflows **Commandix Demo** e **Commandix WhatsApp** já aparecem na lista, ativos.

### 2. Parear o WhatsApp (Evolution API)

Só é necessário para o workflow **Commandix WhatsApp**. Crie a instância (uma vez só) e conecte o celular:

```bash
curl -X POST http://localhost:8080/instance/create \
  -H 'apikey: dev-evolution-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"instanceName":"commandix","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

Abra http://localhost:8080/manager, entre com a mesma chave (`EVOLUTION_API_KEY`), clique na instância `commandix` e leia o QR code no celular (WhatsApp → **Aparelhos conectados** → **Conectar aparelho**). Para confirmar:

```bash
curl -s http://localhost:8080/instance/connectionState/commandix -H 'apikey: dev-evolution-api-key'
```

O pareamento fica no volume `evolution_dev_data` e sobrevive a `dc down`. Sem parear, o disparo continua percorrendo o fluxo inteiro — o n8n responde 200 e a execução registra o erro que o Evolution devolveu, em vez da mensagem.

### 3. Cadastrar a integração

Copie a **Production URL** do nó Webhook de cada workflow (aba do workflow → nó **Webhook**). Graças a `N8N_WEBHOOK_URL` (fixada no compose) ela já sai como `http://n8n:5678/webhook/...` — o hostname que a API enxerga dentro da rede do Compose. Em http://localhost:5173 → **Integrações** → **Nova integração**:

**Eco (Commandix Demo):**

| Campo | Valor |
|-------|-------|
| Nome | `n8n demo` |
| Tipo | `N8N` |
| URL de destino | `http://n8n:5678/webhook/commandix` |
| Payload padrão | `{ "pedido": 42 }` |

**WhatsApp (Commandix WhatsApp):**

| Campo | Valor |
|-------|-------|
| Nome | `n8n whatsapp` |
| Tipo | `N8N` |
| URL de destino | `http://n8n:5678/webhook/commandix-whatsapp` |
| Payload padrão | `{ "number": "5511999999999", "text": "Olá do Commandix" }` |

> No workflow de WhatsApp, `number` vai só com dígitos, incluindo DDI e DDD. `text` é o corpo da mensagem — se você omitir, o workflow usa um texto padrão.

> Se a URL aparecer com `localhost`, troque por `n8n` antes de salvar — `localhost` dentro do container da API aponta para a própria API, não para o n8n.

### 4. Testar end-to-end

Na lista de integrações, clique em **Disparar**. Em **Execuções**, o registro deve sair com status `SUCCESS`, `httpStatusCode` 200 e o `responseBody` contendo o JSON devolvido pelo nó *Respond to Webhook*. No n8n, a aba **Executions** mostra o mesmo disparo do outro lado.

Disparando a integração `n8n whatsapp`, a execução sai igualmente com `SUCCESS` e `httpStatusCode` 200 — o 200 é do n8n —, mas o `responseBody` traz `"statusCode": 201`, que é o status com que o Evolution aceitou a mensagem, e o WhatsApp do número informado recebe o texto.

Para bater no webhook direto do host, sem passar pela plataforma, use `localhost` no lugar de `n8n`:

```bash
curl -X POST http://localhost:5678/webhook/commandix \
  -H 'Content-Type: application/json' \
  -d '{"pedido":42}'
```

E para o workflow de WhatsApp:

```bash
curl -X POST http://localhost:5678/webhook/commandix-whatsapp \
  -H 'Content-Type: application/json' \
  -d '{"number":"5511999999999","text":"Teste direto"}'
```

### Editar o workflow

Editou um workflow na UI e quer versionar a mudança? O `n8n-import` importa **todos** os `.json` do diretório, então basta exportar pelo `id` e salvar no arquivo correspondente:

| Workflow | `id` | Arquivo |
|----------|------|---------|
| Commandix Demo | `al0kKuoHKErreeDP` | `docker/n8n/workflows/commandix.json` |
| Commandix WhatsApp | `29MkQ7cmZw6ZtzY8` | `docker/n8n/workflows/commandix-whatsapp.json` |

```bash
dc exec n8n n8n export:workflow --id=al0kKuoHKErreeDP --output=/tmp/wf.json
docker cp commandix-poc-n8n-1:/tmp/wf.json docker/n8n/workflows/commandix.json
```

O export já sai no formato de lista que o `n8n-import` espera. Para reimportar sem derrubar o resto do ambiente: `dc up -d --force-recreate n8n-import` seguido de `dc up -d --force-recreate n8n`. `dc down -v` também força a reimportação (apaga `n8n_dev_data`), mas é mais drástico: apaga junto o pareamento do WhatsApp (`evolution_dev_data` e `evolution_dev_db_data`), que não se reconstrói sozinho — exige o celular físico de novo e um novo QR code.

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
| `EVOLUTION_PORT` | `8080` | Porta exposta do Evolution API — **só em desenvolvimento** |
| `EVOLUTION_API_KEY` | `dev-evolution-api-key` | Chave global do Evolution, usada no header `apikey`; o mesmo valor vai para o n8n |
| `EVOLUTION_DB_PASSWORD` | `evolution` | Senha do Postgres dedicado do Evolution |
| `EVOLUTION_INSTANCE` | `commandix` | Nome da instância do WhatsApp usada pelo workflow `Commandix WhatsApp` |

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
