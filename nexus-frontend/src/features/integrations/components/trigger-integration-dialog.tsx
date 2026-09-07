import { Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/shared/api/errors";
import { formatDuration } from "@/shared/lib/format";
import type { Execution, IntegrationListItem } from "@/shared/types/api";

import { useTriggerIntegration } from "../hooks";

export function TriggerIntegrationDialog({ integration }: { integration: IntegrationListItem }) {
  const [open, setOpen] = useState(false);
  const [payloadText, setPayloadText] = useState("");
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [result, setResult] = useState<Execution | null>(null);

  const triggerMutation = useTriggerIntegration(integration.id);

  const handleTrigger = async () => {
    setPayloadError(null);
    setResult(null);

    let payload: Record<string, unknown> | undefined;
    const trimmed = payloadText.trim();

    if (trimmed !== "") {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("não é objeto");
        }
        payload = parsed as Record<string, unknown>;
      } catch {
        setPayloadError("Informe um objeto JSON válido.");
        return;
      }
    }

    try {
      setResult(await triggerMutation.mutateAsync(payload));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível disparar a integração.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          setPayloadError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label="Disparar"
            disabled={!integration.isActive}
            title={integration.isActive ? "Disparar integração" : "Integração inativa — ative antes de disparar"}
          />
        }
      >
        <Play className="size-4" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disparar “{integration.name}”</DialogTitle>
          <DialogDescription>
            Payload opcional, mesclado (shallow) com o payload padrão da integração.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder='{ "event": "order.created" }'
          value={payloadText}
          onChange={(event) => {
            setPayloadText(event.target.value);
          }}
        />
        {payloadError ? (
          <p role="alert" className="text-sm text-destructive">
            {payloadError}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={result.status === "SUCCESS" ? "default" : "destructive"}>{result.status}</Badge>
              <span className="text-muted-foreground">
                HTTP {result.httpStatusCode === null ? "—" : String(result.httpStatusCode)} ·{" "}
                {formatDuration(result.responseTimeMs)}
              </span>
            </div>
            <Link to={`/executions/${result.id}`} className="underline">
              Ver detalhe da execução
            </Link>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            disabled={triggerMutation.isPending}
            onClick={() => {
              void handleTrigger();
            }}
          >
            {triggerMutation.isPending ? <Spinner /> : null}
            Disparar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
