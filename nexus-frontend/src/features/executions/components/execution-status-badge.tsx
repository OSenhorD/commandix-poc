import { Badge } from "@/components/ui/badge";
import type { ExecutionStatus } from "@/shared/types/api";

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  return (
    <Badge variant={status === "SUCCESS" ? "default" : "destructive"}>
      {status === "SUCCESS" ? "Sucesso" : "Falha"}
    </Badge>
  );
}
