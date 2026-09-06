# Checklist Fase 1 desatualizado sobre o serviço `frontend` no Docker Compose

**Contexto:** percebido em 2026-09-06, ao concluir a entrega **F01** de [`docs/plans/frontend.md`](../plans/frontend.md) (dependências, Vitest, proxy e container de desenvolvimento do frontend).

**Descrição:** [`docs/spec/11-checklist.md`](../spec/11-checklist.md), Fase 1 — Fundação, tem a linha:

> Docker Compose (`database` + `api` ✅; serviço `frontend` pendente — entrega **F12** de [`docs/plans/frontend.md`](../plans/frontend.md))

Isso ficou impreciso depois do F01: o serviço `frontend` **já existe** em `docker/development/docker-compose.yml` desde esta entrega (build via `nexus-frontend/docker/development/Dockerfile`, `vite dev --host`, proxy `/api` → `api:3000`). O que de fato falta para F12 é só o serviço `frontend` do compose de **produção** (`docker/production/docker-compose.yml`, nginx) — conforme o próprio "Mapa de arquivos" do plano já distingue: `docker/{production,development}/docker-compose.yml | Serviço frontend | F01/F12`.

**Impacto:** Baixo. Não bloqueia nada — é só uma linha de status desatualizada que pode confundir quem ler a Fase 1 isoladamente (parece que nenhum compose tem `frontend` até F12, quando na verdade o de desenvolvimento já tem desde o F01).

**Sugestão:** Atualizar a linha da Fase 1 para diferenciar dev/prod, por exemplo:

> Docker Compose (`database` + `api` + `frontend` dev ✅ — F01; `frontend` prod pendente — entrega **F12**)
