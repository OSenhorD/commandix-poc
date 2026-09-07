# Workflow n8n não é versionado nem importado automaticamente

**Lado:** backend
**Tipo:** feature

**Contexto:** percebido em 2026-09-07, na entrega do serviço `n8n` no compose de desenvolvimento ([`docker/development/docker-compose.yml`](../../../docker/development/docker-compose.yml)). O escopo acordado foi serviço + documentação de uso; o workflow em si ficou de fora.

**Descrição:** [`docs/spec/09-bonus-n8n.md`](../../spec/09-bonus-n8n.md) pede um workflow que receba o webhook da API, transforme o payload e devolva JSON. Hoje o serviço sobe e o passo a passo está em [`readme.md`](../../../readme.md) § Bônus — n8n, mas quem for avaliar precisa montar os três nós (Webhook → Code → Respond to Webhook) à mão na UI. Não há JSON do workflow no repositório nem import automático na subida.

**Impacto:** Baixo/médio. O fluxo funciona e está documentado, mas o bônus depende de trabalho manual do avaliador e o workflow não tem histórico em git — qualquer ajuste se perde ao recriar o volume `n8n_dev_data` (`dc down -v`).

**Sugestão:** Versionar o workflow como `docker/n8n/workflows/commandix.json` e montá-lo em `/home/node/.n8n/workflows` (ou importar no start com `n8n import:workflow --separate --input=...` via serviço `n8n-import` de ciclo único, com `depends_on: service_completed_successfully`). Ao entregar, marcar `- [ ] (Bônus) n8n workflow` em [`11-checklist.md`](../../spec/11-checklist.md) §, ajustar o § Bônus — n8n do readme e apagar este arquivo.
