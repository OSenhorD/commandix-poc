# E02 — Segundo workflow do n8n envia WhatsApp pelo Evolution API

> **Agente — leia só isto + o índice.** Restrições globais, decisões e armadilhas: [`../evolution-api.md`](../evolution-api.md). Não abra a outra entrega.

O workflow demo atual (**Commandix Demo**, eco do payload) **não é alterado**. Esta entrega acrescenta um **segundo** workflow ao lado dele, com webhook próprio, que envia WhatsApp pelo Evolution API. Ao final, o n8n sobe com os dois ativos.

**Arquivos:**
- Criar: `docker/n8n/workflows/commandix-whatsapp.json`
- Modificar: `docker/development/docker-compose.yml` (importação de todos os workflows no `n8n-import`; quatro variáveis no serviço `n8n`)
- Modificar: `.env.example` e `docs/spec/08-docker.md` (variável `EVOLUTION_INSTANCE`)
- Modificar: `readme.md` (§ Bônus — n8n)
- Modificar: `AGENTS.md` (estado atual + tabela de serviços Docker)
- Modificar: `docs/spec/11-checklist.md` (Fase 6)
- **Não tocar:** `docker/n8n/workflows/commandix.json`

**Interfaces:**
- Consome (de E01): hostname `evolution-api:8080`, variáveis `EVOLUTION_API_KEY` / `EVOLUTION_PORT`, instância `commandix` já criada
- Produz: variável `EVOLUTION_INSTANCE` (default `commandix`) e o workflow `Commandix WhatsApp` (id `29MkQ7cmZw6ZtzY8`, webhook `POST /webhook/commandix-whatsapp`) com os nós `Webhook → Preparar mensagem → Evolution API → Respond to Webhook`

---

- [ ] **Passo 1: Fazer o `n8n-import` importar todos os workflows do diretório**

Hoje o serviço importa um caminho fixo. Em [`docker/development/docker-compose.yml`](../../../docker/development/docker-compose.yml), no bloco `command:` do serviço **`n8n-import`**, trocar a linha:

```sh
        n8n import:workflow --input=/workflows/commandix.json
```

por:

```sh
        for f in /workflows/*.json; do
          echo "importando $$f"
          n8n import:workflow --input="$$f"
        done
```

Manter os 8 espaços de indentação do bloco literal (`- |`) e o `$$` — é escape do Compose para `$`. O laço de ativação logo abaixo já é genérico: varre todos os `.json` e reativa os que têm `active: true`; não mexa nele.

- [ ] **Passo 2: Injetar as variáveis do Evolution no serviço `n8n`**

No bloco `environment:` do serviço **`n8n`** (não no `n8n-import`), acrescentar depois de `TZ`:

```yaml
      N8N_BLOCK_ENV_ACCESS_IN_NODE: "false"
      EVOLUTION_API_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY:-dev-evolution-api-key}
      EVOLUTION_INSTANCE: ${EVOLUTION_INSTANCE:-commandix}
```

`N8N_BLOCK_ENV_ACCESS_IN_NODE=false` é obrigatória: sem ela as expressões `{{ $env.* }}` do workflow resolvem vazio e a chamada sai com URL quebrada.

Não adicionar `depends_on` do `n8n` para o `evolution-api` — serviços externos permanecem independentes entre si, como já vale para n8n e API.

- [ ] **Passo 3: Registrar `EVOLUTION_INSTANCE` na documentação de variáveis**

1. Em [`.env.example`](../../../.env.example), no bloco do Evolution, acrescentar a linha:

```bash
# EVOLUTION_INSTANCE=commandix
```

2. Em [`docs/spec/08-docker.md`](../../spec/08-docker.md) §8.2: repetir a mesma linha no bloco `.env.example` reproduzido lá e acrescentar a linha à tabela "Evolution API (extra — desenvolvimento)":

```markdown
| `EVOLUTION_INSTANCE` | `commandix` | Nome da instância do WhatsApp que o workflow `Commandix WhatsApp` usa na URL `/message/sendText/{instância}` |
```

3. Ainda no §8.2, acrescentar ao fim do parágrafo da subseção do Evolution:

```markdown
`EVOLUTION_API_URL` é fixada em `http://evolution-api:8080` no serviço `n8n` (como `N8N_WEBHOOK_URL` é no próprio n8n): é o endereço que o workflow usa dentro da rede do Compose. `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` libera as expressões `{{ $env.* }}` no workflow — sem ela a URL do nó HTTP sai incompleta.
```

- [ ] **Passo 4: Criar o segundo workflow**

Criar `docker/n8n/workflows/commandix-whatsapp.json` com exatamente este conteúdo:

```json
[
  {
    "id": "29MkQ7cmZw6ZtzY8",
    "name": "Commandix WhatsApp",
    "description": null,
    "active": true,
    "isArchived": false,
    "nodes": [
      {
        "id": "4028231f-2b39-49c8-b5f4-bcdfcede1600",
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [0, 0],
        "webhookId": "f4c31a9a-2dbd-477d-95ed-5fb6dd4e8f97",
        "parameters": {
          "httpMethod": "POST",
          "path": "commandix-whatsapp",
          "responseMode": "responseNode",
          "options": {}
        }
      },
      {
        "id": "9f394493-1151-4a03-abd2-ab050c5da08b",
        "name": "Preparar mensagem",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [220, 0],
        "parameters": {
          "jsCode": "const body = $input.first().json.body ?? {};\n\nreturn [{\n  json: {\n    number: String(body.number ?? ''),\n    text: String(body.text ?? body.message ?? 'Disparo de teste do Commandix'),\n    recebidoEm: new Date().toISOString(),\n  },\n}];"
        }
      },
      {
        "id": "479c2194-29dd-4869-9d5d-c0fd19a6e288",
        "name": "Evolution API",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [440, 0],
        "onError": "continueRegularOutput",
        "parameters": {
          "method": "POST",
          "url": "={{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $env.EVOLUTION_INSTANCE }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "apikey",
                "value": "={{ $env.EVOLUTION_API_KEY }}"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ number: $json.number, text: $json.text }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        }
      },
      {
        "id": "fccb993b-8450-4ee0-a766-5fb77a61931b",
        "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [660, 0],
        "parameters": {
          "respondWith": "json",
          "responseBody": "={{ JSON.stringify({ origem: 'commandix', instancia: $env.EVOLUTION_INSTANCE, statusCode: $json.statusCode ?? null, resposta: $json.body ?? $json.error ?? null }) }}",
          "options": {}
        }
      }
    ],
    "connections": {
      "Webhook": {
        "main": [[{ "node": "Preparar mensagem", "type": "main", "index": 0 }]]
      },
      "Preparar mensagem": {
        "main": [[{ "node": "Evolution API", "type": "main", "index": 0 }]]
      },
      "Evolution API": {
        "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
      }
    },
    "settings": {
      "executionOrder": "v1"
    },
    "staticData": null,
    "nodeGroups": [],
    "pinData": null,
    "triggerCount": 1,
    "tags": []
  }
]
```

Por que cada parte é assim:
- `id`, `webhookId`, ids de nó e `path` são **novos e não colidem** com `commandix.json` — é o que permite os dois workflows coexistirem. Não reaproveite valores do outro arquivo.
- `"active": true` — o laço do `n8n-import` reativa lendo este campo (o `import:workflow` sempre desativa).
- `fullResponse: true` — expõe `statusCode` além do `body`, para o Commandix registrar o status que o Evolution devolveu.
- `neverError: true` + `onError: continueRegularOutput` — cobrem, respectivamente, resposta HTTP de erro e falha de rede. É o que garante 200 ao Commandix mesmo sem WhatsApp pareado.
- `number` e `text` saem do `body` do webhook, isto é, do `defaultPayload` da integração.

- [ ] **Passo 5: Reimportar e recriar o n8n**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . up -d --force-recreate n8n-import
docker compose -f docker/development/docker-compose.yml --project-directory . logs n8n-import
```
Esperado nos logs: `importando /workflows/commandix-whatsapp.json`, `importando /workflows/commandix.json` e, depois, `ativando` para os **dois** ids (`29MkQ7cmZw6ZtzY8` e `al0kKuoHKErreeDP`).

O n8n mantém os workflows ativos em memória — recriar o container faz ele recarregar do banco com as variáveis novas:

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . up -d --force-recreate n8n
```

- [ ] **Passo 6: Verificar os dois webhooks pelo host**

Primeiro o workflow **novo**:

```bash
curl -s -X POST http://localhost:5678/webhook/commandix-whatsapp \
  -H 'Content-Type: application/json' \
  -d '{"number":"5511999999999","text":"Teste direto"}'
```

Esperado — **HTTP 200 nos dois casos**, o que prova o tratamento de erro:

| Situação | Corpo da resposta |
|----------|-------------------|
| WhatsApp ainda não pareado | `statusCode` de erro (`400`/`404`) e `resposta` com a mensagem do Evolution sobre a instância não conectada |
| WhatsApp pareado | `statusCode: 201` e `resposta` com a chave da mensagem enviada |

Se vier `statusCode: null` e `resposta` de falha de rede, a URL não resolveu — confira `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` no serviço `n8n` (Passo 2).

Agora a **regressão**: o workflow original tem de continuar respondendo como antes.

```bash
curl -s -X POST http://localhost:5678/webhook/commandix \
  -H 'Content-Type: application/json' \
  -d '{"pedido":42}'
```
Esperado: JSON com `recebidoEm`, `origem: "commandix"` e `payload: {"pedido":42}` — sem qualquer menção a WhatsApp.

- [ ] **Passo 7: Parear o WhatsApp e testar end-to-end pelo Commandix**

1. Se a instância ainda não existir (E01 já criou), crie:

```bash
curl -s -X POST http://localhost:8080/instance/create \
  -H 'apikey: dev-evolution-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"instanceName":"commandix","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

2. Abra http://localhost:8080/manager, entre com a chave `dev-evolution-api-key`, clique na instância `commandix` e leia o QR code no celular (WhatsApp → **Aparelhos conectados** → **Conectar aparelho**). Confirme:

```bash
curl -s http://localhost:8080/instance/connectionState/commandix -H 'apikey: dev-evolution-api-key'
```
Esperado: `"state":"open"`.

3. Em http://localhost:5173 → **Integrações** → **Nova integração** (a integração do workflow demo, se já existir, continua valendo — esta é uma segunda):

| Campo | Valor |
|-------|-------|
| Nome | `n8n whatsapp` |
| Tipo | `N8N` |
| URL de destino | `http://n8n:5678/webhook/commandix-whatsapp` |
| Payload padrão | `{ "number": "5511999999999", "text": "Olá do Commandix" }` (troque pelo seu número, só dígitos, com DDI e DDD) |

4. **Disparar** e conferir em **Execuções**: status `SUCCESS`, `httpStatusCode` 200 (resposta do n8n) e `responseBody` contendo `"statusCode": 201` — o status que o Evolution devolveu. A mensagem chega no WhatsApp.

- [ ] **Passo 8: Atualizar o `readme.md` (§ Bônus — n8n)**

Manter o título `## Bônus — n8n` (é referenciado por texto em `docs/spec/08-docker.md`).

1. Trocar o parágrafo que descreve o workflow (`O workflow demo (Webhook → Code → Respond to Webhook) já sobe pronto e ativo…`) por:

````markdown
São **dois workflows versionados**, ambos importados e ativados pelo `n8n-import` antes do `n8n` iniciar (`depends_on: service_completed_successfully`) — não é preciso montar nada na UI para testar:

| Workflow | Webhook (dentro do Compose) | O que faz |
|----------|------------------------------|-----------|
| **Commandix Demo** | `http://n8n:5678/webhook/commandix` | Eco: devolve em JSON o payload recebido, com carimbo de tempo |
| **Commandix WhatsApp** | `http://n8n:5678/webhook/commandix-whatsapp` | Envia o texto por WhatsApp chamando o [Evolution API](https://github.com/evolution-foundation/evolution-api) |

O segundo fecha o fluxo `Commandix → n8n → Evolution API → WhatsApp`: o `defaultPayload` da integração é o que define destinatário (`number`) e conteúdo (`text`). Os arquivos ficam em [`docker/n8n/workflows/`](./docker/n8n/workflows/).
````

2. Inserir uma seção nova **entre** "### 1. Primeiro acesso" e a de cadastrar a integração (o bloco abaixo usa quatro crases só para conter os blocos `bash` internos — no readme eles voltam a ser três):

````markdown
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
````

3. Renumerar as duas seções seguintes para "### 3. Cadastrar a integração" e "### 4. Testar end-to-end".

4. Em "### 3. Cadastrar a integração", trocar a tabela de campos por duas — uma por workflow:

```markdown
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
```

5. Em "### 4. Testar end-to-end", acrescentar depois do parágrafo existente (que descreve o disparo do eco):

```markdown
Disparando a integração `n8n whatsapp`, a execução sai igualmente com `SUCCESS` e `httpStatusCode` 200 — o 200 é do n8n —, mas o `responseBody` traz `"statusCode": 201`, que é o status com que o Evolution aceitou a mensagem, e o WhatsApp do número informado recebe o texto.
```

6. Logo abaixo do bloco `curl` que bate direto no webhook do eco, acrescentar o equivalente para o novo:

````markdown
E para o workflow de WhatsApp:

```bash
curl -X POST http://localhost:5678/webhook/commandix-whatsapp \
  -H 'Content-Type: application/json' \
  -d '{"number":"5511999999999","text":"Teste direto"}'
```
````

7. Em "### Editar o workflow", trocar o `--id=al0kKuoHKErreeDP` do exemplo por uma tabela de correspondência, acrescentando antes do bloco de comandos:

```markdown
| Workflow | `id` | Arquivo |
|----------|------|---------|
| Commandix Demo | `al0kKuoHKErreeDP` | `docker/n8n/workflows/commandix.json` |
| Commandix WhatsApp | `29MkQ7cmZw6ZtzY8` | `docker/n8n/workflows/commandix-whatsapp.json` |
```

E ajustar o texto ao redor para dizer que o `n8n-import` importa **todos** os `.json` do diretório, então basta exportar pelo `id` e salvar no arquivo correspondente.

8. Na tabela de variáveis de ambiente, depois de `EVOLUTION_DB_PASSWORD`:

```markdown
| `EVOLUTION_INSTANCE` | `commandix` | Nome da instância do WhatsApp usada pelo workflow `Commandix WhatsApp` |
```

- [ ] **Passo 9: Atualizar `AGENTS.md` e o checklist**

1. Em [`AGENTS.md`](../../../AGENTS.md), na tabela "Estado atual", trocar o conteúdo da linha **Bônus n8n** por:

```markdown
| Bônus n8n | **Funcional** — serviço `n8n` no compose de desenvolvimento com **dois** workflows versionados em [`docker/n8n/workflows/`](./docker/n8n/workflows/), importados e ativados pelo `n8n-import` antes do `n8n` subir: `Commandix Demo` (eco) e `Commandix WhatsApp`, que chama o **Evolution API** (extra) e envia WhatsApp de verdade — `Commandix → n8n → Evolution API → WhatsApp`. Fluxo end-to-end no [`readme.md`](./readme.md) § Bônus — n8n |
```

2. Na tabela de serviços Docker do mesmo arquivo, ajustar a linha `n8n-import` para refletir que ela importa o diretório inteiro (`for f in /workflows/*.json`), e acrescentar depois dela:

```markdown
| evolution-api | `evoapicloud/evolution-api:v2.3.7`, **só em desenvolvimento**; API REST de WhatsApp consumida pelo **workflow do n8n**, não pelo backend; auth por header `apikey` (`AUTHENTICATION_API_KEY`); sem Redis (`CACHE_LOCAL_ENABLED=true`); UI de pareamento em `/manager`; sessões no volume `evolution_dev_data` |
| evolution-database | `postgres:16-alpine` dedicado ao Evolution, volume `evolution_dev_db_data`, sem porta publicada — serviço externo não compartilha o Postgres da aplicação |
```

3. Em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md), Fase 6, acrescentar depois da linha `- [x] (Bônus) n8n workflow`:

```markdown
- [x] (Extra) Evolution API — segundo workflow do n8n enviando WhatsApp real
```

- [ ] **Passo 10: Commit**

```bash
git add docker/n8n/workflows/commandix-whatsapp.json docker/development/docker-compose.yml .env.example docs/spec/08-docker.md docs/spec/11-checklist.md readme.md AGENTS.md
git commit -m "$(cat <<'EOF'
feat: Segundo workflow do n8n envia WhatsApp pelo Evolution API

Acrescenta o workflow Commandix WhatsApp ao lado do demo de eco, fechando
o fluxo Commandix -> n8n -> Evolution API -> WhatsApp. O n8n-import passa a
importar todos os JSON do diretório. O nó HTTP usa neverError para que a
execução registre o erro do Evolution em vez de falhar sem celular pareado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

**Critério de done E02:**

- [ ] `docker/n8n/workflows/commandix.json` **inalterado** (confirme com `git diff --stat`); o webhook `/webhook/commandix` continua devolvendo o eco de antes
- [ ] Os dois workflows aparecem ativos na UI do n8n depois de um `up` limpo, importados pelo laço sobre `/workflows/*.json`
- [ ] `POST http://localhost:5678/webhook/commandix-whatsapp` responde **200** com e sem WhatsApp pareado, trazendo `statusCode` e `resposta` do Evolution no corpo
- [ ] Com celular pareado, disparar a integração `n8n whatsapp` entrega a mensagem no WhatsApp e registra execução `SUCCESS` com `"statusCode": 201` no `responseBody`
- [ ] `readme.md` (§ Bônus — n8n), `AGENTS.md`, `docs/spec/08-docker.md`, `docs/spec/11-checklist.md` e `.env.example` atualizados
- [ ] Nenhum arquivo de `nexus-backend/src/`, `nexus-frontend/src/` ou do compose de produção alterado
- [ ] **Apagar este arquivo**; como era a última entrega, apagar também [`docs/plans/evolution-api.md`](../evolution-api.md) e o diretório `docs/plans/evolution-api/`
