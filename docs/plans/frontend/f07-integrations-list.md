# F07 — Integrações: listagem com filtro e paginação

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

**Arquivos:**
- Criar: `src/features/integrations/api.ts`, `src/features/integrations/hooks.ts`, `src/features/integrations/components/integration-type-badge.tsx`
- Modificar: `src/features/integrations/pages/list.tsx`

**Interfaces:**
- Consome: `apiFetch` (F02), `useListParams`, `DataTable`, `PaginationBar`, `EmptyState`, `ErrorState`, `formatDateTime`, `buildQuery` (F06), `RoleGate` (F03)
- Produz:
  - `listIntegrations`, `getIntegration`, `createIntegration`, `updateIntegration`, `deleteIntegration`, `triggerIntegration`
  - Tipos `ListIntegrationsParams`, `CreateIntegrationInput`, `UpdateIntegrationInput`
  - `integrationKeys` (chaves do TanStack Query) e os hooks `useIntegrations(params)` e `useIntegration(id)`

- [ ] **Passo 1: Criar `src/features/integrations/api.ts`**

```typescript
import { apiFetch } from "@/shared/api/client";
import { buildQuery } from "@/shared/lib/query-string";
import type { Execution, Integration, IntegrationListItem, IntegrationType, Paginated } from "@/shared/types/api";

export interface ListIntegrationsParams {
  page: number;
  limit: number;
  isActive?: boolean;
}

export interface CreateIntegrationInput {
  name: string;
  type: IntegrationType;
  targetUrl: string;
  authKey?: string;
  customHeaders?: Record<string, string>;
  defaultPayload?: Record<string, unknown>;
  isActive?: boolean;
}

/** PATCH parcial: todo campo é opcional e só o enviado muda (05-api §5.3). */
export type UpdateIntegrationInput = Partial<CreateIntegrationInput>;

export function listIntegrations(params: ListIntegrationsParams): Promise<Paginated<IntegrationListItem>> {
  return apiFetch<Paginated<IntegrationListItem>>(`/integrations${buildQuery({ ...params })}`);
}

export function getIntegration(id: string): Promise<Integration> {
  return apiFetch<Integration>(`/integrations/${id}`);
}

export function createIntegration(input: CreateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>("/integrations", { method: "POST", body: input });
}

export function updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>(`/integrations/${id}`, { method: "PATCH", body: input });
}

/** Hard delete com cascade nas execuções. Responde 204. */
export function deleteIntegration(id: string): Promise<void> {
  // Sem <void> explícito: @typescript-eslint/no-invalid-void-type reprova void como
  // argumento de tipo em CallExpression (só isenta void em posição de tipo, ex. Promise<void>
  // como anotação). TypeScript já infere T = void contextualmente a partir do retorno
  // declarado da função — mesmo comportamento, sem o argumento de tipo. Achado em F03
  // (docs/todo/frontend/eslint-no-invalid-void-type-apifetch-generic.md), aplicado aqui de antemão.
  return apiFetch(`/integrations/${id}`, { method: "DELETE" });
}

/** Integração inativa → 400 (não 404). Payload opcional, merge shallow com defaultPayload. */
export function triggerIntegration(id: string, payload?: Record<string, unknown>): Promise<Execution> {
  return apiFetch<Execution>(`/integrations/${id}/trigger`, {
    method: "POST",
    body: payload === undefined ? {} : { payload },
  });
}
```

- [ ] **Passo 2: Criar `src/features/integrations/hooks.ts`**

```typescript
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getIntegration, listIntegrations, type ListIntegrationsParams } from "./api";

export const integrationKeys = {
  all: ["integrations"] as const,
  list: (params: ListIntegrationsParams) => ["integrations", params] as const,
  detail: (id: string) => ["integration", id] as const,
};

export function useIntegrations(params: ListIntegrationsParams) {
  return useQuery({
    queryKey: integrationKeys.list(params),
    queryFn: () => listIntegrations(params),
    // Evita o flash de skeleton ao trocar de página.
    placeholderData: keepPreviousData,
  });
}

export function useIntegration(id: string | undefined) {
  return useQuery({
    queryKey: integrationKeys.detail(id ?? ""),
    queryFn: () => getIntegration(id ?? ""),
    enabled: Boolean(id),
  });
}
```

- [ ] **Passo 3: Criar `src/features/integrations/components/integration-type-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { IntegrationType } from "@/shared/types/api";

const LABELS: Record<IntegrationType, string> = {
  WEBHOOK: "Webhook",
  REST_API: "REST API",
  N8N: "n8n",
};

export function IntegrationTypeBadge({ type }: { type: IntegrationType }) {
  return <Badge variant="outline">{LABELS[type]}</Badge>;
}
```

- [ ] **Passo 4: Escrever `src/features/integrations/pages/list.tsx`**

```tsx
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { PaginationBar } from "@/shared/components/pagination-bar";
import { RoleGate } from "@/shared/components/role-gate";
import { useListParams } from "@/shared/hooks/use-list-params";
import { formatDateTime } from "@/shared/lib/format";
import type { IntegrationListItem } from "@/shared/types/api";

import { IntegrationTypeBadge } from "../components/integration-type-badge";
import { useIntegrations } from "../hooks";

const ACTIVE_FILTER_ALL = "all";

export function IntegrationsListPage() {
  const { searchParams, page, limit, setParam, setPage } = useListParams();

  const activeFilter = searchParams.get("isActive") ?? ACTIVE_FILTER_ALL;
  const isActive = activeFilter === ACTIVE_FILTER_ALL ? undefined : activeFilter === "true";

  const { data, isPending, isError, error, refetch } = useIntegrations({ page, limit, isActive });

  const columns: Column<IntegrationListItem>[] = [
    { key: "name", header: "Nome", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Tipo", cell: (row) => <IntegrationTypeBadge type={row.type} /> },
    {
      key: "targetUrl",
      header: "URL de destino",
      cell: (row) => <span className="text-muted-foreground">{row.targetUrl}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Ativa" : "Inativa"}</Badge>,
    },
    { key: "updatedAt", header: "Atualizada em", cell: (row) => formatDateTime(row.updatedAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Button variant="ghost" size="sm" render={<Link to={`/integrations/${row.id}/executions`} />}>
          Histórico
        </Button>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Integrações</h1>
          <p className="text-sm text-muted-foreground">Serviços externos configurados para este tenant</p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={activeFilter}
            onValueChange={(value) => {
              setParam("isActive", value === ACTIVE_FILTER_ALL ? null : value);
            }}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTIVE_FILTER_ALL}>Todas</SelectItem>
              <SelectItem value="true">Somente ativas</SelectItem>
              <SelectItem value="false">Somente inativas</SelectItem>
            </SelectContent>
          </Select>

          <RoleGate role="ADMIN">
            <Button render={<Link to="/integrations/new" />}>
              <Plus className="size-4" />
              Nova integração
            </Button>
          </RoleGate>
        </div>
      </header>

      {isError ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : !isPending && data?.data.length === 0 ? (
        <EmptyState
          title="Nenhuma integração encontrada"
          description="Ajuste o filtro ou cadastre a primeira integração do tenant."
        />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.data ?? []} rowKey={(row) => row.id} isLoading={isPending} />
          {data ? <PaginationBar meta={data.meta} onPageChange={setPage} /> : null}
        </>
      )}
    </section>
  );
}
```

> `Button` do estilo `base-lyra` também usa a prop `render` para virar link. Se o componente gerado não tiver `render`, envolva com `<Link>` por fora do `<Button>`.

- [ ] **Passo 5: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Login como ADMIN | Vê a tabela e o botão "Nova integração" |
| Login como VIEWER | Vê a tabela **sem** "Nova integração" |
| Filtro "Somente inativas" | URL vira `?isActive=false` e a lista atualiza |
| Recarregar com o filtro na URL | Filtro continua aplicado |
| Trocar de página | URL vira `?page=2` sem piscar skeleton |
| Parar o container `api` e recarregar | `ErrorState` com botão "Tentar novamente" |

- [ ] **Passo 6: Lint, typecheck e testes**

**Critério de done F07:**

- [ ] Listagem paginada com filtro `isActive` refletido na URL
- [ ] "Nova integração" oculto para VIEWER
- [ ] Estados de carregando, vazio e erro funcionando
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F07** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md); atualizar [`docs/plans/frontend.md`](../frontend.md) (mover para "já entregue", tirar a linha da tabela); **apagar este arquivo** e [`docs/todo/frontend/eslint-no-invalid-void-type-apifetch-generic.md`](../../todo/frontend/eslint-no-invalid-void-type-apifetch-generic.md)

---

