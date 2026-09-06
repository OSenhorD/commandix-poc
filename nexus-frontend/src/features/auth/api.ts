import { apiFetch } from "@/shared/api/client";
import type { AuthUser, BootstrapResponse, LoginResponse } from "@/shared/types/api";

export interface LoginInput {
  email: string;
  password: string;
}

export interface BootstrapInput {
  tenantName: string;
  tenantSlug: string;
  adminEmail: string;
  adminPassword: string;
}

export function login(input: LoginInput): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", { method: "POST", body: input, auth: false });
}

export function bootstrap(input: BootstrapInput): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>("/tenants/bootstrap", { method: "POST", body: input, auth: false });
}

/** Revoga apenas o refresh token deste dispositivo. Responde 204. */
export function logout(refreshToken: string): Promise<void> {
  // Sem <void> explícito: @typescript-eslint/no-invalid-void-type reprova `void` como argumento de tipo
  // em CallExpression (ex.: `apiFetch<void>(...)`), mesmo com `allowInGenericTypeArguments: true` (que só
  // cobre `Foo<void>` em posição de tipo, ex. `Promise<void>`). O retorno já é contextualmente tipado como
  // `Promise<void>` pela assinatura da função — T é inferido sem precisar do argumento explícito.
  return apiFetch("/auth/logout", { method: "POST", body: { refreshToken } });
}

/** Reidrata a sessão a partir das claims do access token. */
export function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}
