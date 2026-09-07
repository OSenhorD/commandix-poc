# F06 — Shell da aplicação e componentes compartilhados

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

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
- [ ] Marcar **F06** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md)

---

