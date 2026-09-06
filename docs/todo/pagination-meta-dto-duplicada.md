# `PaginationMetaDto` duplicada entre módulos

**Contexto:** `nexus-backend/src/integrations/dto/paginated-integrations-response.dto.ts` e `nexus-backend/src/executions/dto/paginated-executions-response.dto.ts` (E12 e E16).

**Descrição:** a classe `PaginationMetaDto` (`page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`, todas com `@ApiProperty`) está definida de forma idêntica nos dois arquivos. Qualquer listagem futura (ex.: se `GET /executions/:id` ganhar variantes paginadas) tende a repetir a mesma classe outra vez.

**Impacto:** baixo por enquanto (2 ocorrências), mas é exatamente o padrão de "três linhas parecidas" que a spec [05-api §5.0](../spec/05-api.md#50-paginação-listagens) já define como envelope único — faz sentido ter um único DTO Swagger para ele.

**Sugestão:** extrair para `src/common/dto/pagination-meta.dto.ts` quando uma terceira listagem paginada aparecer (ou antes, se for barato). Não fazer agora isoladamente para não introduzir abstração antes do padrão se confirmar (ver `AGENTS.md` § O que NÃO fazer — "Não criar abstrações prematuras").
