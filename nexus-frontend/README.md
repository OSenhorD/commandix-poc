# Nexus Frontend

SPA React do Commandix PoC — gestão de integrações multi-tenant. Consome a API NestJS em `/api/v1`.

> **Estado:** scaffold pronto (Vite + React + Tailwind + shadcn). Telas, roteamento e cliente HTTP são as entregas **F01–F12** de [`docs/plans/frontend.md`](../docs/plans/frontend.md).

## Stack

| Camada | Tecnologia |
|--------|------------|
| Base | React 19 · TypeScript 6 · Vite 8 · React Compiler |
| Estilo | Tailwind CSS 4 (CSS-first, em `src/index.css` — **sem** `tailwind.config.js`) |
| Componentes | shadcn, estilo `base-lyra`, sobre `@base-ui/react` (**não** Radix) · ícones `lucide-react` |
| Rotas | React Router 7 (`createBrowserRouter`) |
| Dados | TanStack Query v5 |
| Formulários | react-hook-form + zod |
| Lint | ESLint 10 (`strictTypeChecked`) — o backend usa oxlint |
| Testes | Vitest + Testing Library (jsdom) |

## Como rodar

Tudo roda em container — ver [`readme.md`](../readme.md) da raiz.

```bash
# na raiz do monorepo
docker compose -f docker/development/docker-compose.yml --project-directory . up --build
```

Frontend em http://localhost:5173, API em http://localhost:3000/api/v1.

Comandos dentro do container:

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run lint
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm test
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npx shadcn add <componente>
```

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Vite dev server (`--host`, proxy `/api` → `api:3000`) |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run preview` | Serve o build local |

## Estrutura

```
src/
├── app/                 # providers, router, protected-route
├── components/ui/       # shadcn — alias fixo em components.json, não mover
├── shared/
│   ├── api/             # client (Bearer + refresh single-flight), errors, query-client
│   ├── types/api.ts     # DTOs espelhando docs/spec/05-api.md
│   ├── lib/             # utils, storage (tokens), format
│   └── components/      # data-table, paginação, empty/error state, json-field, role-gate
└── features/
    ├── auth/            # login, bootstrap, sessão
    ├── integrations/    # lista, form, ações (trigger, ativar/desativar, excluir)
    └── executions/      # histórico e detalhe
```

## API

Base: `import.meta.env.VITE_API_URL ?? "/api/v1"` — caminho **relativo**, resolvido pelo proxy do Vite (dev) ou pelo nginx (prod).

| Variável | Default | Uso |
|----------|---------|-----|
| `VITE_API_URL` | `/api/v1` | Base do cliente HTTP no browser |
| `VITE_API_PROXY_TARGET` | `http://api:3000` | Alvo do proxy do dev server |

Contrato completo: [`docs/spec/05-api.md`](../docs/spec/05-api.md). Padrões e armadilhas: [`.agents/rules/react-frontend.mdc`](../.agents/rules/react-frontend.mdc).
