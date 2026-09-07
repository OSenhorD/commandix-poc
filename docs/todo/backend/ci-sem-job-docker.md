# CI não tem job de Docker Compose

**Lado:** backend
**Tipo:** feature

**Contexto:** percebido em 2026-09-06, ao revisar a spec antes da entrega do frontend.

**Descrição:** o [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) tem os jobs `validate` (backend, direto no runner) e `frontend`. Nenhum deles sobe o Docker Compose — nada valida o Dockerfile, o entrypoint nem os composes.

**Impacto:** Médio. O entregável obrigatório da spec é "`docker compose up` sobe API + frontend + PostgreSQL" ([01-visao-geral](../../spec/01-visao-geral.md)) e nada no CI valida isso — uma quebra no Dockerfile, no entrypoint ou no compose só aparece manualmente.

**Sugestão:** F12 já entregue (o serviço `frontend` existe nos dois composes), então o job está desbloqueado: `docker compose -f docker/production/docker-compose.yml --project-directory . up --build -d`, aguardar os healthchecks de `api` e `frontend`, checar `GET /api/v1/health` e a raiz do frontend, e derrubar com `down -v`. Segredos de CI podem usar valores fake (`JWT_*`, `DB_PASSWORD`).
