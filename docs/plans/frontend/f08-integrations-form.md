# F08 — Integrações: formulário de criação e edição

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

**Arquivos:**
- Criar: `src/features/integrations/schemas.ts`, `src/shared/components/json-field.tsx`
- Criar (teste): `src/features/integrations/schemas.test.ts`
- Modificar: `src/features/integrations/hooks.ts`, `src/features/integrations/pages/form.tsx`

**Interfaces:**
- Consome: `useIntegration`, `createIntegration`, `updateIntegration` (F07); `Field*` (F04)
- Produz:
  - `integrationFormSchema`, `IntegrationFormValues`
  - `toFormValues(integration): IntegrationFormValues`
  - `buildCreatePayload(values): CreateIntegrationInput`
  - `buildPatchPayload(initial, values): UpdateIntegrationInput`
  - `useCreateIntegration()`, `useUpdateIntegration(id)`

> **Decisão de tipagem:** os campos JSON ficam como **string** nos valores do formulário (o schema apenas *valida* que o texto é um objeto JSON, sem `transform`). Isso evita o descasamento entre `z.input` e `z.output` que o `zodResolver` provoca quando o schema transforma tipos, e mantém `IntegrationFormValues` simples de tipar no `useForm`.
>
> **Teste além do combinado:** `schemas.test.ts` cobre `buildPatchPayload`. O escopo acordado de testes era só cliente HTTP + papel, mas essa função guarda as duas regras que **destroem dados** se erradas (`authKey` mascarada e `PATCH {}` → 400) — cinco asserções baratas para um risco caro.

- [ ] **Passo 1: Criar `src/features/integrations/schemas.ts`**

```typescript
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

export function parseJsonObject<T extends Record<string, unknown>>(value: string): T | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return JSON.parse(trimmed) as T;
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
    // NUNCA pré-preencher: a API devolve a authKey mascarada ("****-key").
    // Reenviar esse valor sobrescreveria a credencial real.
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
    customHeaders: parseJsonObject<Record<string, string>>(values.customHeaders),
    defaultPayload: parseJsonObject(values.defaultPayload),
    isActive: values.isActive,
  };
}

/** PATCH parcial: só o que mudou. Body vazio nunca deve ser enviado (a API responde 400). */
export function buildPatchPayload(
  initial: IntegrationFormValues,
  values: IntegrationFormValues,
): UpdateIntegrationInput {
  const patch: UpdateIntegrationInput = {};

  if (values.name !== initial.name) patch.name = values.name;
  if (values.type !== initial.type) patch.type = values.type;
  if (values.targetUrl !== initial.targetUrl) patch.targetUrl = values.targetUrl;
  if (values.isActive !== initial.isActive) patch.isActive = values.isActive;

  // Campo em branco significa "manter a chave atual".
  if (values.authKey !== "") patch.authKey = values.authKey;

  // JSON substitui o objeto inteiro (não é merge); limpar o campo envia {}.
  if (values.customHeaders !== initial.customHeaders) {
    patch.customHeaders = parseJsonObject<Record<string, string>>(values.customHeaders) ?? {};
  }
  if (values.defaultPayload !== initial.defaultPayload) {
    patch.defaultPayload = parseJsonObject(values.defaultPayload) ?? {};
  }

  return patch;
}
```

- [ ] **Passo 2: Escrever `src/features/integrations/schemas.test.ts`**

```typescript
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
```

- [ ] **Passo 3: Rodar os testes e confirmar que falham, depois que passam**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm test
```

Primeiro FAIL (`Failed to resolve import "./schemas"` antes do Passo 1 estar salvo), depois **6 testes novos passando**.

- [ ] **Passo 4: Criar `src/shared/components/json-field.tsx`**

```tsx
import type { ComponentProps } from "react";
import type { FieldError as RhfFieldError } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface JsonFieldProps extends ComponentProps<typeof Textarea> {
  id: string;
  label: string;
  description?: string;
  error?: RhfFieldError;
}

export function JsonField({ id, label, description, error, ...props }: JsonFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} rows={5} spellCheck={false} className="font-mono text-xs" {...props} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error]} />
    </Field>
  );
}
```

- [ ] **Passo 5: Adicionar as mutations em `src/features/integrations/hooks.ts`**

```typescript
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createIntegration,
  getIntegration,
  listIntegrations,
  updateIntegration,
  type CreateIntegrationInput,
  type ListIntegrationsParams,
  type UpdateIntegrationInput,
} from "./api";
```

```typescript
export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateIntegrationInput) => createIntegration(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
    },
  });
}

export function useUpdateIntegration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateIntegrationInput) => updateIntegration(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      void queryClient.invalidateQueries({ queryKey: integrationKeys.detail(id) });
    },
  });
}
```

- [ ] **Passo 6: Escrever `src/features/integrations/pages/form.tsx`**

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/shared/components/error-state";
import { JsonField } from "@/shared/components/json-field";
import { ApiError } from "@/shared/api/errors";

import { useCreateIntegration, useIntegration, useUpdateIntegration } from "../hooks";
import {
  buildCreatePayload,
  buildPatchPayload,
  emptyIntegrationForm,
  integrationFormSchema,
  toFormValues,
  type IntegrationFormValues,
} from "../schemas";

export function IntegrationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const detail = useIntegration(id);
  const createMutation = useCreateIntegration();
  const updateMutation = useUpdateIntegration(id ?? "");

  const [initialValues, setInitialValues] = useState<IntegrationFormValues>(emptyIntegrationForm);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: emptyIntegrationForm,
  });

  useEffect(() => {
    if (!detail.data) return;
    const values = toFormValues(detail.data);
    setInitialValues(values);
    reset(values);
  }, [detail.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        const patch = buildPatchPayload(initialValues, values);
        // Body vazio devolveria 400 — nada mudou, então nem chama a API.
        if (Object.keys(patch).length > 0) {
          await updateMutation.mutateAsync(patch);
          toast.success("Integração atualizada.");
        }
      } else {
        await createMutation.mutateAsync(buildCreatePayload(values));
        toast.success("Integração criada.");
      }
      await navigate("/integrations");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar a integração.");
    }
  });

  if (isEdit && detail.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isEdit && detail.isError) {
    return (
      <ErrorState
        error={detail.error}
        onRetry={() => {
          void detail.refetch();
        }}
      />
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Editar integração" : "Nova integração"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)} noValidate>
          <Field>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input id="name" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Controller
            control={control}
            name="type"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor="type">Tipo</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEBHOOK">Webhook</SelectItem>
                    <SelectItem value="REST_API">REST API</SelectItem>
                    <SelectItem value="N8N">n8n</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>Metadado — o disparo HTTP é idêntico para os três tipos.</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Field>
            <FieldLabel htmlFor="targetUrl">URL de destino</FieldLabel>
            <Input id="targetUrl" placeholder="https://webhook.site/..." {...register("targetUrl")} />
            <FieldDescription>O disparo é sempre POST, com timeout de 30s e sem retry.</FieldDescription>
            <FieldError errors={[errors.targetUrl]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="authKey">Chave de autenticação</FieldLabel>
            <Input id="authKey" type="password" autoComplete="off" {...register("authKey")} />
            <FieldDescription>
              {isEdit
                ? "Deixe em branco para manter a chave atual. A API nunca devolve o valor real."
                : "Enviada como Authorization: Bearer no disparo."}
            </FieldDescription>
            <FieldError errors={[errors.authKey]} />
          </Field>

          <JsonField
            id="customHeaders"
            label="Headers customizados"
            description='Objeto JSON. Ex.: { "X-Custom": "value" }'
            error={errors.customHeaders}
            {...register("customHeaders")}
          />

          <JsonField
            id="defaultPayload"
            label="Payload padrão"
            description="Objeto JSON mesclado (shallow) com o payload do disparo."
            error={errors.defaultPayload}
            {...register("defaultPayload")}
          />

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                <FieldLabel htmlFor="isActive">Integração ativa</FieldLabel>
              </Field>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigate("/integrations");
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Passo 7: Ligar o botão "Editar" na listagem**

Em `src/features/integrations/pages/list.tsx`, dentro da coluna de ações:

```tsx
          <RoleGate role="ADMIN">
            <Button variant="ghost" size="sm" render={<Link to={`/integrations/${row.id}/edit`} />}>
              Editar
            </Button>
          </RoleGate>
```

- [ ] **Passo 8: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Criar com URL inválida | Erro do zod, sem chamada HTTP |
| Criar com headers `{"X-A": 1` | Erro "Informe um objeto JSON válido" |
| Criar válida | Toast de sucesso, volta para a lista, item aparece no topo (`updatedAt DESC`) |
| Abrir "Editar" | Campos preenchidos; **`authKey` vazia** com a explicação |
| Salvar sem mudar nada | Volta para a lista **sem** requisição PATCH (aba Network) |
| Mudar só o nome | PATCH com body `{ "name": ... }` apenas |
| VIEWER acessando `/integrations/:id/edit` na URL | Redirecionado para `/integrations` |

- [ ] **Passo 9: Lint, typecheck e testes**

**Critério de done F08:**

- [ ] Criar e editar funcionam; PATCH envia só o que mudou
- [ ] `authKey` nunca aparece pré-preenchida e é omitida quando em branco
- [ ] Salvar sem alterações não dispara requisição
- [ ] 6 testes de `schemas.test.ts` passando
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F08** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md)

---

