import { zodResolver } from "@hookform/resolvers/zod";
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
import { ApiError } from "@/shared/api/errors";
import { ErrorState } from "@/shared/components/error-state";
import { JsonField } from "@/shared/components/json-field";

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
  const detail = useIntegration(id);

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
    <IntegrationForm
      isEdit={isEdit}
      integrationId={id ?? ""}
      initialValues={detail.data ? toFormValues(detail.data) : emptyIntegrationForm}
    />
  );
}

function IntegrationForm({
  isEdit,
  integrationId,
  initialValues,
}: {
  isEdit: boolean;
  integrationId: string;
  initialValues: IntegrationFormValues;
}) {
  const navigate = useNavigate();
  const createMutation = useCreateIntegration();
  const updateMutation = useUpdateIntegration(integrationId);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: initialValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        const patch = buildPatchPayload(initialValues, values);

        if (Object.keys(patch).length === 0) {
          toast.message("Nenhuma alteração para salvar.");
          return;
        }

        await updateMutation.mutateAsync(patch);
        toast.success("Integração atualizada.");
      } else {
        await createMutation.mutateAsync(buildCreatePayload(values));
        toast.success("Integração criada.");
      }
      await navigate("/integrations");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar a integração.");
    }
  });

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
