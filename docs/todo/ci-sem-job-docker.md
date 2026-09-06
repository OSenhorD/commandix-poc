# CI não tem job de Docker Compose (docs afirmavam que sim)

**Contexto:** percebido em 2026-09-06, ao revisar a spec para planejar o frontend (`docs/plans/frontend.md`).

**Descrição:** [`readme.md`](../../readme.md) § CI e [`docs/spec/08-docker.md`](../spec/08-docker.md) §8.9 descreviam dois jobs — `validate` e `docker` (este último subindo `docker compose up --build`, validando healthcheck e rodando os testes via `docker compose exec api`). O [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) real tem **apenas** o job `validate`. As duas docs foram corrigidas para refletir a realidade.

**Impacto:** Médio. O entregável obrigatório da spec é "`docker compose up` sobe API + frontend + PostgreSQL" ([01-visao-geral](../spec/01-visao-geral.md)) e nada no CI valida isso — uma quebra no Dockerfile, no entrypoint ou no compose só aparece manualmente.

**Sugestão:** Criar o job `docker` no CI depois da entrega F12 (quando o serviço `frontend` existir nos dois composes): `docker compose -f docker/production/docker-compose.yml --project-directory . up --build -d`, aguardar os healthchecks de `api` e `frontend`, checar `GET /api/v1/health` e a raiz do frontend, e derrubar com `down -v`. Segredos de CI podem usar valores fake (`JWT_*`, `DB_PASSWORD`).
