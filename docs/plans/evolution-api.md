# Plano de Implementação — Evolution API (extra do bônus n8n)

> **Para agentes:** usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar entrega por entrega. Os passos usam checkbox (`- [ ]`).
>
> **Leitura (obrigatório, para não gastar tokens):** este índice + **somente** o arquivo da entrega atual em [`evolution-api/`](./evolution-api/). Não abra a outra entrega.

**Objetivo:** subir o [Evolution API](https://github.com/evolution-foundation/evolution-api) (API REST de WhatsApp) como serviço do Compose de desenvolvimento e fazer o workflow demo do n8n enviar uma mensagem real de WhatsApp por ele — fechando o fluxo `Commandix → n8n → Evolution API → WhatsApp`.

**Spec:** este índice (design acordado em 2026-09-07, seções *Arquitetura* e *Decisões* abaixo) + [`docs/spec/08-docker.md`](../spec/08-docker.md) e [`readme.md`](../../readme.md) § Bônus — n8n, que são os documentos alterados pelas entregas.

## Arquitetura

O Evolution API **não** é uma integração do backend Commandix: é um serviço externo que o **n8n** consome. O backend continua disparando a integração de tipo `N8N` exatamente como hoje — quem chama o Evolution é o nó HTTP Request do workflow.

```
Commandix (integração N8N)  →  n8n (webhook)  →  Evolution API  →  WhatsApp
      POST /integrations/:id/trigger      POST /message/sendText/:instancia
```

O n8n passa a ter **dois workflows versionados e ativos**, cada um com seu webhook:

| Workflow | Arquivo | Webhook | O que faz |
|----------|---------|---------|-----------|
| `Commandix Demo` | `commandix.json` (**intocado**) | `/webhook/commandix` | Eco do payload — o bônus como está hoje |
| `Commandix WhatsApp` | `commandix-whatsapp.json` (novo) | `/webhook/commandix-whatsapp` | Envia a mensagem pelo Evolution API |

Dois serviços novos, ambos **só no Compose de desenvolvimento**:

| Serviço | Imagem | Papel |
|---------|--------|-------|
| `evolution-api` | `evoapicloud/evolution-api:v2.3.7` | API REST de WhatsApp; UI de pareamento embutida em `/manager` |
| `evolution-database` | `postgres:16-alpine` | Banco **dedicado** do Evolution, com volume próprio |

## Decisões

| Tópico | Decisão |
|--------|---------|
| Banco do Evolution | Container Postgres **dedicado**, não o `database` do projeto. Segue o precedente do n8n ([`AGENTS.md`](../../AGENTS.md), tabela de serviços Docker: *"SQLite no volume `n8n_dev_data`, não usa o Postgres do projeto"*). Reusar o `database` exigiria script de initdb, que só roda em volume vazio — quem já tem o volume criado precisaria de `dc down -v`, apagando o banco do Commandix |
| Redis | **Não sobe.** É opcional na v2: `CACHE_REDIS_ENABLED=false` + `CACHE_LOCAL_ENABLED=true` |
| Versão da imagem | `v2.3.7` — última **estável** publicada. A 2.4.0 só existe como release candidate (`2.4.0-rc1`/`rc2`), e `latest` aponta para RC |
| Enum `IntegrationType` | **Inalterado** (`WEBHOOK` \| `REST_API` \| `N8N`). A integração usada na demo é do tipo `N8N`; [`docs/spec/04-modelo-dados.md`](../spec/04-modelo-dados.md) fixa esses três valores e é requisito do desafio |
| Autenticação | Chave global `AUTHENTICATION_API_KEY`, enviada pelo n8n no header `apikey`. Fallback fraco em dev (`dev-evolution-api-key`), mesmo padrão de `N8N_ENCRYPTION_KEY` |
| Falha sem WhatsApp pareado | O nó HTTP Request usa `neverError` + `onError: continueRegularOutput`: sem celular pareado o n8n **ainda responde 200** ao Commandix, com o erro do Evolution no corpo. A execução aparece no histórico como `SUCCESS` com o motivo legível, em vez de virar `FAILURE` mudo |
| Conteúdo da mensagem | Vem do `defaultPayload` da integração (`{ "number": "...", "text": "..." }`), não de variável de ambiente — é o que torna o disparo parametrizável pela plataforma |
| Workflow novo, não alterado | O demo de eco (`Commandix Demo`) continua existindo e funcionando; o WhatsApp entra como **segundo** workflow, com `id`, `path` e `webhookId` próprios. Preserva o bônus já entregue e deixa comparar os dois caminhos lado a lado |
| Importação dos workflows | `n8n-import` passa a varrer `/workflows/*.json` em vez de apontar para um arquivo fixo — é o que faz o segundo workflow subir junto |

---

## Entregas

| # | Brief | Como se prova |
|---|-------|----------------|
| E02 | [Segundo workflow n8n → Evolution](./evolution-api/e02-workflow-n8n.md) | Os dois workflows sobem ativos; `/webhook/commandix` segue devolvendo o eco e `/webhook/commandix-whatsapp` entrega a mensagem no WhatsApp |

### Ordem de execução

E01 → E02. E02 depende do serviço no ar (E01) para ser verificada de ponta a ponta.

---

## Restrições globais

Valem para **todas** as entregas:

1. **Só desenvolvimento.** Nada entra em [`docker/production/docker-compose.yml`](../../docker/production/docker-compose.yml). O Evolution é serviço externo de demonstração, como o n8n.
2. **Não tocar em backend nem frontend.** Nenhum arquivo em `nexus-backend/src/`, `nexus-frontend/src/` ou migration. Se parecer necessário, o plano está errado — pare e reporte.
3. **Não alterar a spec do desafio:** [`docs/spec/04-modelo-dados.md`](../spec/04-modelo-dados.md), [`docs/spec/05-api.md`](../spec/05-api.md) e [`docs/spec/09-bonus-n8n.md`](../spec/09-bonus-n8n.md) ficam como estão. [`docs/spec/08-docker.md`](../spec/08-docker.md) documenta a infra do projeto e **deve** ser atualizado.
4. **Versões sempre pinadas** — regra do projeto ([`AGENTS.md`](../../AGENTS.md) § Decisões adotadas). Nunca `latest`.
5. **Comandos do Compose** (o alias `dc` do readme não existe em shell não-interativo — use a forma completa):
   ```bash
   docker compose -f docker/development/docker-compose.yml --project-directory . <comando>
   ```
6. **Documentação em português**, seguindo o tom dos arquivos existentes: tabelas curtas, sem adjetivo de marketing.
7. **Nunca rodar `down -v`** durante a execução deste plano: apaga o banco do Commandix e os workflows do n8n. Para reiniciar só o Evolution, use `down` sem `-v` ou `restart <serviço>`.

## Armadilhas conhecidas

- **Primeiro boot é lento.** A imagem roda as migrations do banco no start e carrega o Baileys; o healthcheck só fica verde depois de ~40s. `start_period` está calibrado para isso — não reduza ao ver "unhealthy" nos primeiros segundos.
- **`$env` no workflow exige liberação.** Expressões `{{ $env.X }}` só resolvem com `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` no serviço `n8n`. Sem isso a expressão volta vazia e a URL da chamada sai quebrada.
- **O `id` do workflow é a chave do upsert.** `n8n import:workflow` atualiza pelo `id` do JSON. O workflow novo precisa de `id`, `path` de webhook, `webhookId` e ids de nó **próprios** — reaproveitar qualquer um de [`commandix.json`](../../docker/n8n/workflows/commandix.json) sobrescreve o workflow existente em vez de criar o segundo. Os valores prontos estão no brief E02.
- **O `n8n-import` importa um caminho fixo.** Enquanto o comando apontar para `/workflows/commandix.json`, o segundo arquivo nunca é importado — por isso E02 troca a linha por um laço sobre `/workflows/*.json`.
- **`import:workflow` desativa o workflow.** O serviço `n8n-import` já reativa com `publish:workflow` (o loop lê `active: true` do JSON). Mantenha `"active": true` no arquivo.
- **`localhost` não vale dentro da rede do Compose.** Entre containers use os hostnames `evolution-api`, `n8n`, `api`. `localhost` só do host (curl, browser).
- **O número do WhatsApp vai com DDI e DDD, só dígitos** — ex.: `5511999999999`. Sem `+`, espaço ou traço.
