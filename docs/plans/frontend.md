# Plano de Implementação — Frontend (Nexus)

> **Para agentes:** usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar entrega por entrega. Os passos usam checkbox (`- [ ]`).
>
> **Leitura (obrigatório, para não gastar tokens):** este índice + **somente** o arquivo da entrega atual em [`frontend/`](./frontend/). Não abra as outras entregas nem o brief inteiro.

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

## Entregas

| # | Status | Brief | Como se prova |
|---|--------|-------|----------------|
| F04 | pendente | [Login, logout e reidratação](./frontend/f04-login.md) | Login + F5 mantém sessão; logout limpa o `localStorage` |
| F05 | pendente | [Bootstrap: tenant + admin](./frontend/f05-bootstrap.md) | Bootstrap cria tenant e já entra logado; `409` no campo certo |
| F06 | pendente | [Shell e componentes compartilhados](./frontend/f06-shell.md) | Shell + tema persistente; menu do usuário com papel |
| F07 | pendente | [Integrações: listagem](./frontend/f07-integrations-list.md) | Filtro e página na URL; VIEWER sem "Nova integração" |
| F08 | pendente | [Integrações: formulário](./frontend/f08-integrations-form.md) | PATCH só do que mudou; `authKey` em branco não é enviada (6 testes) |
| F09 | pendente | [Integrações: ações](./frontend/f09-integrations-actions.md) | Disparo mostra resultado; inativa bloqueia; exclusão avisa do cascade |
| F10 | pendente | [Histórico: listagem](./frontend/f10-executions-list.md) | Filtros `status`/`from`/`to` na URL; `from > to` barrado no cliente |
| F11 | pendente | [Histórico: detalhe](./frontend/f11-executions-detail.md) | `requestPayload`/`responseBody` legíveis; truncamento sinalizado |
| F12 | pendente | [Produção: Docker, nginx, CI](./frontend/f12-production.md) | Compose de produção com os três serviços; CI verde |

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
| Ao concluir uma entrega | Marcar o item em [`docs/spec/11-checklist.md`](../spec/11-checklist.md) Fase 5 **e** o "Critério de done" no arquivo da entrega |
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
