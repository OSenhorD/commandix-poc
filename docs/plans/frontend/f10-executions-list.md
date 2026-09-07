# F10 — Histórico: listagem de execuções com filtros

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

**Arquivos:**
- Criar: `src/features/executions/api.ts`, `src/features/executions/hooks.ts`, `src/features/executions/components/execution-status-badge.tsx`, `src/features/executions/components/execution-filters.tsx`
- Modificar: `src/features/executions/pages/list.tsx`

**Interfaces:**
- Consome: `apiFetch`, `buildQuery`, `useListParams`, `DataTable`, `PaginationBar`, `EmptyState`, `ErrorState`, `formatDateTime`, `formatDuration`, `useIntegration` (F07)
- Produz:
  - `listExecutions(integrationId, params)`, `getExecution(id)`
  - `ListExecutionsParams = { page; limit; status?; from?; to? }`
  - `executionKeys`, `useExecutions(integrationId, params)`, `useExecution(id)`
  - `<ExecutionStatusBadge status />`

> **Datas:** os campos usam `<input type="date">`, que produz `YYYY-MM-DD` — exatamente o atalho date-only que a API aceita (`from` = início do dia UTC, `to` = fim do dia UTC, ambos **inclusive**). `from > to` devolve `400`; a UI barra antes de chamar.
>
> **Chaves:** `executionKeys.list` começa com `["executions", integrationId, …]`, então a invalidação `["executions", id]` feita pelo disparo (F09) casa por prefixo.

- [ ] **Passo 1: Criar `src/features/executions/api.ts`**

```typescript
import { apiFetch } from "@/shared/api/client";
import { buildQuery } from "@/shared/lib/query-string";
import type { Execution, ExecutionListItem, ExecutionStatus, Paginated } from "@/shared/types/api";

export interface ListExecutionsParams {
  page: number;
  limit: number;
  status?: ExecutionStatus;
  /** ISO 8601 ou YYYY-MM-DD (dia inteiro em UTC). Inclusive. */
  from?: string;
  to?: string;
}

export function listExecutions(
  integrationId: string,
  params: ListExecutionsParams,
): Promise<Paginated<ExecutionListItem>> {
  return apiFetch<Paginated<ExecutionListItem>>(`/integrations/${integrationId}/executions${buildQuery({ ...params })}`);
}

export function getExecution(id: string): Promise<Execution> {
  return apiFetch<Execution>(`/executions/${id}`);
}
```

- [ ] **Passo 2: Criar `src/features/executions/hooks.ts`**

```typescript
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getExecution, listExecutions, type ListExecutionsParams } from "./api";

export const executionKeys = {
  all: ["executions"] as const,
  list: (integrationId: string, params: ListExecutionsParams) => ["executions", integrationId, params] as const,
  detail: (id: string) => ["execution", id] as const,
};

export function useExecutions(integrationId: string, params: ListExecutionsParams, enabled = true) {
  return useQuery({
    queryKey: executionKeys.list(integrationId, params),
    queryFn: () => listExecutions(integrationId, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useExecution(id: string | undefined) {
  return useQuery({
    queryKey: executionKeys.detail(id ?? ""),
    queryFn: () => getExecution(id ?? ""),
    enabled: Boolean(id),
  });
}
```

- [ ] **Passo 3: Criar `src/features/executions/components/execution-status-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { ExecutionStatus } from "@/shared/types/api";

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  return <Badge variant={status === "SUCCESS" ? "default" : "destructive"}>{status === "SUCCESS" ? "Sucesso" : "Falha"}</Badge>;
}
```

- [ ] **Passo 4: Criar `src/features/executions/components/execution-filters.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_ALL = "all";

interface ExecutionFiltersProps {
  status: string;
  from: string;
  to: string;
  rangeError: string | null;
  onChange: (key: "status" | "from" | "to", value: string | null) => void;
  onClear: () => void;
}

export function ExecutionFilters({ status, from, to, rangeError, onChange, onClear }: ExecutionFiltersProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-44">
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <Select
            value={status}
            onValueChange={(value) => {
              onChange("status", value === STATUS_ALL ? null : value);
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>Todos</SelectItem>
              <SelectItem value="SUCCESS">Sucesso</SelectItem>
              <SelectItem value="FAILURE">Falha</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-44">
          <FieldLabel htmlFor="from">De</FieldLabel>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(event) => {
              onChange("from", event.target.value);
            }}
          />
        </Field>

        <Field className="w-44">
          <FieldLabel htmlFor="to">Até</FieldLabel>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(event) => {
              onChange("to", event.target.value);
            }}
          />
        </Field>

        <Button type="button" variant="ghost" onClick={onClear}>
          Limpar
        </Button>
      </div>

      {rangeError ? (
        <p role="alert" className="text-sm text-destructive">
          {rangeError}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Passo 5: Escrever `src/features/executions/pages/list.tsx`**

```tsx
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useIntegration } from "@/features/integrations/hooks";
import { DataTable, type Column } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { PaginationBar } from "@/shared/components/pagination-bar";
import { useListParams } from "@/shared/hooks/use-list-params";
import { formatDateTime, formatDuration } from "@/shared/lib/format";
import type { ExecutionListItem, ExecutionStatus } from "@/shared/types/api";

import { ExecutionFilters } from "../components/execution-filters";
import { ExecutionStatusBadge } from "../components/execution-status-badge";
import { useExecutions } from "../hooks";

export function ExecutionsListPage() {
  const { id: integrationId = "" } = useParams<{ id: string }>();
  const { searchParams, page, limit, setParam, setPage } = useListParams();

  const statusParam = searchParams.get("status") ?? "all";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  // A API devolve 400 para from > to — a UI barra antes de chamar.
  const rangeError = from !== "" && to !== "" && from > to ? "A data inicial não pode ser maior que a final." : null;

  const integration = useIntegration(integrationId);
  const executions = useExecutions(
    integrationId,
    {
      page,
      limit,
      status: statusParam === "all" ? undefined : (statusParam as ExecutionStatus),
      from: from === "" ? undefined : from,
      to: to === "" ? undefined : to,
    },
    rangeError === null,
  );

  const columns: Column<ExecutionListItem>[] = [
    { key: "executedAt", header: "Executada em", cell: (row) => formatDateTime(row.executedAt) },
    { key: "status", header: "Status", cell: (row) => <ExecutionStatusBadge status={row.status} /> },
    {
      key: "httpStatusCode",
      header: "HTTP",
      cell: (row) => (row.httpStatusCode === null ? "—" : String(row.httpStatusCode)),
    },
    { key: "responseTimeMs", header: "Duração", cell: (row) => formatDuration(row.responseTimeMs) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Button variant="ghost" size="sm" render={<Link to={`/executions/${row.id}`} />}>
          Detalhe
        </Button>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Button variant="ghost" size="sm" className="w-fit" render={<Link to="/integrations" />}>
          <ArrowLeft className="size-4" />
          Integrações
        </Button>
        <h1 className="text-xl font-semibold">Histórico · {integration.data?.name ?? "…"}</h1>
        <p className="text-sm text-muted-foreground">Execuções mais recentes primeiro</p>
      </header>

      <ExecutionFilters
        status={statusParam}
        from={from}
        to={to}
        rangeError={rangeError}
        onChange={setParam}
        onClear={() => {
          setParam("status", null);
          setParam("from", null);
          setParam("to", null);
        }}
      />

      {executions.isError ? (
        <ErrorState
          error={executions.error}
          onRetry={() => {
            void executions.refetch();
          }}
        />
      ) : !executions.isPending && executions.data?.data.length === 0 ? (
        <EmptyState
          title="Nenhuma execução encontrada"
          description="Dispare a integração ou ajuste os filtros de status e data."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={executions.data?.data ?? []}
            rowKey={(row) => row.id}
            isLoading={executions.isPending && rangeError === null}
          />
          {executions.data ? <PaginationBar meta={executions.data.meta} onPageChange={setPage} /> : null}
        </>
      )}
    </section>
  );
}
```

- [ ] **Passo 6: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Abrir "Histórico" de uma integração com disparos | Lista ordenada do mais recente para o mais antigo |
| Filtrar por "Falha" | URL vira `?status=FAILURE` e a lista reduz |
| `De` = hoje, `Até` = ontem | Mensagem de erro, **sem** requisição (aba Network) |
| Filtrar por um dia com execuções | Retorna o dia inteiro (UTC) |
| Disparar em outra aba e voltar | Após novo disparo, a lista reflete a execução nova (invalidação de F09) |
| VIEWER | Vê o histórico normalmente |

- [ ] **Passo 7: Lint, typecheck e testes**

**Critério de done F10:**

- [ ] Listagem paginada por integração, `executedAt DESC`
- [ ] Filtros `status`, `from` e `to` refletidos na URL e preservados no reload
- [ ] `from > to` bloqueado no cliente com mensagem
- [ ] Estados de carregando, vazio e erro funcionando
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F10** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md)

---

