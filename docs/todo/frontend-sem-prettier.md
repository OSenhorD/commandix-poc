# `nexus-frontend/` não tem Prettier configurado como dependência local

**Contexto:** percebido em 2026-09-06, na entrega **F01** de [`docs/plans/frontend.md`](../plans/frontend.md), ao verificar a conformidade com a restrição global "Aspas duplas; Prettier da raiz (`printWidth: 120`, `trailingComma: "all"`)".

**Descrição:** `nexus-backend/package.json` tem `prettier` em `devDependencies` e os scripts `format`/`format:check` (rodando contra `src/**/*.ts` e `test/**/*.ts`). `nexus-frontend/package.json` não tem nenhum dos dois. O `.prettierrc`/`.prettierignore` da raiz do monorepo existem e presumivelmente cobrem arquivos do frontend se alguém rodar `npx prettier` a partir da raiz do repo (fora de qualquer container) — mas isso contraria a restrição global "tudo dentro de container" (nada de `npx`/`npm` direto no host), e hoje não há nenhum jeito de formatar ou checar formatação a partir de dentro do container `frontend`.

**Impacto:** Baixo agora — os arquivos escritos manualmente nas entregas do plano seguem a convenção (aspas duplas, `printWidth` 120) por atenção manual do autor de cada tarefa, não por verificação automatizada. O risco cresce a cada entrega nova (F02–F12): sem `format:check` rodando em algum lugar (localmente ou no CI), divergências de estilo podem se acumular sem detecção.

**Sugestão:** Adicionar `prettier` a `nexus-frontend/devDependencies` e os scripts `format`/`format:check` (mesmo padrão do backend), e considerar incluir `format:check` no job `frontend` do CI quando ele for criado (**F12**, ver [`docs/spec/08-docker.md`](../spec/08-docker.md) §8.9). Não é bloqueante para nenhuma entrega F01–F12 do plano atual.
