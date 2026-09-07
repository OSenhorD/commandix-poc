import { z } from "zod";

import type { Integration } from "@/shared/types/api";

import type { CreateIntegrationInput, UpdateIntegrationInput } from "./api";

function isJsonObject(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

const jsonObjectString = z
  .string()
  .trim()
  .refine((value) => value === "" || isJsonObject(value), { message: "Informe um objeto JSON válido" });

export const integrationFormSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  type: z.enum(["WEBHOOK", "REST_API", "N8N"]),
  targetUrl: z.url("Informe uma URL válida"),
  authKey: z.string().trim(),
  customHeaders: jsonObjectString,
  defaultPayload: jsonObjectString,
  isActive: z.boolean(),
});

export type IntegrationFormValues = z.infer<typeof integrationFormSchema>;

export function parseJsonObject(value: string): Record<string, unknown> | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return JSON.parse(trimmed) as Record<string, unknown>;
}

export function stringifyJsonObject(value: Record<string, unknown> | null): string {
  return value === null ? "" : JSON.stringify(value, null, 2);
}

export const emptyIntegrationForm: IntegrationFormValues = {
  name: "",
  type: "WEBHOOK",
  targetUrl: "",
  authKey: "",
  customHeaders: "",
  defaultPayload: "",
  isActive: true,
};

export function toFormValues(integration: Integration): IntegrationFormValues {
  return {
    name: integration.name,
    type: integration.type,
    targetUrl: integration.targetUrl,
    authKey: "",
    customHeaders: stringifyJsonObject(integration.customHeaders),
    defaultPayload: stringifyJsonObject(integration.defaultPayload),
    isActive: integration.isActive,
  };
}

export function buildCreatePayload(values: IntegrationFormValues): CreateIntegrationInput {
  return {
    name: values.name,
    type: values.type,
    targetUrl: values.targetUrl,
    authKey: values.authKey === "" ? undefined : values.authKey,
    customHeaders: parseJsonObject(values.customHeaders) as Record<string, string> | undefined,
    defaultPayload: parseJsonObject(values.defaultPayload),
    isActive: values.isActive,
  };
}

export function buildPatchPayload(
  initial: IntegrationFormValues,
  values: IntegrationFormValues,
): UpdateIntegrationInput {
  const patch: UpdateIntegrationInput = {};

  if (values.name !== initial.name) {
    patch.name = values.name;
  }

  if (values.type !== initial.type) {
    patch.type = values.type;
  }

  if (values.targetUrl !== initial.targetUrl) {
    patch.targetUrl = values.targetUrl;
  }

  if (values.isActive !== initial.isActive) {
    patch.isActive = values.isActive;
  }

  if (values.authKey !== "") {
    patch.authKey = values.authKey;
  }

  if (values.customHeaders !== initial.customHeaders) {
    patch.customHeaders = (parseJsonObject(values.customHeaders) as Record<string, string> | undefined) ?? {};
  }

  if (values.defaultPayload !== initial.defaultPayload) {
    patch.defaultPayload = parseJsonObject(values.defaultPayload) ?? {};
  }

  return patch;
}
