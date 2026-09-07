# F04 — Login, logout e reidratação de sessão

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

**Arquivos:**
- Criar: `src/features/auth/schemas.ts`
- Modificar: `src/features/auth/pages/login.tsx`, `src/features/integrations/pages/list.tsx` (botão de sair temporário)
- Adicionar (shadcn): `field`, `label`

**Interfaces:**
- Consome: `useAuth` (F03), `ApiError` (F02)
- Produz: `loginSchema`, `LoginFormValues`, `bootstrapSchema`, `BootstrapFormValues`

- [ ] **Passo 1: Adicionar os componentes de formulário do shadcn**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npx shadcn add field label
```

O estilo `base-lyra` expõe `Field`, `FieldLabel`, `FieldError`, `FieldDescription` (`FieldError` aceita `errors={[...]}` no formato do react-hook-form). **Não existe** componente `form` neste estilo — a integração com RHF é manual.

- [ ] **Passo 2: Criar `src/features/auth/schemas.ts`**

Regras idênticas às dos DTOs `class-validator` do backend (`login.dto.ts`, `bootstrap-tenant.dto.ts`).

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const bootstrapSchema = z.object({
  tenantName: z.string().trim().min(1, "Informe o nome da empresa"),
  tenantSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens"),
  adminEmail: z.email("Email inválido"),
  adminPassword: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
});

export type BootstrapFormValues = z.infer<typeof bootstrapSchema>;
```

- [ ] **Passo 3: Escrever `src/features/auth/pages/login.tsx`**

```tsx
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
```

- [ ] **Passo 4: Colocar um botão de sair temporário em `src/features/integrations/pages/list.tsx`**

Substituído pelo menu do usuário em F06 — existe só para exercitar o logout agora.

```tsx
import { Button } from "@/components/ui/button";

import { useAuth } from "@/features/auth/use-auth";

export function IntegrationsListPage() {
  const { user, logout } = useAuth();

  return (
    <main className="p-6">
      <p>
        Sessão: {user?.email} ({user?.role})
      </p>
      <Button type="button" onClick={() => void logout()}>
        Sair
      </Button>
    </main>
  );
}
```

- [ ] **Passo 5: Testar o fluxo no browser**

Com o Compose de desenvolvimento no ar (o seed cria os usuários demo):

| Ação | Esperado |
|------|----------|
| `admin@acme.com` / `Admin123!` | Entra e vai para `/integrations`, mostrando email e papel |
| Recarregar a página (F5) | Continua logado — `GET /auth/me` reidrata a sessão |
| Senha errada | Mensagem de erro da API abaixo do formulário, sem travar o botão |
| Email inválido | Erro de validação do zod, sem chamada HTTP (ver aba Network) |
| "Sair" | Volta para `/login`; `localStorage` sem `nexus.accessToken` |
| Voltar para `/integrations` após sair | Redireciona para `/login` |

- [ ] **Passo 6: Lint, typecheck e testes**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run lint
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npx tsc -b
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm test
```

**Critério de done F04:**

- [ ] Login com ADMIN e com VIEWER funciona e persiste após reload
- [ ] Erro de credencial aparece na tela com a mensagem da API
- [ ] Logout limpa o `localStorage` e volta para `/login`
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F04** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md); atualizar [`docs/plans/frontend.md`](../frontend.md) (mover para "já entregue", tirar a linha da tabela); **apagar este arquivo**

---

