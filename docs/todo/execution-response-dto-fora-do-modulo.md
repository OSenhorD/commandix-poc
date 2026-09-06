# `ExecutionResponseDto` / `toExecutionResponse` vivem em `integrations/`, não em `executions/`

**Contexto:** `nexus-backend/src/integrations/dto/execution-response.dto.ts` e `toExecutionResponse` em `nexus-backend/src/integrations/integrations.mapper.ts` (criados na E15, para a resposta de `POST /integrations/:id/trigger`).

**Descrição:** a E16 criou o módulo `executions/` (controller, service, mapper e DTOs próprios) só para a listagem-resumo. O DTO de execução **completo** (`id`, `integrationId`, `status`, `httpStatusCode`, `responseTimeMs`, `requestPayload`, `responseBody`, `executedAt`) e o mapper que o produz continuam em `integrations/`, porque é isso que o `trigger` retorna hoje.

A E17 (`GET /executions/:id`) vai precisar exatamente desse mesmo formato de resposta — hoje ele está acoplado ao módulo errado (`integrations/` importando conceito de `executions/`, e `executions/` sem a forma "detalhe" que lhe pertence).

**Impacto:** médio — ao implementar a E17, ou se duplica o DTO/mapper dentro de `executions/`, ou se cria uma dependência cruzada `executions/ → integrations/` só para reaproveitar a resposta de execução, o que não é o sentido natural (execução não depende de integração como conceito de resposta).

**Sugestão:** ao iniciar a E17, mover `ExecutionResponseDto` e `toExecutionResponse` (renomeando o record se fizer sentido) de `integrations/` para `executions/`, e fazer `IntegrationsService.trigger()` importar de lá. Ajustar `integrations.module.ts`/`executions.module.ts` conforme necessário.
