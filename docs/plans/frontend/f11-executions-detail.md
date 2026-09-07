# F11 — Histórico: detalhe da execução

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

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
- [ ] Marcar **F11** em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md); atualizar [`docs/plans/frontend.md`](../frontend.md) (mover para "já entregue", tirar a linha da tabela); **apagar este arquivo**

---

