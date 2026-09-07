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

/** PATCH parcial: todo campo é opcional e só o enviado muda (05-api §5.3). */
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

/** Hard delete com cascade nas execuções. Responde 204. */
export function deleteIntegration(id: string): Promise<void> {
  // Sem <void> explícito: @typescript-eslint/no-invalid-void-type reprova void como
  // argumento de tipo em CallExpression (só isenta void em posição de tipo, ex. Promise<void>
  // como anotação). TypeScript já infere T = void contextualmente a partir do retorno
  // declarado da função — mesmo comportamento, sem o argumento de tipo. Achado em F03
  // (docs/todo/frontend/eslint-no-invalid-void-type-apifetch-generic.md), aplicado aqui de antemão.
  return apiFetch(`/integrations/${id}`, { method: "DELETE" });
}

/** Integração inativa → 400 (não 404). Payload opcional, merge shallow com defaultPayload. */
export function triggerIntegration(id: string, payload?: Record<string, unknown>): Promise<Execution> {
  return apiFetch<Execution>(`/integrations/${id}/trigger`, {
    method: "POST",
    body: payload === undefined ? {} : { payload },
  });
}
