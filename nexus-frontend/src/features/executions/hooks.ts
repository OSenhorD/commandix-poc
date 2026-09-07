import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getExecution, listExecutions, type ListExecutionsParams } from "./api";

export const executionKeys = {
  all: ["executions"] as const,
  list: (integrationId: string, params: ListExecutionsParams) => ["executions", integrationId, params] as const,
  detail: (id: string) => ["execution", id] as const,
};

export function useExecutions(integrationId: string, params: ListExecutionsParams, enabled = true) {
  return useQuery({
    queryKey: executionKeys.list(integrationId, params),
    queryFn: () => listExecutions(integrationId, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useExecution(id: string | undefined) {
  return useQuery({
    queryKey: executionKeys.detail(id ?? ""),
    queryFn: () => getExecution(id ?? ""),
    enabled: Boolean(id),
  });
}
