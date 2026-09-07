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
