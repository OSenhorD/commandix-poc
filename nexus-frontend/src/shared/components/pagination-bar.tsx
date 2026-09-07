import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/shared/types/api";

export function PaginationBar({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm text-muted-foreground">
      <span>
        {meta.total === 0
          ? "Nenhum registro"
          : `Página ${String(meta.page)} de ${String(meta.totalPages)} · ${String(meta.total)} registro(s)`}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!meta.hasPreviousPage}
          onClick={() => {
            onPageChange(meta.page - 1);
          }}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => {
            onPageChange(meta.page + 1);
          }}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
