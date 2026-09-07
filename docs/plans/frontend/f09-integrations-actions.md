# F09 — Integrações: ativar/desativar, excluir e disparar

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.

**Arquivos:**
- Criar: `src/features/integrations/components/delete-integration-dialog.tsx`, `src/features/integrations/components/trigger-integration-dialog.tsx`
- Modificar: `src/features/integrations/hooks.ts`, `src/features/integrations/pages/list.tsx`

**Interfaces:**
- Consome: `deleteIntegration`, `triggerIntegration` (F07); `AlertDialog`, `Dialog`, `Switch`, `toast` (F06)
- Produz: `useDeleteIntegration()`, `useToggleIntegration()`, `useTriggerIntegration(id)`

> `POST /integrations/:id/trigger` em integração **inativa** responde **`400`** e **não registra execução**. A UI desabilita a ação quando `isActive: false` e explica o motivo — o `400` da API é a segunda linha de defesa, tratada com toast.

- [ ] **Passo 1: Adicionar as mutations em `src/features/integrations/hooks.ts`**

```typescript
export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
    },
  });
}

/** Ativar/desativar é um PATCH parcial com um campo só. */
export function useToggleIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateIntegration(id, { isActive }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      void queryClient.invalidateQueries({ queryKey: integrationKeys.detail(variables.id) });
    },
  });
}

export function useTriggerIntegration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: Record<string, unknown>) => triggerIntegration(id, payload),
    onSuccess: () => {
      // O histórico daquela integração passou a ter uma execução nova.
      void queryClient.invalidateQueries({ queryKey: ["executions", id] });
    },
  });
}
```

Adicionar `deleteIntegration` e `triggerIntegration` aos imports de `./api`.

- [ ] **Passo 2: Criar `src/features/integrations/components/delete-integration-dialog.tsx`**

```tsx
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/errors";
import type { IntegrationListItem } from "@/shared/types/api";

import { useDeleteIntegration } from "../hooks";

export function DeleteIntegrationDialog({ integration }: { integration: IntegrationListItem }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteIntegration();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(integration.id);
      toast.success("Integração excluída.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível excluir a integração.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" aria-label="Excluir" />}>
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{integration.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            A exclusão é permanente e apaga junto todo o histórico de execuções desta integração. Para preservar o
            histórico, prefira desativá-la.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Passo 3: Criar `src/features/integrations/components/trigger-integration-dialog.tsx`**

```tsx
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
```

- [ ] **Passo 4: Montar a coluna de ações em `src/features/integrations/pages/list.tsx`**

Imports novos no arquivo:

```tsx
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/shared/api/errors";

import { DeleteIntegrationDialog } from "../components/delete-integration-dialog";
import { TriggerIntegrationDialog } from "../components/trigger-integration-dialog";
import { useIntegrations, useToggleIntegration } from "../hooks";
```

Substituir a coluna `actions` e trocar a coluna `isActive` por um `Switch` controlado (`toggleMutation` fica no corpo do componente, antes do array `columns`):

```tsx
  const toggleMutation = useToggleIntegration();

  const columns: Column<IntegrationListItem>[] = [
    // … name, type, targetUrl …
    {
      key: "isActive",
      header: "Ativa",
      cell: (row) => (
        <RoleGate role="ADMIN">
          <Switch
            checked={row.isActive}
            disabled={toggleMutation.isPending}
            aria-label={row.isActive ? "Desativar integração" : "Ativar integração"}
            onCheckedChange={(checked) => {
              toggleMutation.mutate(
                { id: row.id, isActive: checked },
                {
                  onSuccess: () => {
                    toast.success(checked ? "Integração ativada." : "Integração desativada.");
                  },
                  onError: (error) => {
                    toast.error(error instanceof ApiError ? error.message : "Não foi possível alterar o status.");
                  },
                },
              );
            }}
          />
        </RoleGate>
      ),
    },
    { key: "updatedAt", header: "Atualizada em", cell: (row) => formatDateTime(row.updatedAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" render={<Link to={`/integrations/${row.id}/executions`} />}>
            Histórico
          </Button>
          <RoleGate role="ADMIN">
            <Button variant="ghost" size="sm" render={<Link to={`/integrations/${row.id}/edit`} />}>
              Editar
            </Button>
          </RoleGate>
          <RoleGate role="ADMIN">
            <TriggerIntegrationDialog integration={row} />
          </RoleGate>
          <RoleGate role="ADMIN">
            <DeleteIntegrationDialog integration={row} />
          </RoleGate>
        </div>
      ),
    },
  ];
```

> Para o VIEWER, a coluna "Ativa" fica vazia (o `RoleGate` some com o switch). Se preferir mostrar o estado em texto para o VIEWER, coloque o `Badge` de F07 como fallback fora do `RoleGate`.

- [ ] **Passo 5: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Alternar o switch | Toast + lista atualizada sem reload |
| Desativar e tentar disparar | Botão de disparo desabilitado com tooltip explicando |
| Disparar integração ativa (URL válida) | Resultado com badge `SUCCESS`, status HTTP e tempo; link para o detalhe |
| Disparar com `targetUrl` inexistente | Badge `FAILURE`, HTTP `—` (a API grava `httpStatusCode: null`) |
| Disparar com payload `{` | Erro de JSON antes de qualquer requisição |
| Excluir | Diálogo alerta sobre o cascade; após confirmar, some da lista |
| VIEWER | Não vê switch, editar, disparar nem excluir — só "Histórico" |

- [ ] **Passo 6: Lint, typecheck e testes**

**Critério de done F09:**

- [ ] Ativar/desativar via `PATCH { isActive }` com feedback em toast
- [ ] Disparo com payload opcional mostrando resultado e link para o detalhe
- [ ] Disparo bloqueado na UI quando inativa; `400` da API tratado em toast
- [ ] Exclusão com confirmação que menciona o cascade das execuções
- [ ] VIEWER sem nenhuma ação de escrita visível
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F09** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md); atualizar [`docs/plans/frontend.md`](../frontend.md) (mover para "já entregue", tirar a linha da tabela); **apagar este arquivo**

---

