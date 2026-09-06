# CI `format:check` do backend quebra desde o PR #10

**Contexto:** percebido em 2026-09-06, ao investigar o job `Lint, test & build` vermelho no PR de lint do frontend (`cursor/fix-protected-route-lint-c7e9`). O passo que falha é `npm run format:check` em `nexus-backend` (`prettier --check "src/**/*.ts" "test/**/*.ts"`).

**Descrição:** O [PR #10](https://github.com/OSenhorD/commandix-poc/pull/10) (`Base da estrutura do frontend`) apagou `nexus-backend/.prettierrc`, que tinha `{ "singleQuote": true, "trailingComma": "all" }`, e passou a usar o `.prettierrc` da raiz (sem `singleQuote`, logo o default do Prettier é aspas **duplas**). Os 94 arquivos `src/**/*.ts` e `test/**/*.ts` do backend foram escritos com aspas simples (padrão Nest) e o `format:check` passou a reprovar todos. O mesmo job já falha em `main` no push do #10 (`34064617500`); PRs anteriores a isso (até #9) estavam verdes.

**Impacto:** Alto para o merge gate — qualquer PR contra `main`/`feature/frontend-2` herda o job vermelho, mesmo sem tocar no backend. Não tem relação com o frontend nem com `@testing-library/dom`.

**Sugestão:** Escolher uma das duas (não as duas):

1. Restaurar `nexus-backend/.prettierrc` com `singleQuote: true` (o backend continua no estilo Nest; o frontend fica com aspas duplas na raiz).
2. Rodar `npm run format` no backend e commitar o rewrite das aspas — alinhado à convenção do monorepo ("aspas duplas"), mas é um diff grande e barulhento.

Não misturar essa correção num PR de lint/teste do frontend.
