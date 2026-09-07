import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/shared/api/errors";

import { loginSchema, type LoginFormValues } from "../schemas";
import { useAuth } from "../use-auth";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      await navigate("/integrations", { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Não foi possível entrar. Tente novamente.");
    }
  });

  if (user) return <Navigate to="/integrations" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar no Nexus</CardTitle>
          <CardDescription>Gestão de integrações multi-tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)} noValidate>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              <FieldError errors={[errors.password]} />
            </Field>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Entrar
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Primeira vez?{" "}
              <Link to="/bootstrap" className="underline">
                Cadastrar empresa
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
