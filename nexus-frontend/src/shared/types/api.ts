export type Role = "ADMIN" | "VIEWER";
export type IntegrationType = "WEBHOOK" | "REST_API" | "N8N";
export type ExecutionStatus = "SUCCESS" | "FAILURE";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
}

export interface BootstrapResponse {
  tenant: TenantSummary;
  user: AuthUser;
}

/** Item da listagem — `customHeaders` e `defaultPayload` NÃO vêm aqui (05-api §5.3). */
export interface IntegrationListItem {
  id: string;
  name: string;
  type: IntegrationType;
  targetUrl: string;
  /** Mascarada pela API (ex.: "****-key"). Nunca reenviar este valor. */
  authKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Integration extends IntegrationListItem {
  customHeaders: Record<string, string> | null;
  defaultPayload: Record<string, unknown> | null;
}

export interface ExecutionListItem {
  id: string;
  integrationId: string;
  status: ExecutionStatus;
  httpStatusCode: number | null;
  responseTimeMs: number;
  executedAt: string;
}

export interface Execution extends ExecutionListItem {
  requestPayload: Record<string, unknown> | null;
  /** Pode terminar em "… [truncated]" (limite 10 240 bytes). */
  responseBody: string | null;
}
