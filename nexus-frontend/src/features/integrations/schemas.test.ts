import { describe, expect, it } from "vitest";

import { buildPatchPayload, emptyIntegrationForm, toFormValues, type IntegrationFormValues } from "./schemas";

const initial: IntegrationFormValues = {
  ...emptyIntegrationForm,
  name: "Order Webhook",
  targetUrl: "https://webhook.site/abc",
  customHeaders: '{\n  "X-Custom": "value"\n}',
};

describe("buildPatchPayload", () => {
  it("não envia nada quando nada mudou", () => {
    expect(buildPatchPayload(initial, { ...initial })).toEqual({});
  });

  it("envia apenas os campos alterados", () => {
    expect(buildPatchPayload(initial, { ...initial, name: "Novo nome" })).toEqual({ name: "Novo nome" });
  });

  it("omite authKey quando o campo está vazio (mantém a chave atual)", () => {
    const patch = buildPatchPayload(initial, { ...initial, isActive: false });
    expect(patch).not.toHaveProperty("authKey");
    expect(patch).toEqual({ isActive: false });
  });

  it("envia authKey quando o usuário digita uma nova chave", () => {
    expect(buildPatchPayload(initial, { ...initial, authKey: "nova-chave" })).toEqual({ authKey: "nova-chave" });
  });

  it("envia {} quando o JSON de headers é apagado", () => {
    expect(buildPatchPayload(initial, { ...initial, customHeaders: "" })).toEqual({ customHeaders: {} });
  });
});

describe("toFormValues", () => {
  it("nunca traz a authKey mascarada para o formulário", () => {
    const values = toFormValues({
      id: "int-1",
      name: "Order Webhook",
      type: "WEBHOOK",
      targetUrl: "https://webhook.site/abc",
      authKey: "****-key",
      customHeaders: { "X-Custom": "value" },
      defaultPayload: null,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(values.authKey).toBe("");
    expect(values.defaultPayload).toBe("");
  });
});
