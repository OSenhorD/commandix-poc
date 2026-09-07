# Task 13 do plano OpenAPI assume um proxy nginx que não existe

**Contexto:** plano `docs/plans/openapi-scalar.md` (Task 13, Step 2), removido em 2026-09-06 após conclusão — ver `git log --all -- docs/plans/openapi-scalar.md`.

**Descrição:** O plano original assumia um nginx com `location /api/` proxiando `/api/openapi.json` e `/api/docs` para o serviço `api`. No estado atual do repositório não existe serviço nginx: `docker/production/docker-compose.yml` tem o serviço `frontend` comentado (sem build ainda) e nenhum proxy reverso configurado. A API expõe a porta diretamente (`${API_PORT:-3000}:3000`).

**Impacto:** Baixo agora (docs funcionam via acesso direto à API). O frontend já existe no compose de desenvolvimento (F01); o proxy nginx de produção entra na entrega **F12** — o `nginx.conf` precisa encaminhar todo `/api/` (não só `/api/v1/`) para cobrir `/api/docs` e `/api/openapi.json`.

**Sugestão:** Ao criar o serviço `frontend`/proxy em `docker/production/docker-compose.yml`, garantir que o proxy encaminhe todo `/api/` (não apenas `/api/v1/`) para o serviço `api`, cobrindo `/api/docs` e `/api/openapi.json`.

**Encaminhamento (2026-09-06):** coberto pela entrega **F12** de [`docs/plans/frontend/f12-production.md`](../plans/frontend/f12-production.md) — o `nginx.conf` do serviço `frontend` proxia todo o prefixo `/api/` (não só `/api/v1/`). Fechar este item ao concluir F12.
