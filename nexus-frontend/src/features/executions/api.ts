import { apiFetch } from "@/shared/api/client";
import { buildQuery } from "@/shared/lib/query-string";
import type { Execution, ExecutionListItem, ExecutionStatus, Paginated } from "@/shared/types/api";

export interface ListExecutionsParams {
  page: number;
  limit: number;
  status?: ExecutionStatus;
  // ISO 8601 ou YYYY-MM-DD (dia inteiro em UTC). Inclusive.
  from?: string;
  to?: string;
}

export function listExecutions(
  integrationId: string,
  params: ListExecutionsParams,
): Promise<Paginated<ExecutionListItem>> {
  return apiFetch<Paginated<ExecutionListItem>>(
    `/integrations/${integrationId}/executions${buildQuery({ ...params })}`,
  );
}

export function getExecution(id: string): Promise<Execution> {
  return apiFetch<Execution>(`/executions/${id}`);
}
