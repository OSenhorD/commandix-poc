# Execução do n8n sempre reporta SUCCESS, mesmo quando o WhatsApp não é entregue

**Lado:** backend
**Tipo:** refactor

**Contexto:** percebido em 2026-09-07, na revisão final da entrega do workflow `Commandix WhatsApp` (Evolution API).

**Descrição:** o nó HTTP Request do workflow `Commandix WhatsApp` usa `neverError: true` + `onError: continueRegularOutput`, para que o n8n sempre responda 200 ao Commandix mesmo sem WhatsApp pareado — decisão deliberada da entrega, documentada no `readme.md` § Bônus — n8n. O efeito colateral: a integração no Commandix sempre registra a execução como `SUCCESS` com `httpStatusCode` 200, mesmo quando a mensagem não foi entregue (WhatsApp não pareado, número inválido etc.). O status real do Evolution (`201` sucesso, `4xx/5xx` erro) só aparece dentro do `responseBody`, que o Commandix guarda mas não interpreta.

**Impacto:** Baixo para a PoC — o comportamento é intencional e documentado. Mas qualquer usuário olhando só a coluna de status das Execuções vê "sucesso" mesmo quando nenhuma mensagem chegou, o que pode confundir se esse fluxo virar exemplo de referência para integrações reais.

**Sugestão:** se o Commandix algum dia precisar refletir o resultado real de uma integração `N8N`, seria necessário o backend inspecionar o `responseBody` (campo `statusCode` que o workflow já expõe) em vez de depender só do `httpStatusCode` da chamada ao n8n. Fora de escopo para a PoC atual.
