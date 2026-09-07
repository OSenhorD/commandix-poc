# E01 — Evolution API no Compose de desenvolvimento

> **Agente — leia só isto + o índice.** Restrições globais, decisões e armadilhas: [`../evolution-api.md`](../evolution-api.md). Não abra a outra entrega.

**Arquivos:**
- Modificar: `docker/development/docker-compose.yml` (dois serviços novos + dois volumes)
- Modificar: `.env.example`
- Modificar: `docs/spec/08-docker.md` (§8.1 tabela de serviços, §8.2 `.env.example` e variáveis, §8.4 startup, §8.7 volumes)
- Modificar: `readme.md` (tabela de serviços e tabela de variáveis de ambiente)

**Interfaces:**
- Consome: rede `commandix-dev` e o padrão de healthcheck já usado pelo serviço `n8n`
- Produz (E02 depende disto):
  - hostname interno `evolution-api` na porta `8080` (a partir do host: `http://localhost:${EVOLUTION_PORT:-8080}`)
  - variáveis `EVOLUTION_PORT` (default `8080`), `EVOLUTION_API_KEY` (default `dev-evolution-api-key`), `EVOLUTION_DB_PASSWORD` (default `evolution`)
  - volumes `evolution_dev_data` (sessões do WhatsApp) e `evolution_dev_db_data` (banco)
  - instância `commandix` criada no Evolution (Passo 5)

---

- [ ] **Passo 1: Adicionar os dois serviços ao Compose de desenvolvimento**

Em [`docker/development/docker-compose.yml`](../../../docker/development/docker-compose.yml), inserir **depois** do bloco do serviço `n8n` e **antes** da chave `networks:` no fim do arquivo:

```yaml
  evolution-database:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: evolution
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: ${EVOLUTION_DB_PASSWORD:-evolution}
    volumes:
      - evolution_dev_db_data:/var/lib/postgresql/data
    networks:
      - commandix-dev
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"',
        ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  evolution-api:
    image: evoapicloud/evolution-api:v2.3.7
    restart: unless-stopped
    ports:
      - "${EVOLUTION_PORT:-8080}:8080"
    volumes:
      - evolution_dev_data:/evolution/instances
    environment:
      SERVER_PORT: 8080
      SERVER_URL: http://evolution-api:8080
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY:-dev-evolution-api-key}
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://evolution:${EVOLUTION_DB_PASSWORD:-evolution}@evolution-database:5432/evolution?schema=public
      DATABASE_CONNECTION_CLIENT_NAME: evolution_commandix
      CACHE_REDIS_ENABLED: "false"
      CACHE_LOCAL_ENABLED: "true"
      TELEMETRY_ENABLED: "false"
      LOG_LEVEL: ERROR,WARN,INFO
      LOG_BAILEYS: error
      DEL_INSTANCE: "false"
      CONFIG_SESSION_PHONE_CLIENT: Commandix
      CONFIG_SESSION_PHONE_NAME: Chrome
      TZ: ${TZ:-America/Sao_Paulo}
    depends_on:
      evolution-database:
        condition: service_healthy
    networks:
      - commandix-dev
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:8080/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))",
        ]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 40s
```

Notas sobre escolhas que **não** devem ser "corrigidas":
- `$$POSTGRES_USER` com cifrão duplo é escape do Compose (mesma forma usada no serviço `database`) — não trocar por `$`.
- `SERVER_URL` aponta para o hostname interno porque é o endereço que o n8n usa; a UI em `/manager` funciona pelo browser mesmo assim.
- `start_period: 40s` cobre as migrations que o entrypoint da imagem roda no primeiro boot.
- O healthcheck usa `node -e` porque a imagem é `node:24-alpine` — mesmo padrão do serviço `n8n`.

- [ ] **Passo 2: Declarar os volumes**

No fim do mesmo arquivo, na chave `volumes:`, acrescentar as duas últimas linhas:

```yaml
volumes:
  database_dev_data:
  api_dev_node_modules:
  frontend_dev_node_modules:
  n8n_dev_data:
  evolution_dev_data:
  evolution_dev_db_data:
```

- [ ] **Passo 3: Acrescentar as variáveis ao `.env.example`**

No fim de [`.env.example`](../../../.env.example), depois do bloco do n8n:

```bash
# Evolution API — extra do bônus; só no compose de desenvolvimento
# EVOLUTION_PORT=8080
# EVOLUTION_API_KEY=dev-evolution-api-key
# EVOLUTION_DB_PASSWORD=evolution
```

- [ ] **Passo 4: Subir e esperar ficar saudável**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . up -d evolution-api
docker compose -f docker/development/docker-compose.yml --project-directory . ps evolution-api
```

Esperado: `STATUS` com `(healthy)`. O primeiro boot leva ~40-60s (migrations + Baileys). Se ficar `unhealthy`, ver o motivo antes de mexer no compose:

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . logs --tail=50 evolution-api
```

- [ ] **Passo 5: Verificar a API pelo host**

```bash
curl -s http://localhost:8080/ | head -c 200
```
Esperado: JSON de boas-vindas com `"status":200` e a versão.

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST http://localhost:8080/instance/create \
  -H 'apikey: dev-evolution-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"instanceName":"commandix","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```
Esperado: `201`. Confirma banco gravando e autenticação por `apikey` funcionando. **Deixe essa instância existindo** — é a que E02 usa.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/instance/create \
  -H 'Content-Type: application/json' -d '{"instanceName":"x"}'
```
Esperado: `401` — sem `apikey` a API recusa.

- [ ] **Passo 6: Documentar em `docs/spec/08-docker.md`**

1. Na tabela de serviços do §8.1, depois da linha `n8n`:

```markdown
| evolution-database | — (sem porta publicada) | `postgres:16-alpine`, **dev apenas** |
| evolution-api | 8080 (**dev apenas**) | `evoapicloud/evolution-api:v2.3.7` |
```

2. No parágrafo logo abaixo dessa tabela (o que explica o `n8n`), acrescentar ao fim:

```markdown
`evolution-api` é o extra do bônus: uma API REST de WhatsApp que o **workflow do n8n** consome — a plataforma não fala com ela diretamente. Tem banco próprio (`evolution-database`), pelo mesmo motivo do n8n usar SQLite próprio: serviço externo não compartilha o Postgres da aplicação. Ver [readme](../../readme.md) § Bônus — n8n.
```

3. No bloco `.env.example` reproduzido no §8.2, repetir exatamente as quatro linhas do Passo 3 (o bloco do arquivo e o da spec têm de ficar idênticos).

4. Ainda no §8.2, depois da subseção "n8n (bônus — desenvolvimento)" e dos parágrafos dela, acrescentar:

```markdown
### Evolution API (extra — desenvolvimento)

| Variável | Default | Uso |
|----------|---------|-----|
| `EVOLUTION_PORT` | `8080` | Porta publicada do `evolution-api` (host). Interpolada só no `ports:` — dentro da rede o serviço sempre atende em `8080` |
| `EVOLUTION_API_KEY` | `dev-evolution-api-key` | Chave global do Evolution (`AUTHENTICATION_API_KEY`), enviada no header `apikey`. Fallback fraco é aceitável **porque o serviço só existe em desenvolvimento**; o mesmo valor é injetado no `n8n` para o workflow autenticar |
| `EVOLUTION_DB_PASSWORD` | `evolution` | Senha do Postgres dedicado do Evolution (`evolution-database`), que não publica porta no host |

`CACHE_REDIS_ENABLED=false` + `CACHE_LOCAL_ENABLED=true` dispensam o Redis, opcional na v2. `TELEMETRY_ENABLED=false` segue a mesma decisão de `N8N_DIAGNOSTICS_ENABLED`. As sessões do WhatsApp ficam no volume `evolution_dev_data` — apagá-lo desfaz o pareamento e exige ler o QR code de novo.
```

5. No §8.4 (Startup), acrescentar após o item 5:

```markdown
6. **evolution-database** e **evolution-api** (dev) — a API espera o banco ficar *healthy* e roda as migrations no entrypoint; healthcheck `GET /`, `start_period` de 40s. Independentes da plataforma: nem a API nem o n8n esperam por eles
```

6. No §8.7 (tabela de arquivos), na linha "Volumes (dev)", acrescentar ao fim da lista: `evolution_dev_data`, `evolution_dev_db_data`.

- [ ] **Passo 7: Documentar em `readme.md`**

1. Na tabela de serviços (a que tem API, Health, Docs, n8n), acrescentar depois da linha do n8n:

```markdown
| Evolution API | http://localhost:8080 | Extra do bônus; só no compose de **desenvolvimento**. UI de pareamento em `/manager` (login com a `apikey`) |
```

2. Na tabela de variáveis de ambiente, depois de `N8N_ENCRYPTION_KEY`:

```markdown
| `EVOLUTION_PORT` | `8080` | Porta exposta do Evolution API — **só em desenvolvimento** |
| `EVOLUTION_API_KEY` | `dev-evolution-api-key` | Chave global do Evolution, usada no header `apikey`; o mesmo valor vai para o n8n |
| `EVOLUTION_DB_PASSWORD` | `evolution` | Senha do Postgres dedicado do Evolution |
```

- [ ] **Passo 8: Commit**

```bash
git add docker/development/docker-compose.yml .env.example docs/spec/08-docker.md readme.md
git commit -m "$(cat <<'EOF'
feat: Evolution API no compose de desenvolvimento

Sobe evolution-api (WhatsApp) e seu Postgres dedicado como serviços
externos do compose de desenvolvimento, para o workflow do n8n consumir.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

**Critério de done E01:**

- [ ] `evolution-api` sobe *healthy* pelo Compose de desenvolvimento; `docker/production/docker-compose.yml` intocado
- [ ] `POST /instance/create` responde `201` com a `apikey` e `401` sem ela
- [ ] Banco dedicado (`evolution-database`) com volume próprio; nenhum script de initdb no `database` do projeto
- [ ] `.env.example` e o bloco espelhado no §8.2 da spec com as três variáveis novas, idênticos
- [ ] `docs/spec/08-docker.md` e `readme.md` atualizados (serviços, variáveis, startup, volumes)
- [ ] **Apagar este arquivo** e tirar a linha E01 da tabela de entregas em [`docs/plans/evolution-api.md`](../evolution-api.md)
