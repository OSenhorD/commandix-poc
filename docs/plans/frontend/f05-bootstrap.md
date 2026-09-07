# F05 — Bootstrap: cadastro de tenant + admin

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

**Arquivos:**
- Modificar: `src/features/auth/pages/bootstrap.tsx`

**Interfaces:**
- Consome: `bootstrapSchema`, `BootstrapFormValues` (F04); `useAuth().bootstrap` (F03)
- Produz: nada consumido por entregas seguintes

> `POST /tenants/bootstrap` tem rate limit de **5 requisições / 60s por IP** → `429`. A tela precisa mostrar essa mensagem em vez de um erro genérico. `409` acontece quando `tenantSlug` ou `adminEmail` já existem — esse erro vai para o campo correspondente.

- [ ] **Passo 1: Escrever `src/features/auth/pages/bootstrap.tsx`**

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/shared/api/errors";

import { bootstrapSchema, type BootstrapFormValues } from "../schemas";
import { useAuth } from "../use-auth";

export function BootstrapPage() {
  const { user, bootstrap } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BootstrapFormValues>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: { tenantName: "", tenantSlug: "", adminEmail: "", adminPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await bootstrap(values);
      await navigate("/integrations", { replace: true });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Não foi possível concluir o cadastro. Tente novamente.");
        return;
      }
      if (error.status === 429) {
        setFormError("Muitas tentativas seguidas. Aguarde um minuto e tente de novo.");
        return;
      }
      if (error.status === 409) {
        const field = error.message.toLowerCase().includes("email") ? "adminEmail" : "tenantSlug";
        setError(field, { message: error.message });
        return;
      }
      setFormError(error.message);
    }
  });

  if (user) return <Navigate to="/integrations" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cadastrar empresa</CardTitle>
          <CardDescription>Cria o tenant e o primeiro usuário administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)} noValidate>
            <Field>
              <FieldLabel htmlFor="tenantName">Nome da empresa</FieldLabel>
              <Input id="tenantName" {...register("tenantName")} />
              <FieldError errors={[errors.tenantName]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="tenantSlug">Identificador</FieldLabel>
              <Input id="tenantSlug" placeholder="acme" {...register("tenantSlug")} />
              <FieldDescription>Letras minúsculas, números e hífens. Único no sistema.</FieldDescription>
              <FieldError errors={[errors.tenantSlug]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="adminEmail">Email do administrador</FieldLabel>
              <Input id="adminEmail" type="email" autoComplete="email" {...register("adminEmail")} />
              <FieldError errors={[errors.adminEmail]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="adminPassword">Senha</FieldLabel>
              <Input id="adminPassword" type="password" autoComplete="new-password" {...register("adminPassword")} />
              <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
              <FieldError errors={[errors.adminPassword]} />
            </Field>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Criar empresa
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="underline">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Passo 2: Testar no browser**

| Ação | Esperado |
|------|----------|
| Cadastro válido (slug novo) | Cria o tenant, loga automaticamente e vai para `/integrations` |
| Slug `acme` (já existe no seed) | Erro `409` no campo "Identificador" |
| Slug `Acme Corp` | Erro do zod antes da chamada HTTP |
| Senha com 5 caracteres | Erro do zod ("ao menos 8 caracteres") |
| 6 tentativas seguidas | Mensagem de rate limit (`429`) |

- [ ] **Passo 3: Lint, typecheck e testes**

**Critério de done F05:**

- [ ] Cadastro cria tenant + admin e já entra logado
- [ ] `409` cai no campo certo; `429` mostra mensagem de rate limit
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F05** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md)

---

