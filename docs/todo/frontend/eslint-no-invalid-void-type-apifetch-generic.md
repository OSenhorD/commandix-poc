# `apiFetch<void>(...)` como argumento de tipo explícito reprova no ESLint

**Lado:** frontend
**Tipo:** erro

**Contexto:** percebido em 2026-09-06, na entrega **F03** de [`docs/plans/frontend.md`](../../plans/frontend.md), ao implementar `logout()` em `nexus-frontend/src/features/auth/api.ts` (Passo 2 do brief) exatamente como o texto trazia: `return apiFetch<void>("/auth/logout", { method: "POST", body: { refreshToken } });`.

**Descrição:** `@typescript-eslint/no-invalid-void-type` (parte de `strictTypeChecked`) reprova `void` como argumento de tipo explícito quando o genérico está em posição de **CallExpression** (`apiFetch<void>(...)`), mesmo com a opção padrão `allowInGenericTypeArguments: true` — essa opção só cobre `void` em posição de **tipo** (`TSTypeReference`, ex.: uma variável anotada como `Promise<void>` ou um retorno de função `(): Promise<void>`). Confirmado lendo o source da regra (`node_modules/@typescript-eslint/eslint-plugin/dist/rules/no-invalid-void-type.js`): o branch que ignora `allowInGenericTypeArguments` só dispara quando `node.parent.parent.type === TSTypeReference`; em `Foo<void>()` o pai da instanciação de tipo é `CallExpression`, que está na lista `invalidGrandParents` — cai direto no `context.report`.

Testado e confirmado: **remover o argumento de tipo explícito resolve sem nenhuma mudança de comportamento**, porque a função já declara `Promise<void>` como retorno — o TypeScript infere `T = void` contextualmente a partir da posição de `return`. Ou seja, `return apiFetch<void>(...)` e `return apiFetch(...)` (dentro de uma função `(): Promise<void>`) compilam para o mesmo tipo; o argumento explícito era redundante do ponto de vista do compilador, só que a regra do ESLint não sabe disso e reprova mesmo assim.

**Impacto:** Ia se repetir na **F07**, na função `deleteIntegration` — mesmo padrão byte a byte (`apiFetch<void>` como chamada, não como anotação de tipo). O brief [`docs/plans/frontend/f07-integrations-list.md`](../../plans/frontend/f07-integrations-list.md), Passo 1, **já traz a correção aplicada** e o comentário explicando o porquê, então F07 não deve reencontrar o problema.

**Sugestão:** Nenhuma ação pendente além de conferir, ao implementar F07, que o `<void>` explícito não voltou. O ajuste é sempre o mesmo: remover o argumento de tipo e deixar o TypeScript inferir `T` do retorno declarado `Promise<void>` da função. **Apagar este arquivo** ao concluir F07.
