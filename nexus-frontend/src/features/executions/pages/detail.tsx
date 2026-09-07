import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { CodeBlock } from "@/shared/components/code-block";
import { ErrorState } from "@/shared/components/error-state";
import { formatDateTime, formatDuration } from "@/shared/lib/format";

import { ExecutionStatusBadge } from "../components/execution-status-badge";
import { useExecution } from "../hooks";

export function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error, refetch } = useExecution(id);

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={<Link to={`/integrations/${data.integrationId}/executions`} />}
      >
        <ArrowLeft className="size-4" />
        Histórico da integração
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            Execução
            <ExecutionStatusBadge status={data.status} />
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Executada em</dt>
              <dd className="text-sm">{formatDateTime(data.executedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status HTTP</dt>
              <dd className="text-sm">
                {data.httpStatusCode === null ? "— (erro de rede ou timeout)" : String(data.httpStatusCode)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Duração</dt>
              <dd className="text-sm">{formatDuration(data.responseTimeMs)}</dd>
            </div>
          </dl>

          <Separator />

          <CodeBlock
            title="Payload enviado"
            content={data.requestPayload === null ? null : JSON.stringify(data.requestPayload, null, 2)}
            emptyLabel="Nenhum payload foi enviado neste disparo."
          />

          <CodeBlock
            title="Resposta"
            content={data.responseBody}
            emptyLabel="A API externa não devolveu corpo na resposta."
          />
        </CardContent>
      </Card>
    </section>
  );
}
