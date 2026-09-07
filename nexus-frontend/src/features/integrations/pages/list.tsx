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
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Ativa" : "Inativa"}</Badge>
      ),
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
      ) : !isPending && data.data.length === 0 ? (
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
