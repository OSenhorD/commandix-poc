import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/errors";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Não foi possível carregar os dados.";

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 p-12 text-center">
      <p role="alert" className="font-medium text-destructive">
        {message}
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
