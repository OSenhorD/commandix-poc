# Plano de Implementação — Frontend (Nexus)

> **Para agentes:** usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar entrega por entrega. Os passos usam checkbox (`- [ ]`).

**Objetivo:** entregar a SPA React do Commandix com o fluxo completo do protótipo — login/logout, bootstrap de tenant, CRUD de integrações, disparo manual e histórico de execuções — consumindo a API NestJS em `/api/v1`, com isolamento de papéis (ADMIN/VIEWER) na UI.

**Já entregue (não reimplementar):** F01 ambiente (deps, Vitest, proxy Vite, serviço `frontend` no compose de desenvolvimento), F02 cliente HTTP (`apiFetch` + refresh single-flight + storage + tipos), F03 sessão e rotas (`AuthProvider`, `ProtectedRoute`, `RoleGate`, placeholders das páginas). Relatórios em `.superpowers/sdd/frontend/`.

**Restante neste plano:** F04–F12.

**Arquitetura:** SPA feature-sliced. `shared/api/client.ts` centraliza o `fetch` (Bearer + refresh single-flight); TanStack Query cuida de cache, paginação e invalidação; React Router 7 protege rotas por autenticação e papel; react-hook-form + zod validam formulários espelhando os DTOs `class-validator` do backend. Paginação e filtros vivem na URL, e a query key deriva dela.

**Stack:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 (CSS-first) · shadcn estilo `base-lyra` sobre `@base-ui/react` · lucide-react · React Router 7 · TanStack Query v5 · react-hook-form + zod · ESLint 10 · Vitest + Testing Library.

**Spec:**
- Contrato da API: [`docs/spec/05-api.md`](../spec/05-api.md)
- Escopo funcional: [`docs/spec/02-escopo-funcional.md`](../spec/02-escopo-funcional.md)
- Stack: [`docs/spec/06-stack.md`](../spec/06-stack.md) §6.2
- Infra: [`docs/spec/08-docker.md`](../spec/08-docker.md) §8.1, §8.2, §8.6, §8.7
- Padrões e armadilhas: [`.agents/rules/react-frontend.mdc`](../../.agents/rules/react-frontend.mdc)
- Decisões: [`AGENTS.md`](../../AGENTS.md)

---

## Restrições globais

Valem para **todas** as entregas:

| Restrição | Valor |
|-----------|-------|
| Node | `24.16.0` (`engines` já fixado em `nexus-frontend/package.json`) |
| Execução | **Tudo dentro de container.** Nada de `npm` no host — a partir de F01 existe o serviço `frontend` no compose de desenvolvimento |
| Versões | Sempre a última estável de cada dependência (`npm install <pkg>` sem pin) |
| TypeScript | Estrito, **sem `any`**; ESLint roda `strictTypeChecked` — `Promise` flutuante e `any` implícito quebram o lint |
| Imports | Alias `@/` → `src/`, **sem** sufixo `.js` (isso é regra do backend, não do Vite) |
| Estilo | Aspas duplas; Prettier de `nexus-frontend/.prettierrc` (`printWidth: 120`) — isolado do backend |
| Tailwind | CSS-first em `src/index.css` — **nunca** criar `tailwind.config.js` |
| Componentes | shadcn estilo `base-lyra` sobre **Base UI**; **nunca** importar Radix |
| `components/ui/` | Fica em `@/components/ui` — `components.json` fixa o alias; mover quebra o `shadcn add` |
| Idioma | Código e nomes em **inglês**; textos de UI e documentação em **português** |
| Commits | **Só quando o usuário pedir** (`AGENTS.md`). Cada entrega termina em ponto commitável, mas não commite por conta própria |
| Ao concluir uma entrega | Marcar o item em [`docs/spec/11-checklist.md`](../spec/11-checklist.md) Fase 5 **e** o "Critério de done" aqui |
| Ao observar algo fora do escopo | Registrar em `docs/todo/<slug>.md` sem bloquear a entrega |

**Atalho de comando** — todos os comandos de verificação usam o compose de desenvolvimento:

```bash
# a partir da raiz do monorepo
alias dc='docker compose -f docker/development/docker-compose.yml --project-directory .'

dc exec frontend npm run lint
dc exec frontend npm test
dc exec frontend npx tsc -b
```

### Armadilhas do contrato (não negociáveis)

| Regra | Origem |
|-------|--------|
| `authKey` volta **mascarada** (`****-key`) — nunca pré-preencher no form de edição | [05-api §5.3](../spec/05-api.md#53-integrations) |
| `PATCH {}` vazio → `400`; enviar só campos alterados | [05-api §5.3](../spec/05-api.md#patch-integrationsid) |
| `customHeaders`/`defaultPayload` no PATCH **substituem** o objeto inteiro | [05-api §5.3](../spec/05-api.md#patch-integrationsid) |
| Trigger em integração inativa → **`400`**, não 404 | [05-api §5.3](../spec/05-api.md#post-integrationsidtrigger) |
| Cross-tenant → **`404`** | [05-api §5.5](../spec/05-api.md#55-códigos-de-erro-padrão) |
| `DELETE` e `POST /auth/logout` → **`204` sem body** | [05-api §5.2](../spec/05-api.md#52-auth), [§5.3](../spec/05-api.md#delete-integrationsid) |
| Listagem de integrações **omite** `customHeaders`/`defaultPayload` | [05-api §5.3](../spec/05-api.md#get-integrations) |
| Erro do Nest: `message` vem `string` **ou** `string[]` | `ValidationPipe` global |
| `responseBody` pode terminar em `… [truncated]` (10 240 bytes) | [05-api §5.4](../spec/05-api.md#truncamento-de-responsebody) |

---

## Mapa de arquivos (restante)

**Já no repositório (F01–F03):** `docker/development/Dockerfile`, `vite.config.ts`, `src/test/setup.ts`, `src/vite-env.d.ts`, `shared/types/api.ts`, `shared/lib/storage.ts`, `shared/api/{errors,client,query-client}.ts`, `app/{providers,router,protected-route,not-found}.tsx`, `shared/components/role-gate.tsx`, `features/auth/{api,auth-context,auth-provider,use-auth}` e placeholders das páginas F04–F11. Serviço `frontend` no compose de **desenvolvimento**.

| Arquivo | Responsabilidade | Entrega |
|---------|------------------|---------|
| `src/features/auth/schemas.ts` | zod de login e bootstrap | F04/F05 |
| `src/features/auth/pages/login.tsx` | Tela de login (hoje placeholder) | F04 |
| `src/features/auth/pages/bootstrap.tsx` | Tela de bootstrap (hoje placeholder) | F05 |
| `src/components/layout/app-shell.tsx` | Topbar + `<Outlet/>` | F06 |
| `src/components/layout/user-menu.tsx` | Email, papel, tema, sair | F06 |
| `src/shared/lib/theme.ts` + `src/shared/hooks/use-theme.ts` | Tema claro/escuro | F06 |
| `src/shared/components/data-table.tsx` | Tabela genérica com colunas declarativas | F06 |
| `src/shared/components/pagination-bar.tsx` | Paginação ligada ao `meta` | F06 |
| `src/shared/components/{empty-state,error-state}.tsx` | Estados vazio e de erro | F06 |
| `src/shared/lib/{format,query-string}.ts` | Datas (`Intl`), duração, query string | F06 |
| `src/shared/hooks/use-list-params.ts` | Paginação/filtros na URL | F06 |
| `src/features/integrations/api.ts` | Chamadas de integrações | F07 |
| `src/features/integrations/hooks.ts` | Queries e mutations | F07 |
| `src/features/integrations/pages/list.tsx` | Listagem (hoje placeholder) | F07 |
| `src/features/integrations/components/*` | Badges, form, diálogos | F07–F09 |
| `src/features/integrations/schemas.ts` | zod do formulário + `buildPatchPayload` | F08 |
| `src/shared/components/json-field.tsx` | Campo JSON com validação | F08 |
| `src/features/executions/*` | Histórico e detalhe | F10–F11 |
| `nexus-frontend/docker/production/{Dockerfile,nginx.conf}` | Build estático + proxy | F12 |
| `docker/production/docker-compose.yml` | Serviço `frontend` de produção | F12 |
| `.github/workflows/ci.yml` | Job `frontend` | F12 |

---

## F04 — Login, logout e reidratação de sessão

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
- [ ] Marcar **F04** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F05 — Bootstrap: cadastro de tenant + admin

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
- [ ] Marcar **F05** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F06 — Shell da aplicação e componentes compartilhados

**Arquivos:**
- Criar: `src/components/layout/app-shell.tsx`, `src/components/layout/user-menu.tsx`, `src/shared/lib/theme.ts`, `src/shared/hooks/use-theme.ts`, `src/shared/hooks/use-list-params.ts`, `src/shared/lib/format.ts`, `src/shared/lib/query-string.ts`, `src/shared/components/data-table.tsx`, `src/shared/components/pagination-bar.tsx`, `src/shared/components/empty-state.tsx`, `src/shared/components/error-state.tsx`
- Modificar: `src/app/router.tsx`, `src/app/providers.tsx`, `src/features/integrations/pages/list.tsx` (remove o botão temporário de sair)
- Adicionar (shadcn): `table`, `select`, `dialog`, `alert-dialog`, `dropdown-menu`, `separator`, `sonner`

**Interfaces:**
- Consome: `useAuth` (F03)
- Produz:
  - `<AppShell/>` — layout route com topbar e `<Outlet/>`
  - `DataTable<T>({ columns, rows, rowKey, isLoading })` com `Column<T> = { key, header, cell, className? }`
  - `<PaginationBar meta onPageChange />`, `<EmptyState title description action />`, `<ErrorState error onRetry />`
  - `useListParams(): { searchParams, page, limit, setPage, setParam }`
  - `formatDateTime(iso)`, `formatDuration(ms)`, `buildQuery(params)`

> **Desvio consciente:** a paginação usa botões (`PaginationBar`), não o `components/ui/pagination.tsx` já instalado — aquele componente é baseado em links (`<a href>`) e aqui o estado vive em query params controlados pelo router.

- [ ] **Passo 1: Adicionar os componentes shadcn**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend \
  npx shadcn add table select dialog alert-dialog dropdown-menu separator sonner
```

APIs geradas (estilo `base-lyra`): `Table/TableHeader/TableBody/TableHead/TableRow/TableCell`, `Select/SelectTrigger/SelectValue/SelectContent/SelectItem`, `Dialog/DialogTrigger/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter/DialogClose`, `AlertDialog/AlertDialogTrigger/AlertDialogContent/AlertDialogHeader/AlertDialogTitle/AlertDialogDescription/AlertDialogFooter/AlertDialogAction/AlertDialogCancel`, `DropdownMenu/DropdownMenuTrigger/DropdownMenuContent/DropdownMenuItem/DropdownMenuLabel/DropdownMenuSeparator`, `Toaster` (de `@/components/ui/sonner`).

> **Dois ajustes obrigatórios depois do `shadcn add`, confirmados na fonte real do registry `base-lyra` (não é hipótese):**
>
> 1. **`sonner.tsx` importa `useTheme` de `next-themes`** — uma lib de tema do Next.js que **não faz parte da nossa stack** e não está em nenhuma decisão do `AGENTS.md`. Editar o arquivo gerado: remover `import { useTheme } from "next-themes"` e a linha `const { theme = "system" } = useTheme()`; passar `theme="system"` fixo na própria definição do componente (`<Sonner theme="system" .../>`). O Sonner já resolve `"system"` sozinho via `prefers-color-scheme`, sem precisar de `next-themes` nem do nosso `useTheme` (F06 Passo 8) — os dois ficam desacoplados de propósito, para não duplicar estado entre o menu do usuário e o Toaster.
> 2. **`select.tsx`, `dialog.tsx`, `alert-dialog.tsx` e `dropdown-menu.tsx` usam `<IconPlaceholder lucide="NomeDoIcone" .../>`**, importado de `@/app/(create)/components/icon-placeholder` — um helper interno do site de documentação do shadcn (multi-biblioteca de ícones), **não** um registryDependency de verdade. Se o `shadcn add` não resolver isso sozinho (import quebrado apontando pra `@/app/(create)/...`), a correção é mecânica: trocar cada `<IconPlaceholder lucide="XIcon" className="..." />` por `<XIcon className="..." />` importado direto de `"lucide-react"` — o valor de `lucide="..."` já é o nome exato do ícone em `lucide-react` (`iconLibrary` do `components.json` é `"lucide"`).

- [ ] **Passo 2: Criar `src/shared/lib/format.ts`**

```typescript
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

/** A API devolve timestamps ISO em UTC; aqui viram horário local do navegador. */
export function formatDateTime(isoString: string): string {
  return dateTimeFormatter.format(new Date(isoString));
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${String(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}
```

- [ ] **Passo 3: Criar `src/shared/lib/query-string.ts`**

```typescript
export type QueryValue = string | number | boolean | undefined;

export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}
```

- [ ] **Passo 4: Criar `src/shared/hooks/use-list-params.ts`**

```typescript
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_LIMIT = 20;

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Paginação e filtros vivem na URL — sobrevivem ao reload e o link é compartilhável. */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
        // Mudar filtro sempre volta para a primeira página.
        if (key !== "page") next.delete("page");
        return next;
      });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      setParam("page", String(page));
    },
    [setParam],
  );

  return {
    searchParams,
    page: positiveInt(searchParams.get("page"), 1),
    limit: positiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
    setParam,
    setPage,
  };
}
```

- [ ] **Passo 5: Criar `src/shared/components/data-table.tsx`**

```tsx
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading = false, skeletonRows = 5 }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <TableRow key={`skeleton-${String(index)}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Passo 6: Criar `src/shared/components/pagination-bar.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/shared/types/api";

export function PaginationBar({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm text-muted-foreground">
      <span>
        {meta.total === 0
          ? "Nenhum registro"
          : `Página ${String(meta.page)} de ${String(meta.totalPages)} · ${String(meta.total)} registro(s)`}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!meta.hasPreviousPage}
          onClick={() => {
            onPageChange(meta.page - 1);
          }}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => {
            onPageChange(meta.page + 1);
          }}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Passo 7: Criar `src/shared/components/empty-state.tsx` e `error-state.tsx`**

```tsx
// empty-state.tsx
import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
```

```tsx
// error-state.tsx
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/errors";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Não foi possível carregar os dados.";

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 p-12 text-center">
      <p role="alert" className="font-medium text-destructive">
        {message}
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
```

- [ ] **Passo 8: Criar o tema — `src/shared/lib/theme.ts` e `src/shared/hooks/use-theme.ts`**

O `src/index.css` já traz as paletas `:root` e `.dark` e o `@custom-variant dark`.

```typescript
// theme.ts
export type Theme = "light" | "dark";

const STORAGE_KEY = "nexus.theme";

export function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}
```

```typescript
// use-theme.ts
import { useCallback, useEffect, useState } from "react";

import { applyTheme, resolveInitialTheme, type Theme } from "@/shared/lib/theme";

/** Usado só pelo menu do usuário — não há segundo consumidor, então não precisa de contexto. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
```

- [ ] **Passo 9: Criar `src/components/layout/user-menu.tsx`**

```tsx
import { LogOut, Moon, Sun, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/use-auth";
import { useTheme } from "@/shared/hooks/use-theme";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    await navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <User className="size-4" />
        {user.email}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          Sessão
          <Badge variant="secondary">{user.role}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggle}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleLogout()}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

> Base UI usa a prop `render` para compor gatilhos (equivalente ao `asChild` do Radix). Se o `DropdownMenuTrigger` gerado no seu `components/ui/dropdown-menu.tsx` não aceitar `render`, use `<DropdownMenuTrigger><Button …/></DropdownMenuTrigger>` e confira o arquivo gerado antes de assumir a API.

- [ ] **Passo 10: Criar `src/components/layout/app-shell.tsx`**

```tsx
import { Link, Outlet } from "react-router-dom";

import { UserMenu } from "./user-menu";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/integrations" className="text-base font-semibold">
            Nexus
          </Link>
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Passo 11: Colocar o `AppShell` como layout das rotas protegidas em `src/app/router.tsx`**

```tsx
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Navigate to="/integrations" replace /> },
          { path: "/integrations", element: <IntegrationsListPage /> },
          { path: "/integrations/:id/executions", element: <ExecutionsListPage /> },
          { path: "/executions/:id", element: <ExecutionDetailPage /> },
          {
            element: <ProtectedRoute roles={["ADMIN"]} />,
            children: [
              { path: "/integrations/new", element: <IntegrationFormPage /> },
              { path: "/integrations/:id/edit", element: <IntegrationFormPage /> },
            ],
          },
        ],
      },
    ],
  },
```

- [ ] **Passo 12: Adicionar o `Toaster` em `src/app/providers.tsx`**

```tsx
import { Toaster } from "@/components/ui/sonner";
```

```tsx
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </AuthProvider>
```

- [ ] **Passo 13: Remover o botão temporário de sair de `src/features/integrations/pages/list.tsx`**

Volta a ser o placeholder simples — a listagem real chega em F07.

- [ ] **Passo 14: Verificar no browser**

Topbar com "Nexus" e o menu do usuário; alternar o tema muda a paleta e sobrevive ao reload; "Sair" volta para `/login`. Rodar lint, typecheck e testes.

**Critério de done F06:**

- [ ] Shell aparece em todas as rotas autenticadas e some em `/login` e `/bootstrap`
- [ ] Menu do usuário mostra email + papel, alterna tema e faz logout
- [ ] `DataTable`, `PaginationBar`, `EmptyState`, `ErrorState` compilam e são exportados
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F06** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F07 — Integrações: listagem com filtro e paginação

**Arquivos:**
- Criar: `src/features/integrations/api.ts`, `src/features/integrations/hooks.ts`, `src/features/integrations/components/integration-type-badge.tsx`
- Modificar: `src/features/integrations/pages/list.tsx`

**Interfaces:**
- Consome: `apiFetch` (F02), `useListParams`, `DataTable`, `PaginationBar`, `EmptyState`, `ErrorState`, `formatDateTime`, `buildQuery` (F06), `RoleGate` (F03)
- Produz:
  - `listIntegrations`, `getIntegration`, `createIntegration`, `updateIntegration`, `deleteIntegration`, `triggerIntegration`
  - Tipos `ListIntegrationsParams`, `CreateIntegrationInput`, `UpdateIntegrationInput`
  - `integrationKeys` (chaves do TanStack Query) e os hooks `useIntegrations(params)` e `useIntegration(id)`

- [ ] **Passo 1: Criar `src/features/integrations/api.ts`**

```typescript
import { apiFetch } from "@/shared/api/client";
import { buildQuery } from "@/shared/lib/query-string";
import type { Execution, Integration, IntegrationListItem, IntegrationType, Paginated } from "@/shared/types/api";

export interface ListIntegrationsParams {
  page: number;
  limit: number;
  isActive?: boolean;
}

export interface CreateIntegrationInput {
  name: string;
  type: IntegrationType;
  targetUrl: string;
  authKey?: string;
  customHeaders?: Record<string, string>;
  defaultPayload?: Record<string, unknown>;
  isActive?: boolean;
}

/** PATCH parcial: todo campo é opcional e só o enviado muda (05-api §5.3). */
export type UpdateIntegrationInput = Partial<CreateIntegrationInput>;

export function listIntegrations(params: ListIntegrationsParams): Promise<Paginated<IntegrationListItem>> {
  return apiFetch<Paginated<IntegrationListItem>>(`/integrations${buildQuery({ ...params })}`);
}

export function getIntegration(id: string): Promise<Integration> {
  return apiFetch<Integration>(`/integrations/${id}`);
}

export function createIntegration(input: CreateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>("/integrations", { method: "POST", body: input });
}

export function updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>(`/integrations/${id}`, { method: "PATCH", body: input });
}

/** Hard delete com cascade nas execuções. Responde 204. */
export function deleteIntegration(id: string): Promise<void> {
  // Sem <void> explícito: @typescript-eslint/no-invalid-void-type reprova void como
  // argumento de tipo em CallExpression (só isenta void em posição de tipo, ex. Promise<void>
  // como anotação). TypeScript já infere T = void contextualmente a partir do retorno
  // declarado da função — mesmo comportamento, sem o argumento de tipo. Achado em F03
  // (docs/todo/eslint-no-invalid-void-type-apifetch-generic.md), aplicado aqui de antemão.
  return apiFetch(`/integrations/${id}`, { method: "DELETE" });
}

/** Integração inativa → 400 (não 404). Payload opcional, merge shallow com defaultPayload. */
export function triggerIntegration(id: string, payload?: Record<string, unknown>): Promise<Execution> {
  return apiFetch<Execution>(`/integrations/${id}/trigger`, {
    method: "POST",
    body: payload === undefined ? {} : { payload },
  });
}
```

- [ ] **Passo 2: Criar `src/features/integrations/hooks.ts`**

```typescript
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getIntegration, listIntegrations, type ListIntegrationsParams } from "./api";

export const integrationKeys = {
  all: ["integrations"] as const,
  list: (params: ListIntegrationsParams) => ["integrations", params] as const,
  detail: (id: string) => ["integration", id] as const,
};

export function useIntegrations(params: ListIntegrationsParams) {
  return useQuery({
    queryKey: integrationKeys.list(params),
    queryFn: () => listIntegrations(params),
    // Evita o flash de skeleton ao trocar de página.
    placeholderData: keepPreviousData,
  });
}

export function useIntegration(id: string | undefined) {
  return useQuery({
    queryKey: integrationKeys.detail(id ?? ""),
    queryFn: () => getIntegration(id ?? ""),
    enabled: Boolean(id),
  });
}
```

- [ ] **Passo 3: Criar `src/features/integrations/components/integration-type-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { IntegrationType } from "@/shared/types/api";

const LABELS: Record<IntegrationType, string> = {
  WEBHOOK: "Webhook",
  REST_API: "REST API",
  N8N: "n8n",
};

export function IntegrationTypeBadge({ type }: { type: IntegrationType }) {
  return <Badge variant="outline">{LABELS[type]}</Badge>;
}
```

- [ ] **Passo 4: Escrever `src/features/integrations/pages/list.tsx`**

```tsx
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { PaginationBar } from "@/shared/components/pagination-bar";
import { RoleGate } from "@/shared/components/role-gate";
import { useListParams } from "@/shared/hooks/use-list-params";
import { formatDateTime } from "@/shared/lib/format";
import type { IntegrationListItem } from "@/shared/types/api";

import { IntegrationTypeBadge } from "../components/integration-type-badge";
import { useIntegrations } from "../hooks";

const ACTIVE_FILTER_ALL = "all";

export function IntegrationsListPage() {
  const { searchParams, page, limit, setParam, setPage } = useListParams();

  const activeFilter = searchParams.get("isActive") ?? ACTIVE_FILTER_ALL;
  const isActive = activeFilter === ACTIVE_FILTER_ALL ? undefined : activeFilter === "true";

  const { data, isPending, isError, error, refetch } = useIntegrations({ page, limit, isActive });

  const columns: Column<IntegrationListItem>[] = [
    { key: "name", header: "Nome", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Tipo", cell: (row) => <IntegrationTypeBadge type={row.type} /> },
    {
      key: "targetUrl",
      header: "URL de destino",
      cell: (row) => <span className="text-muted-foreground">{row.targetUrl}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Ativa" : "Inativa"}</Badge>,
    },
    { key: "updatedAt", header: "Atualizada em", cell: (row) => formatDateTime(row.updatedAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Button variant="ghost" size="sm" render={<Link to={`/integrations/${row.id}/executions`} />}>
          Histórico
        </Button>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Integrações</h1>
          <p className="text-sm text-muted-foreground">Serviços externos configurados para este tenant</p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={activeFilter}
            onValueChange={(value) => {
              setParam("isActive", value === ACTIVE_FILTER_ALL ? null : value);
            }}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTIVE_FILTER_ALL}>Todas</SelectItem>
              <SelectItem value="true">Somente ativas</SelectItem>
              <SelectItem value="false">Somente inativas</SelectItem>
            </SelectContent>
          </Select>

          <RoleGate role="ADMIN">
            <Button render={<Link to="/integrations/new" />}>
              <Plus className="size-4" />
              Nova integração
            </Button>
          </RoleGate>
        </div>
      </header>

      {isError ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : !isPending && data?.data.length === 0 ? (
        <EmptyState
          title="Nenhuma integração encontrada"
          description="Ajuste o filtro ou cadastre a primeira integração do tenant."
        />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.data ?? []} rowKey={(row) => row.id} isLoading={isPending} />
          {data ? <PaginationBar meta={data.meta} onPageChange={setPage} /> : null}
        </>
      )}
    </section>
  );
}
```

> `Button` do estilo `base-lyra` também usa a prop `render` para virar link. Se o componente gerado não tiver `render`, envolva com `<Link>` por fora do `<Button>`.

- [ ] **Passo 5: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Login como ADMIN | Vê a tabela e o botão "Nova integração" |
| Login como VIEWER | Vê a tabela **sem** "Nova integração" |
| Filtro "Somente inativas" | URL vira `?isActive=false` e a lista atualiza |
| Recarregar com o filtro na URL | Filtro continua aplicado |
| Trocar de página | URL vira `?page=2` sem piscar skeleton |
| Parar o container `api` e recarregar | `ErrorState` com botão "Tentar novamente" |

- [ ] **Passo 6: Lint, typecheck e testes**

**Critério de done F07:**

- [ ] Listagem paginada com filtro `isActive` refletido na URL
- [ ] "Nova integração" oculto para VIEWER
- [ ] Estados de carregando, vazio e erro funcionando
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F07** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F08 — Integrações: formulário de criação e edição

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
- [ ] Marcar **F08** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F09 — Integrações: ativar/desativar, excluir e disparar

**Arquivos:**
- Criar: `src/features/integrations/components/delete-integration-dialog.tsx`, `src/features/integrations/components/trigger-integration-dialog.tsx`
- Modificar: `src/features/integrations/hooks.ts`, `src/features/integrations/pages/list.tsx`

**Interfaces:**
- Consome: `deleteIntegration`, `triggerIntegration` (F07); `AlertDialog`, `Dialog`, `Switch`, `toast` (F06)
- Produz: `useDeleteIntegration()`, `useToggleIntegration()`, `useTriggerIntegration(id)`

> `POST /integrations/:id/trigger` em integração **inativa** responde **`400`** e **não registra execução**. A UI desabilita a ação quando `isActive: false` e explica o motivo — o `400` da API é a segunda linha de defesa, tratada com toast.

- [ ] **Passo 1: Adicionar as mutations em `src/features/integrations/hooks.ts`**

```typescript
export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
    },
  });
}

/** Ativar/desativar é um PATCH parcial com um campo só. */
export function useToggleIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateIntegration(id, { isActive }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      void queryClient.invalidateQueries({ queryKey: integrationKeys.detail(variables.id) });
    },
  });
}

export function useTriggerIntegration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: Record<string, unknown>) => triggerIntegration(id, payload),
    onSuccess: () => {
      // O histórico daquela integração passou a ter uma execução nova.
      void queryClient.invalidateQueries({ queryKey: ["executions", id] });
    },
  });
}
```

Adicionar `deleteIntegration` e `triggerIntegration` aos imports de `./api`.

- [ ] **Passo 2: Criar `src/features/integrations/components/delete-integration-dialog.tsx`**

```tsx
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/errors";
import type { IntegrationListItem } from "@/shared/types/api";

import { useDeleteIntegration } from "../hooks";

export function DeleteIntegrationDialog({ integration }: { integration: IntegrationListItem }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteIntegration();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(integration.id);
      toast.success("Integração excluída.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível excluir a integração.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" aria-label="Excluir" />}>
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{integration.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            A exclusão é permanente e apaga junto todo o histórico de execuções desta integração. Para preservar o
            histórico, prefira desativá-la.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Passo 3: Criar `src/features/integrations/components/trigger-integration-dialog.tsx`**

```tsx
import { Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/shared/api/errors";
import { formatDuration } from "@/shared/lib/format";
import type { Execution, IntegrationListItem } from "@/shared/types/api";

import { useTriggerIntegration } from "../hooks";

export function TriggerIntegrationDialog({ integration }: { integration: IntegrationListItem }) {
  const [open, setOpen] = useState(false);
  const [payloadText, setPayloadText] = useState("");
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [result, setResult] = useState<Execution | null>(null);

  const triggerMutation = useTriggerIntegration(integration.id);

  const handleTrigger = async () => {
    setPayloadError(null);
    setResult(null);

    let payload: Record<string, unknown> | undefined;
    const trimmed = payloadText.trim();

    if (trimmed !== "") {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("não é objeto");
        }
        payload = parsed as Record<string, unknown>;
      } catch {
        setPayloadError("Informe um objeto JSON válido.");
        return;
      }
    }

    try {
      setResult(await triggerMutation.mutateAsync(payload));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível disparar a integração.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          setPayloadError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label="Disparar"
            disabled={!integration.isActive}
            title={integration.isActive ? "Disparar integração" : "Integração inativa — ative antes de disparar"}
          />
        }
      >
        <Play className="size-4" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disparar “{integration.name}”</DialogTitle>
          <DialogDescription>
            Payload opcional, mesclado (shallow) com o payload padrão da integração.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder='{ "event": "order.created" }'
          value={payloadText}
          onChange={(event) => {
            setPayloadText(event.target.value);
          }}
        />
        {payloadError ? (
          <p role="alert" className="text-sm text-destructive">
            {payloadError}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={result.status === "SUCCESS" ? "default" : "destructive"}>{result.status}</Badge>
              <span className="text-muted-foreground">
                HTTP {result.httpStatusCode === null ? "—" : String(result.httpStatusCode)} ·{" "}
                {formatDuration(result.responseTimeMs)}
              </span>
            </div>
            <Link to={`/executions/${result.id}`} className="underline">
              Ver detalhe da execução
            </Link>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            disabled={triggerMutation.isPending}
            onClick={() => {
              void handleTrigger();
            }}
          >
            {triggerMutation.isPending ? <Spinner /> : null}
            Disparar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Passo 4: Montar a coluna de ações em `src/features/integrations/pages/list.tsx`**

Imports novos no arquivo:

```tsx
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/shared/api/errors";

import { DeleteIntegrationDialog } from "../components/delete-integration-dialog";
import { TriggerIntegrationDialog } from "../components/trigger-integration-dialog";
import { useIntegrations, useToggleIntegration } from "../hooks";
```

Substituir a coluna `actions` e trocar a coluna `isActive` por um `Switch` controlado (`toggleMutation` fica no corpo do componente, antes do array `columns`):

```tsx
  const toggleMutation = useToggleIntegration();

  const columns: Column<IntegrationListItem>[] = [
    // … name, type, targetUrl …
    {
      key: "isActive",
      header: "Ativa",
      cell: (row) => (
        <RoleGate role="ADMIN">
          <Switch
            checked={row.isActive}
            disabled={toggleMutation.isPending}
            aria-label={row.isActive ? "Desativar integração" : "Ativar integração"}
            onCheckedChange={(checked) => {
              toggleMutation.mutate(
                { id: row.id, isActive: checked },
                {
                  onSuccess: () => {
                    toast.success(checked ? "Integração ativada." : "Integração desativada.");
                  },
                  onError: (error) => {
                    toast.error(error instanceof ApiError ? error.message : "Não foi possível alterar o status.");
                  },
                },
              );
            }}
          />
        </RoleGate>
      ),
    },
    { key: "updatedAt", header: "Atualizada em", cell: (row) => formatDateTime(row.updatedAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" render={<Link to={`/integrations/${row.id}/executions`} />}>
            Histórico
          </Button>
          <RoleGate role="ADMIN">
            <Button variant="ghost" size="sm" render={<Link to={`/integrations/${row.id}/edit`} />}>
              Editar
            </Button>
          </RoleGate>
          <RoleGate role="ADMIN">
            <TriggerIntegrationDialog integration={row} />
          </RoleGate>
          <RoleGate role="ADMIN">
            <DeleteIntegrationDialog integration={row} />
          </RoleGate>
        </div>
      ),
    },
  ];
```

> Para o VIEWER, a coluna "Ativa" fica vazia (o `RoleGate` some com o switch). Se preferir mostrar o estado em texto para o VIEWER, coloque o `Badge` de F07 como fallback fora do `RoleGate`.

- [ ] **Passo 5: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Alternar o switch | Toast + lista atualizada sem reload |
| Desativar e tentar disparar | Botão de disparo desabilitado com tooltip explicando |
| Disparar integração ativa (URL válida) | Resultado com badge `SUCCESS`, status HTTP e tempo; link para o detalhe |
| Disparar com `targetUrl` inexistente | Badge `FAILURE`, HTTP `—` (a API grava `httpStatusCode: null`) |
| Disparar com payload `{` | Erro de JSON antes de qualquer requisição |
| Excluir | Diálogo alerta sobre o cascade; após confirmar, some da lista |
| VIEWER | Não vê switch, editar, disparar nem excluir — só "Histórico" |

- [ ] **Passo 6: Lint, typecheck e testes**

**Critério de done F09:**

- [ ] Ativar/desativar via `PATCH { isActive }` com feedback em toast
- [ ] Disparo com payload opcional mostrando resultado e link para o detalhe
- [ ] Disparo bloqueado na UI quando inativa; `400` da API tratado em toast
- [ ] Exclusão com confirmação que menciona o cascade das execuções
- [ ] VIEWER sem nenhuma ação de escrita visível
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F09** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F10 — Histórico: listagem de execuções com filtros

**Arquivos:**
- Criar: `src/features/executions/api.ts`, `src/features/executions/hooks.ts`, `src/features/executions/components/execution-status-badge.tsx`, `src/features/executions/components/execution-filters.tsx`
- Modificar: `src/features/executions/pages/list.tsx`

**Interfaces:**
- Consome: `apiFetch`, `buildQuery`, `useListParams`, `DataTable`, `PaginationBar`, `EmptyState`, `ErrorState`, `formatDateTime`, `formatDuration`, `useIntegration` (F07)
- Produz:
  - `listExecutions(integrationId, params)`, `getExecution(id)`
  - `ListExecutionsParams = { page; limit; status?; from?; to? }`
  - `executionKeys`, `useExecutions(integrationId, params)`, `useExecution(id)`
  - `<ExecutionStatusBadge status />`

> **Datas:** os campos usam `<input type="date">`, que produz `YYYY-MM-DD` — exatamente o atalho date-only que a API aceita (`from` = início do dia UTC, `to` = fim do dia UTC, ambos **inclusive**). `from > to` devolve `400`; a UI barra antes de chamar.
>
> **Chaves:** `executionKeys.list` começa com `["executions", integrationId, …]`, então a invalidação `["executions", id]` feita pelo disparo (F09) casa por prefixo.

- [ ] **Passo 1: Criar `src/features/executions/api.ts`**

```typescript
import { apiFetch } from "@/shared/api/client";
import { buildQuery } from "@/shared/lib/query-string";
import type { Execution, ExecutionListItem, ExecutionStatus, Paginated } from "@/shared/types/api";

export interface ListExecutionsParams {
  page: number;
  limit: number;
  status?: ExecutionStatus;
  /** ISO 8601 ou YYYY-MM-DD (dia inteiro em UTC). Inclusive. */
  from?: string;
  to?: string;
}

export function listExecutions(
  integrationId: string,
  params: ListExecutionsParams,
): Promise<Paginated<ExecutionListItem>> {
  return apiFetch<Paginated<ExecutionListItem>>(`/integrations/${integrationId}/executions${buildQuery({ ...params })}`);
}

export function getExecution(id: string): Promise<Execution> {
  return apiFetch<Execution>(`/executions/${id}`);
}
```

- [ ] **Passo 2: Criar `src/features/executions/hooks.ts`**

```typescript
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getExecution, listExecutions, type ListExecutionsParams } from "./api";

export const executionKeys = {
  all: ["executions"] as const,
  list: (integrationId: string, params: ListExecutionsParams) => ["executions", integrationId, params] as const,
  detail: (id: string) => ["execution", id] as const,
};

export function useExecutions(integrationId: string, params: ListExecutionsParams, enabled = true) {
  return useQuery({
    queryKey: executionKeys.list(integrationId, params),
    queryFn: () => listExecutions(integrationId, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useExecution(id: string | undefined) {
  return useQuery({
    queryKey: executionKeys.detail(id ?? ""),
    queryFn: () => getExecution(id ?? ""),
    enabled: Boolean(id),
  });
}
```

- [ ] **Passo 3: Criar `src/features/executions/components/execution-status-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { ExecutionStatus } from "@/shared/types/api";

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  return <Badge variant={status === "SUCCESS" ? "default" : "destructive"}>{status === "SUCCESS" ? "Sucesso" : "Falha"}</Badge>;
}
```

- [ ] **Passo 4: Criar `src/features/executions/components/execution-filters.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_ALL = "all";

interface ExecutionFiltersProps {
  status: string;
  from: string;
  to: string;
  rangeError: string | null;
  onChange: (key: "status" | "from" | "to", value: string | null) => void;
  onClear: () => void;
}

export function ExecutionFilters({ status, from, to, rangeError, onChange, onClear }: ExecutionFiltersProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-44">
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <Select
            value={status}
            onValueChange={(value) => {
              onChange("status", value === STATUS_ALL ? null : value);
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>Todos</SelectItem>
              <SelectItem value="SUCCESS">Sucesso</SelectItem>
              <SelectItem value="FAILURE">Falha</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-44">
          <FieldLabel htmlFor="from">De</FieldLabel>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(event) => {
              onChange("from", event.target.value);
            }}
          />
        </Field>

        <Field className="w-44">
          <FieldLabel htmlFor="to">Até</FieldLabel>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(event) => {
              onChange("to", event.target.value);
            }}
          />
        </Field>

        <Button type="button" variant="ghost" onClick={onClear}>
          Limpar
        </Button>
      </div>

      {rangeError ? (
        <p role="alert" className="text-sm text-destructive">
          {rangeError}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Passo 5: Escrever `src/features/executions/pages/list.tsx`**

```tsx
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useIntegration } from "@/features/integrations/hooks";
import { DataTable, type Column } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { PaginationBar } from "@/shared/components/pagination-bar";
import { useListParams } from "@/shared/hooks/use-list-params";
import { formatDateTime, formatDuration } from "@/shared/lib/format";
import type { ExecutionListItem, ExecutionStatus } from "@/shared/types/api";

import { ExecutionFilters } from "../components/execution-filters";
import { ExecutionStatusBadge } from "../components/execution-status-badge";
import { useExecutions } from "../hooks";

export function ExecutionsListPage() {
  const { id: integrationId = "" } = useParams<{ id: string }>();
  const { searchParams, page, limit, setParam, setPage } = useListParams();

  const statusParam = searchParams.get("status") ?? "all";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  // A API devolve 400 para from > to — a UI barra antes de chamar.
  const rangeError = from !== "" && to !== "" && from > to ? "A data inicial não pode ser maior que a final." : null;

  const integration = useIntegration(integrationId);
  const executions = useExecutions(
    integrationId,
    {
      page,
      limit,
      status: statusParam === "all" ? undefined : (statusParam as ExecutionStatus),
      from: from === "" ? undefined : from,
      to: to === "" ? undefined : to,
    },
    rangeError === null,
  );

  const columns: Column<ExecutionListItem>[] = [
    { key: "executedAt", header: "Executada em", cell: (row) => formatDateTime(row.executedAt) },
    { key: "status", header: "Status", cell: (row) => <ExecutionStatusBadge status={row.status} /> },
    {
      key: "httpStatusCode",
      header: "HTTP",
      cell: (row) => (row.httpStatusCode === null ? "—" : String(row.httpStatusCode)),
    },
    { key: "responseTimeMs", header: "Duração", cell: (row) => formatDuration(row.responseTimeMs) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Button variant="ghost" size="sm" render={<Link to={`/executions/${row.id}`} />}>
          Detalhe
        </Button>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Button variant="ghost" size="sm" className="w-fit" render={<Link to="/integrations" />}>
          <ArrowLeft className="size-4" />
          Integrações
        </Button>
        <h1 className="text-xl font-semibold">Histórico · {integration.data?.name ?? "…"}</h1>
        <p className="text-sm text-muted-foreground">Execuções mais recentes primeiro</p>
      </header>

      <ExecutionFilters
        status={statusParam}
        from={from}
        to={to}
        rangeError={rangeError}
        onChange={setParam}
        onClear={() => {
          setParam("status", null);
          setParam("from", null);
          setParam("to", null);
        }}
      />

      {executions.isError ? (
        <ErrorState
          error={executions.error}
          onRetry={() => {
            void executions.refetch();
          }}
        />
      ) : !executions.isPending && executions.data?.data.length === 0 ? (
        <EmptyState
          title="Nenhuma execução encontrada"
          description="Dispare a integração ou ajuste os filtros de status e data."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={executions.data?.data ?? []}
            rowKey={(row) => row.id}
            isLoading={executions.isPending && rangeError === null}
          />
          {executions.data ? <PaginationBar meta={executions.data.meta} onPageChange={setPage} /> : null}
        </>
      )}
    </section>
  );
}
```

- [ ] **Passo 6: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Abrir "Histórico" de uma integração com disparos | Lista ordenada do mais recente para o mais antigo |
| Filtrar por "Falha" | URL vira `?status=FAILURE` e a lista reduz |
| `De` = hoje, `Até` = ontem | Mensagem de erro, **sem** requisição (aba Network) |
| Filtrar por um dia com execuções | Retorna o dia inteiro (UTC) |
| Disparar em outra aba e voltar | Após novo disparo, a lista reflete a execução nova (invalidação de F09) |
| VIEWER | Vê o histórico normalmente |

- [ ] **Passo 7: Lint, typecheck e testes**

**Critério de done F10:**

- [ ] Listagem paginada por integração, `executedAt DESC`
- [ ] Filtros `status`, `from` e `to` refletidos na URL e preservados no reload
- [ ] `from > to` bloqueado no cliente com mensagem
- [ ] Estados de carregando, vazio e erro funcionando
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F10** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F11 — Histórico: detalhe da execução

**Arquivos:**
- Criar: `src/shared/components/code-block.tsx`
- Modificar: `src/features/executions/pages/detail.tsx`

**Interfaces:**
- Consome: `useExecution` (F10), `ScrollArea` (já instalado), `formatDateTime`, `formatDuration`
- Produz: `<CodeBlock title content emptyLabel />`

> `responseBody` chega **já truncado** em 10 240 bytes, com o sufixo `… [truncated]`. A tela sinaliza isso — sem esse aviso o avaliador pode achar que a resposta veio incompleta por bug.

- [ ] **Passo 1: Criar `src/shared/components/code-block.tsx`**

```tsx
import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TRUNCATION_SUFFIX = "… [truncated]";

export function CodeBlock({ title, content, emptyLabel }: { title: string; content: string | null; emptyLabel: string }) {
  const [copied, setCopied] = useState(false);
  const isTruncated = content?.endsWith(TRUNCATION_SUFFIX) ?? false;

  const handleCopy = async () => {
    if (content === null) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {content === null ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Copiar ${title}`}
            onClick={() => {
              void handleCopy();
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        )}
      </header>

      {content === null ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ScrollArea className="max-h-80 rounded-md border">
          <pre className="p-3 font-mono text-xs whitespace-pre-wrap break-all">{content}</pre>
        </ScrollArea>
      )}

      {isTruncated ? (
        <p className="text-xs text-muted-foreground">
          Resposta truncada em 10 240 bytes pela API — o corpo original era maior.
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Passo 2: Escrever `src/features/executions/pages/detail.tsx`**

```tsx
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { CodeBlock } from "@/shared/components/code-block";
import { ErrorState } from "@/shared/components/error-state";
import { formatDateTime, formatDuration } from "@/shared/lib/format";

import { ExecutionStatusBadge } from "../components/execution-status-badge";
import { useExecution } from "../hooks";

export function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error, refetch } = useExecution(id);

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={<Link to={`/integrations/${data.integrationId}/executions`} />}
      >
        <ArrowLeft className="size-4" />
        Histórico da integração
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            Execução
            <ExecutionStatusBadge status={data.status} />
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Executada em</dt>
              <dd className="text-sm">{formatDateTime(data.executedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status HTTP</dt>
              <dd className="text-sm">{data.httpStatusCode === null ? "— (erro de rede ou timeout)" : String(data.httpStatusCode)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Duração</dt>
              <dd className="text-sm">{formatDuration(data.responseTimeMs)}</dd>
            </div>
          </dl>

          <Separator />

          <CodeBlock
            title="Payload enviado"
            content={data.requestPayload === null ? null : JSON.stringify(data.requestPayload, null, 2)}
            emptyLabel="Nenhum payload foi enviado neste disparo."
          />

          <CodeBlock
            title="Resposta"
            content={data.responseBody}
            emptyLabel="A API externa não devolveu corpo na resposta."
          />
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Passo 3: Verificar no browser**

| Ação | Esperado |
|------|----------|
| Abrir uma execução `SUCCESS` | Status, HTTP, duração, payload e resposta formatados |
| Abrir uma execução de timeout | `httpStatusCode` mostrado como "— (erro de rede ou timeout)" |
| Execução com resposta grande | Aviso de truncamento abaixo do bloco |
| Copiar | Ícone vira ✓ por ~1,5s |
| Trocar o `id` da URL por um UUID de outro tenant | `ErrorState` com a mensagem de 404 da API |

- [ ] **Passo 4: Lint, typecheck e testes**

**Critério de done F11:**

- [ ] Detalhe mostra `requestPayload` e `responseBody` legíveis
- [ ] Truncamento sinalizado quando presente
- [ ] Cross-tenant / id inexistente cai em `ErrorState` com a mensagem da API
- [ ] Lint, typecheck e testes verdes
- [ ] Marcar **F11** em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## F12 — Produção: Docker, nginx, CI e fechamento da documentação

**Arquivos:**
- Criar: `nexus-frontend/docker/production/Dockerfile`, `nexus-frontend/docker/production/nginx.conf`
- Modificar: `docker/production/docker-compose.yml`, `.github/workflows/ci.yml`, `readme.md`, `nexus-frontend/README.md`, `AGENTS.md`, `docs/spec/06-stack.md`, `docs/spec/11-checklist.md`, `docs/todo/openapi-nginx-proxy-assumption.md`

**Interfaces:**
- Consome: build de produção (`npm run build` → `dist/`)
- Produz: serviço `frontend` funcional no compose de produção e job `frontend` no CI

- [ ] **Passo 1: Criar `nexus-frontend/docker/production/Dockerfile`**

```dockerfile
FROM node:24.16.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.31-alpine AS runtime

COPY docker/production/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

- [ ] **Passo 2: Criar `nexus-frontend/docker/production/nginx.conf`**

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Todo o prefixo /api/ — não apenas /api/v1/ — para que /api/docs
  # e /api/openapi.json continuem acessíveis atrás do proxy.
  location /api/ {
    proxy_pass http://api:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Fallback do SPA: qualquer rota do React Router cai no index.html.
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Passo 3: Substituir o bloco comentado de `frontend` em `docker/production/docker-compose.yml`**

```yaml
  frontend:
    build:
      context: ./nexus-frontend
      dockerfile: docker/production/Dockerfile
      network: host
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-5173}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - commandix-production
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1/ || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

- [ ] **Passo 4: Subir o compose de produção e validar ponta a ponta**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . down
docker compose -f docker/production/docker-compose.yml --project-directory . up --build -d
docker compose -f docker/production/docker-compose.yml --project-directory . ps
```

| Verificação | Comando / ação | Esperado |
|-------------|----------------|----------|
| Frontend responde | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` | `200` |
| Rota do SPA (fallback) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/integrations` | `200` (não 404) |
| Proxy da API | `curl -s http://localhost:5173/api/v1/health` | `{"status":"ok"}` |
| Swagger atrás do proxy | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/api/openapi.json` | `200` |
| Fluxo completo | Navegar em http://localhost:5173 | Login com `admin@acme.com` / `Admin123!`, criar integração, disparar, ver histórico e detalhe |

- [ ] **Passo 5: Adicionar o job `frontend` em `.github/workflows/ci.yml`**

Depois do job `validate`:

```yaml
  frontend:
    name: Frontend lint, test & build
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: nexus-frontend

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24.16.0'
          cache: npm
          cache-dependency-path: nexus-frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Build
        run: npm run build
```

O `defaults.run.working-directory` do job sobrescreve o global (`nexus-backend`). `npm run build` já roda `tsc -b`, então não há passo separado de typecheck.

- [ ] **Passo 6: Atualizar a documentação**

O status de F01–F03 (dev compose, cliente HTTP, sessão, rotas) já está refletido nesses arquivos. F12 só fecha o que ainda falta:

| Arquivo | Mudança |
|---------|---------|
| [`docs/spec/11-checklist.md`](../spec/11-checklist.md) | Fase 1 — marcar Docker Compose (incluindo `frontend` de **produção**) como concluído; Fase 5 — marcar **F12** |
| [`docs/spec/06-stack.md`](../spec/06-stack.md) | §6.2 — telas e RHF/zod deixam de ser pendentes; §6.3 — `frontend` de produção deixa de ser parcial |
| [`docs/spec/08-docker.md`](../spec/08-docker.md) | §8.9 — job `frontend` deixa de ser "a criar" |
| [`readme.md`](../../readme.md) | Serviço `frontend` de produção; tabela de status; job `frontend` no CI |
| [`nexus-frontend/README.md`](../../nexus-frontend/README.md) | Remover o aviso de telas pendentes |
| [`AGENTS.md`](../../AGENTS.md) | "Estado atual" — `nexus-frontend/` passa a **Funcional**; Compose de produção inclui `frontend` |
| [`docs/todo/openapi-nginx-proxy-assumption.md`](../todo/openapi-nginx-proxy-assumption.md) | Encerrar: o nginx proxia todo `/api/` |

- [ ] **Passo 7: Validação final**

```bash
docker compose -f docker/production/docker-compose.yml --project-directory . down
docker compose -f docker/development/docker-compose.yml --project-directory . up --build -d
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run lint
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm test
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run build
```

**Critério de done F12:**

- [ ] `docker compose -f docker/production/docker-compose.yml --project-directory . up --build` sobe **database + api + frontend**
- [ ] Frontend em http://localhost:5173 com fluxo completo funcionando (login → integração → disparo → histórico → detalhe)
- [ ] Rotas do SPA acessadas direto pela URL respondem 200 (fallback do nginx)
- [ ] `/api/v1/health` e `/api/openapi.json` acessíveis pelo proxy
- [ ] Job `frontend` no CI passa (lint, testes, build)
- [ ] Documentação atualizada e `docs/todo/openapi-nginx-proxy-assumption.md` encerrado
- [ ] Marcar **F12** e o item de Compose da Fase 1 em [`docs/spec/11-checklist.md`](../spec/11-checklist.md)

---

## Ordem de execução

F01–F03 já estão no repositório. Próxima entrega: **F04**.

```
F04 login/logout ──▶ F05 bootstrap
F06 shell + componentes          ← independente de F04/F05
         │
         └──▶ F07 integrações (lista)
                   │
                   ├──▶ F08 formulário
                   ├──▶ F09 ações (toggle, excluir, disparar)
                   └──▶ F10 histórico ──▶ F11 detalhe
                                               │
                                               └──▶ F12 produção + CI + docs
```

**Paralelizável agora:** F04/F05 e F06 são independentes. F08, F09 e F10 dependem de F07 mas não entre si (F09 e F10 tocam arquivos diferentes; F09 só encosta na coluna de ações da lista, que F08 também edita — se forem em paralelo, F08 primeiro).

## Mapa entrega → verificação

| Entrega | Como se prova que funcionou |
|---------|------------------------------|
| F04 | Login + F5 mantém sessão; logout limpa o `localStorage` |
| F05 | Bootstrap cria tenant e já entra logado; `409` no campo certo |
| F06 | Shell + tema persistente; menu do usuário com papel |
| F07 | Filtro e página refletidos na URL; VIEWER sem "Nova integração" |
| F08 | PATCH só do que mudou; `authKey` em branco não é enviada (6 testes) |
| F09 | Disparo mostra resultado; inativa bloqueia; exclusão avisa do cascade |
| F10 | Filtros `status`/`from`/`to` na URL; `from > to` barrado no cliente |
| F11 | `requestPayload`/`responseBody` legíveis; truncamento sinalizado |
| F12 | `docker compose up` de produção com os três serviços; CI verde |

## Referências

| Tópico | Documento |
|--------|-----------|
| Contrato da API | [`docs/spec/05-api.md`](../spec/05-api.md) |
| Escopo funcional | [`docs/spec/02-escopo-funcional.md`](../spec/02-escopo-funcional.md) |
| Stack | [`docs/spec/06-stack.md`](../spec/06-stack.md) |
| Infra Docker | [`docs/spec/08-docker.md`](../spec/08-docker.md) |
| Checklist | [`docs/spec/11-checklist.md`](../spec/11-checklist.md) |
| Regras React | [`.agents/rules/react-frontend.mdc`](../../.agents/rules/react-frontend.mdc) |
| Decisões do projeto | [`AGENTS.md`](../../AGENTS.md) |
| Plano de testes (backend) | [`docs/plans/testes-criticos.md`](./testes-criticos.md) |
