# Plano de Implementação — Frontend (Nexus)

> **Para agentes:** usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar entrega por entrega. Os passos usam checkbox (`- [ ]`).
>
> **Leitura (obrigatório, para não gastar tokens):** este índice + **somente** o arquivo da entrega atual em [`frontend/`](./frontend/). Não abra as outras entregas.

**Objetivo:** entregar a SPA React do Commandix com o fluxo completo do protótipo — login/logout, bootstrap de tenant, CRUD de integrações, disparo manual e histórico de execuções — consumindo a API NestJS em `/api/v1`, com isolamento de papéis (ADMIN/VIEWER) na UI.

**Já entregue (não reimplementar):**

| # | Entrega |
|---|---------|
| F01 | Ambiente — deps, Vitest, proxy Vite, serviço `frontend` no compose de desenvolvimento |
| F02 | Cliente HTTP — `apiFetch` + refresh single-flight + storage de tokens + tipos da API |
| F03 | Sessão e rotas — `AuthProvider`, `ProtectedRoute`, `RoleGate`, router |
| F04 | Login/logout — `AuthProvider.login`/`logout`, reidratação via `GET /auth/me`, schemas zod + react-hook-form |
| F05 | Bootstrap — cadastro de tenant e admin, rate limiting `429`, conflitos `409` nos campos corretos |
| F06 | Shell e componentes compartilhados — `AppShell` + `UserMenu`, tema claro/escuro persistente, `DataTable`/`PaginationBar`/`EmptyState`/`ErrorState`, `useListParams`, `Toaster` |
| F07 | Integrações: listagem — `api.ts`/`hooks.ts`, `IntegrationTypeBadge`, tela com filtro `isActive` e paginação na URL |
| F08 | Integrações: formulário — `schemas.ts` (`buildPatchPayload` diff-based), `json-field.tsx`, criar/editar com `authKey` nunca pré-preenchida |

Briefs concluídos são **apagados**: o histórico fica nesta tabela, no [checklist](../spec/11-checklist.md) e no git.

**Restante:** F09–F12.

**Arquitetura:** SPA feature-sliced. `shared/api/client.ts` centraliza o `fetch` (Bearer + refresh single-flight); TanStack Query cuida de cache, paginação e invalidação; React Router 7 protege rotas por autenticação e papel; react-hook-form + zod validam formulários espelhando os DTOs `class-validator` do backend. Paginação e filtros vivem na URL, e a query key deriva dela.

---

## Entregas

| # | Brief | Como se prova |
|---|-------|----------------|
| F09 | [Integrações: ações](./frontend/f09-integrations-actions.md) | Disparo mostra resultado; inativa bloqueia; exclusão avisa do cascade |
| F10 | [Histórico: listagem](./frontend/f10-executions-list.md) | Filtros `status`/`from`/`to` na URL; `from > to` barrado no cliente |
| F11 | [Histórico: detalhe](./frontend/f11-executions-detail.md) | `requestPayload`/`responseBody` legíveis; truncamento sinalizado |
| F12 | [Produção: Docker, nginx, CI](./frontend/f12-production.md) | Compose de produção com os três serviços; CI verde |

### Ordem de execução

Próxima entrega: **F09**. F09 e F10 não dependem entre si — tocam arquivos diferentes.

```
F09 ações (toggle, excluir, disparar)
F10 histórico ──▶ F11 detalhe ──▶ F12 produção + CI + docs
```

---

## Restrições globais

Valem para **todas** as entregas:

| Restrição | Valor |
|-----------|-------|
| Execução | **Tudo dentro de container.** Nada de `npm` no host |
| Versões | Sempre a última estável de cada dependência (`npm install <pkg>` sem pin) |
| TypeScript | Estrito, **sem `any`**; ESLint roda `strictTypeChecked` — `Promise` flutuante e `any` implícito quebram o lint |
| Imports | Alias `@/` → `src/`, **sem** sufixo `.js` (isso é regra do backend, não do Vite) |
| Tailwind | CSS-first em `src/index.css` — **nunca** criar `tailwind.config.js` |
| Componentes | shadcn estilo `base-lyra` sobre **Base UI**; **nunca** importar Radix |
| `components/ui/` | Fica em `@/components/ui` — `components.json` fixa o alias; mover quebra o `shadcn add` |
| Idioma | Código e nomes em **inglês**; textos de UI e documentação em **português** |
| Commits | **Só quando o usuário pedir**. Cada entrega termina em ponto commitável, mas não commite por conta própria |
| Ao concluir uma entrega | Marcar o item em [`docs/spec/11-checklist.md`](../spec/11-checklist.md) Fase 5; neste índice, mover a entrega para "já entregue" e tirar a linha da tabela; **apagar** o brief `frontend/fXX-*.md` e o todo correspondente, se houver |
| Ao observar algo fora do escopo | Criar `docs/todo/<frontend\|backend>/<slug>.md` sem bloquear a entrega — ver [`docs/todo/README.md`](../todo/README.md) |

**Armadilhas do contrato** (`authKey` mascarada, `PATCH {}` → 400, trigger em integração inativa → 400, cross-tenant → 404, `responseBody` truncado): [`.agents/rules/react-frontend.md`](../../.agents/rules/react-frontend.md) § Armadilhas do contrato. Cada brief repete as que valem para a sua entrega.

**Atalho de comando** — defina uma vez por sessão:

```bash
alias dc='docker compose -f docker/development/docker-compose.yml --project-directory .'

dc exec frontend npm run lint
dc exec frontend npm test
dc exec frontend npm run typecheck
```

---

## Mapa de arquivos (restante)

Tudo de F01–F07 já está no repositório: `app/`, `shared/api/`, `shared/lib/`, `shared/components/` (data-table, paginação, vazio, erro), `shared/hooks/use-list-params.ts`, `components/layout/`, `features/auth/` completo, `features/integrations/{api,hooks}.ts` + `components/integration-type-badge.tsx` + listagem, e os placeholders das páginas de F08–F11.

| Arquivo | Responsabilidade | Entrega |
|---------|------------------|---------|
| `src/features/integrations/components/*` (diálogos) | Novos componentes de F09 | F09 |
| `src/features/executions/*` | Histórico e detalhe | F10–F11 |
| `nexus-frontend/docker/production/{Dockerfile,nginx.conf}` | Build estático + proxy | F12 |
| `docker/production/docker-compose.yml` | Serviço `frontend` de produção | F12 |
| `.github/workflows/ci.yml` | Job `frontend` | F12 |

---

## Referências

| Tópico | Documento |
|--------|-----------|
| Contrato da API | [`docs/spec/05-api.md`](../spec/05-api.md) |
| Escopo funcional | [`docs/spec/02-escopo-funcional.md`](../spec/02-escopo-funcional.md) |
| Stack | [`docs/spec/06-stack.md`](../spec/06-stack.md) §6.2 |
| Infra Docker | [`docs/spec/08-docker.md`](../spec/08-docker.md) §8.1, §8.2, §8.6, §8.7 |
| Checklist | [`docs/spec/11-checklist.md`](../spec/11-checklist.md) |
| Padrões e armadilhas React | [`.agents/rules/react-frontend.md`](../../.agents/rules/react-frontend.md) |
| Decisões do projeto | [`AGENTS.md`](../../AGENTS.md) |
