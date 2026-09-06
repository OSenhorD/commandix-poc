import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStorage } from "@/shared/lib/storage";

import { apiFetch, setUnauthorizedHandler } from "./client";
import { ApiError } from "./errors";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeaderOf(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get("Authorization");
}

// `vi.fn<typeof fetch>()` em vez de `vi.fn()`: sem o genérico, `mock.calls` é `any[]`
// e o ESLint (`strictTypeChecked` → no-unsafe-member-access) reprova o arquivo de teste.

describe("apiFetch", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
    setUnauthorizedHandler(() => undefined);
  });

  it("envia o access token no header Authorization", async () => {
    tokenStorage.set("access-1", "refresh-1");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/integrations");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/integrations");
    expect(authHeaderOf(fetchMock.mock.calls[0][1])).toBe("Bearer access-1");
  });

  it("não envia Authorization quando auth: false", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { accessToken: "a" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/auth/login", { method: "POST", body: { email: "a@b.c" }, auth: false });

    expect(authHeaderOf(fetchMock.mock.calls[0][1])).toBeNull();
  });

  it("renova o token e repete a requisição original quando recebe 401", async () => {
    tokenStorage.set("expired", "refresh-1");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401, message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "access-2" }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "int-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch<{ id: string }>("/integrations/int-1")).resolves.toEqual({ id: "int-1" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/auth/refresh");
    expect(authHeaderOf(fetchMock.mock.calls[2][1])).toBe("Bearer access-2");
    expect(tokenStorage.getAccess()).toBe("access-2");
  });

  it("faz um único refresh para chamadas concorrentes (single-flight)", async () => {
    tokenStorage.set("expired", "refresh-1");
    let refreshCalls = 0;

    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      if (String(input).endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(jsonResponse(200, { accessToken: "access-2" }));
      }
      return Promise.resolve(
        authHeaderOf(init) === "Bearer access-2"
          ? jsonResponse(200, { ok: true })
          : jsonResponse(401, { message: "Unauthorized" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([apiFetch("/integrations"), apiFetch("/executions/exec-1")]);

    expect(refreshCalls).toBe(1);
  });

  it("limpa o storage e aciona o handler quando o refresh falha", async () => {
    tokenStorage.set("expired", "refresh-1");
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "Invalid refresh token" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/integrations")).rejects.toBeInstanceOf(ApiError);
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("retorna undefined em 204 (DELETE e logout)", async () => {
    tokenStorage.set("access-1", "refresh-1");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiFetch("/integrations/int-1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("junta as mensagens de validação do Nest em uma única string", async () => {
    tokenStorage.set("access-1", "refresh-1");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(400, {
          statusCode: 400,
          message: ["name should not be empty", "type must be a valid enum value"],
          error: "Bad Request",
        }),
      ),
    );

    await expect(apiFetch("/integrations", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 400,
      message: "name should not be empty, type must be a valid enum value",
    });
  });
});
