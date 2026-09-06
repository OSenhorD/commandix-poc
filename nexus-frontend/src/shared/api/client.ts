import { tokenStorage } from "@/shared/lib/storage";

import { ApiError, messageFromBody } from "./errors";

const API_URL: string = import.meta.env.VITE_API_URL ?? "/api/v1";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Serializado como JSON automaticamente. */
  body?: unknown;
  /** `false` para rotas públicas (login, refresh, bootstrap). */
  auth?: boolean;
}

let refreshPromise: Promise<string> | null = null;
let onUnauthorized: () => void = () => undefined;

/** Registrado pelo AuthProvider (F04) para derrubar a sessão quando o refresh falha. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function request(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function runRefresh(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new ApiError(401, "Sessão expirada.");

  const response = await request("/auth/refresh", { method: "POST", body: { refreshToken } }, null);
  if (!response.ok) throw new ApiError(response.status, "Sessão expirada.");

  const data = (await response.json()) as { accessToken: string };
  tokenStorage.setAccess(data.accessToken);
  return data.accessToken;
}

/**
 * Single-flight: chamadas concorrentes que tomam 401 compartilham a MESMA
 * promise de refresh, em vez de disparar um POST /auth/refresh cada uma.
 */
function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const pending = runRefresh();
  refreshPromise = pending;

  // `.catch` antes do `.finally` evita unhandled rejection nesta cadeia auxiliar.
  void pending
    .catch(() => undefined)
    .finally(() => {
      if (refreshPromise === pending) refreshPromise = null;
    });

  return pending;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  let response = await request(path, options, useAuth ? tokenStorage.getAccess() : null);

  if (response.status === 401 && useAuth) {
    try {
      const accessToken = await refreshAccessToken();
      response = await request(path, options, accessToken);
    } catch {
      tokenStorage.clear();
      onUnauthorized();
      throw new ApiError(401, "Sessão expirada. Faça login novamente.");
    }
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, messageFromBody(body, response.statusText));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
