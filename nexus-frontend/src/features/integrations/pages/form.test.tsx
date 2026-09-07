import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/shared/api/query-client";
import { tokenStorage } from "@/shared/lib/storage";
import type { Integration } from "@/shared/types/api";

import { IntegrationFormPage } from "./form";

const integration: Integration = {
  id: "int-1",
  name: "Echo Webhook",
  type: "WEBHOOK",
  targetUrl: "https://webhook.site/echo",
  authKey: "****-key",
  customHeaders: null,
  defaultPayload: { source: "commandix" },
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderEditForm() {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(
    [
      { path: "/integrations/:id/edit", element: <IntegrationFormPage /> },
      { path: "/integrations", element: <p>lista</p> },
    ],
    { initialEntries: ["/integrations/int-1/edit"] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("IntegrationFormPage edit", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.set("access-1", "refresh-1");
  });

  it("envia PATCH só com targetUrl quando apenas a URL muda", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url === "/api/v1/integrations/int-1" && (init?.method === undefined || init.method === "GET")) {
        return Promise.resolve(jsonResponse(200, integration));
      }
      if (url === "/api/v1/integrations/int-1" && init?.method === "PATCH") {
        return Promise.resolve(jsonResponse(200, { ...integration, targetUrl: "https://webhook.site/echo-updated" }));
      }
      return Promise.resolve(jsonResponse(404, { message: `unexpected ${init?.method ?? "GET"} ${url}` }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderEditForm();

    const urlInput = await screen.findByLabelText("URL de destino");
    await waitFor(() => {
      expect(urlInput).toHaveValue("https://webhook.site/echo");
    });

    fireEvent.change(urlInput, { target: { value: "https://webhook.site/echo-updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(patchCall).toBeDefined();
      const body = patchCall?.[1]?.body;
      if (typeof body !== "string") {
        throw new Error("PATCH body should be a JSON string");
      }
      expect(JSON.parse(body)).toEqual({
        targetUrl: "https://webhook.site/echo-updated",
      });
    });
  });
});
