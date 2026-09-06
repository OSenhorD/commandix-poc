# Task 13 do plano OpenAPI assume um proxy nginx que não existe

**Contexto:** `docs/plans/openapi-scalar.md`, Task 13, Step 2 — revisão de 2026-09-06.

**Descrição:** O plano original assumia um nginx com `location /api/` proxiando `/api/openapi.json` e `/api/docs` para o serviço `api`. No estado atual do repositório não existe serviço nginx: `docker/production/docker-compose.yml` tem o serviço `frontend` comentado (sem build ainda) e nenhum proxy reverso configurado. A API expõe a porta diretamente (`${API_PORT:-3000}:3000`).

**Impacto:** Baixo agora (docs funcionam via acesso direto à API), mas quando o frontend (`nexus-frontend/`, ainda a criar — ver `docs/spec/11-checklist.md` Fase 5) for containerizado com um proxy reverso, será necessário adicionar as rotas `/api/docs` e `/api/openapi.json` (ou todo o prefixo `/api/`) à configuração de proxy — do contrário a documentação fica inacessível em produção atrás do proxy.

**Sugestão:** Ao criar o serviço `frontend`/proxy em `docker/production/docker-compose.yml`, garantir que o proxy encaminhe todo `/api/` (não apenas `/api/v1/`) para o serviço `api`, cobrindo `/api/docs` e `/api/openapi.json`.
