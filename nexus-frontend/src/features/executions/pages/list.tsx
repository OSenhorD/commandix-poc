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
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to={`/executions/${row.id}`} />}>
          Detalhe
        </Button>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link to="/integrations" />}>
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
      ) : !executions.isPending && executions.data.data.length === 0 ? (
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
