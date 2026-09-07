import { apiFetch } from "@/shared/api/client";
import { buildQuery } from "@/shared/lib/query-string";
import type { Execution, Integration, IntegrationListItem, IntegrationType, Paginated } from "@/shared/types/api";

export interface ListIntegrationsParams {
  page: number;
  limit: number;
  isActive?: boolean;
}

export interface CreateIntegrationInput {
  name: string;
  type: IntegrationType;
  targetUrl: string;
  authKey?: string;
  customHeaders?: Record<string, string>;
  defaultPayload?: Record<string, unknown>;
  isActive?: boolean;
}

export type UpdateIntegrationInput = Partial<CreateIntegrationInput>;

export function listIntegrations(params: ListIntegrationsParams): Promise<Paginated<IntegrationListItem>> {
  return apiFetch<Paginated<IntegrationListItem>>(`/integrations${buildQuery({ ...params })}`);
}

export function getIntegration(id: string): Promise<Integration> {
  return apiFetch<Integration>(`/integrations/${id}`);
}

export function createIntegration(input: CreateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>("/integrations", { method: "POST", body: input });
}

export function updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>(`/integrations/${id}`, { method: "PATCH", body: input });
}

export function deleteIntegration(id: string): Promise<void> {
  return apiFetch(`/integrations/${id}`, { method: "DELETE" });
}

export function triggerIntegration(id: string, payload?: Record<string, unknown>): Promise<Execution> {
  return apiFetch<Execution>(`/integrations/${id}/trigger`, {
    method: "POST",
    body: payload === undefined ? {} : { payload },
  });
}
