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

export function logout(refreshToken: string): Promise<void> {
  return apiFetch("/auth/logout", { method: "POST", body: { refreshToken } });
}

export function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}
