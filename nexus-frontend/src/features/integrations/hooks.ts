import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createIntegration,
  deleteIntegration,
  getIntegration,
  listIntegrations,
  triggerIntegration,
  updateIntegration,
  type CreateIntegrationInput,
  type ListIntegrationsParams,
  type UpdateIntegrationInput,
} from "./api";

export const integrationKeys = {
  all: ["integrations"] as const,
  list: (params: ListIntegrationsParams) => ["integrations", params] as const,
  detail: (id: string) => ["integration", id] as const,
};

export function useIntegrations(params: ListIntegrationsParams) {
  return useQuery({
    queryKey: integrationKeys.list(params),
    queryFn: () => listIntegrations(params),
    // Evita o flash de skeleton ao trocar de página.
    placeholderData: keepPreviousData,
  });
}

export function useIntegration(id: string | undefined) {
  return useQuery({
    queryKey: integrationKeys.detail(id ?? ""),
    queryFn: () => getIntegration(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateIntegrationInput) => createIntegration(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
    },
  });
}

export function useUpdateIntegration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateIntegrationInput) => updateIntegration(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      void queryClient.invalidateQueries({ queryKey: integrationKeys.detail(id) });
    },
  });
}

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
