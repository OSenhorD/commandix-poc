# F12 — Produção: Docker, nginx, CI e fechamento da documentação

> **Agente — leia só isto + o índice.** Restrições globais, armadilhas e atalho de comando: [`../frontend.md`](../frontend.md). Não abra as outras entregas.
> Relatórios SDD: `.superpowers/sdd/frontend/`.

**Arquivos:**
- Criar: `nexus-frontend/docker/production/Dockerfile`, `nexus-frontend/docker/production/nginx.conf`
- Modificar: `docker/production/docker-compose.yml`, `.github/workflows/ci.yml`, `readme.md`, `nexus-frontend/README.md`, `AGENTS.md`, `docs/spec/06-stack.md`, `docs/spec/11-checklist.md`, `docs/todo/openapi-nginx-proxy-assumption.md`

**Interfaces:**
- Consome: build de produção (`npm run build` → `dist/`)
- Produz: serviço `frontend` funcional no compose de produção e job `frontend` no CI

- [ ] **Passo 1: Criar `nexus-frontend/docker/production/Dockerfile`**

```dockerfile
FROM node:24.16.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.31-alpine AS runtime

COPY docker/production/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

- [ ] **Passo 2: Criar `nexus-frontend/docker/production/nginx.conf`**

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Todo o prefixo /api/ — não apenas /api/v1/ — para que /api/docs
  # e /api/openapi.json continuem acessíveis atrás do proxy.
  location /api/ {
    proxy_pass http://api:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Fallback do SPA: qualquer rota do React Router cai no index.html.
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Passo 3: Substituir o bloco comentado de `frontend` em `docker/production/docker-compose.yml`**

```yaml
  frontend:
    build:
      context: ./nexus-frontend
      dockerfile: docker/production/Dockerfile
      network: host
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-5173}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - commandix-production
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1/ || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

- [ ] **Passo 4: Subir o compose de produção e validar ponta a ponta**

```bash
docker compose -f docker/development/docker-compose.yml --project-directory . down
docker compose -f docker/production/docker-compose.yml --project-directory . up --build -d
docker compose -f docker/production/docker-compose.yml --project-directory . ps
```

| Verificação | Comando / ação | Esperado |
|-------------|----------------|----------|
| Frontend responde | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` | `200` |
| Rota do SPA (fallback) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/integrations` | `200` (não 404) |
| Proxy da API | `curl -s http://localhost:5173/api/v1/health` | `{"status":"ok"}` |
| Swagger atrás do proxy | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/api/openapi.json` | `200` |
| Fluxo completo | Navegar em http://localhost:5173 | Login com `admin@acme.com` / `Admin123!`, criar integração, disparar, ver histórico e detalhe |

- [ ] **Passo 5: Adicionar o job `frontend` em `.github/workflows/ci.yml`**

Depois do job `validate`:

```yaml
  frontend:
    name: Frontend lint, test & build
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: nexus-frontend

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24.16.0'
          cache: npm
          cache-dependency-path: nexus-frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Build
        run: npm run build
```

O `defaults.run.working-directory` do job sobrescreve o global (`nexus-backend`). `npm run build` já roda `tsc -b`, então não há passo separado de typecheck.

- [ ] **Passo 6: Atualizar a documentação**

O status de F01–F03 (dev compose, cliente HTTP, sessão, rotas) já está refletido nesses arquivos. F12 só fecha o que ainda falta:

| Arquivo | Mudança |
|---------|---------|
| [`docs/spec/11-checklist.md`](../../spec/11-checklist.md) | Fase 1 — marcar Docker Compose (incluindo `frontend` de **produção**) como concluído; Fase 5 — marcar **F12** |
| [`docs/spec/06-stack.md`](../../spec/06-stack.md) | §6.2 — telas e RHF/zod deixam de ser pendentes; §6.3 — `frontend` de produção deixa de ser parcial |
| [`docs/spec/08-docker.md`](../../spec/08-docker.md) | §8.9 — job `frontend` deixa de ser "a criar" |
| [`readme.md`](../../../readme.md) | Serviço `frontend` de produção; tabela de status; job `frontend` no CI |
| [`nexus-frontend/README.md`](../../../nexus-frontend/README.md) | Remover o aviso de telas pendentes |
| [`AGENTS.md`](../../../AGENTS.md) | "Estado atual" — `nexus-frontend/` passa a **Funcional**; Compose de produção inclui `frontend` |
| [`docs/todo/openapi-nginx-proxy-assumption.md`](../../todo/openapi-nginx-proxy-assumption.md) | Encerrar: o nginx proxia todo `/api/` |

- [ ] **Passo 7: Validação final**

```bash
docker compose -f docker/production/docker-compose.yml --project-directory . down
docker compose -f docker/development/docker-compose.yml --project-directory . up --build -d
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run lint
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm test
docker compose -f docker/development/docker-compose.yml --project-directory . exec frontend npm run build
```

**Critério de done F12:**

- [ ] `docker compose -f docker/production/docker-compose.yml --project-directory . up --build` sobe **database + api + frontend**
- [ ] Frontend em http://localhost:5173 com fluxo completo funcionando (login → integração → disparo → histórico → detalhe)
- [ ] Rotas do SPA acessadas direto pela URL respondem 200 (fallback do nginx)
- [ ] `/api/v1/health` e `/api/openapi.json` acessíveis pelo proxy
- [ ] Job `frontend` no CI passa (lint, testes, build)
- [ ] Documentação atualizada e `docs/todo/openapi-nginx-proxy-assumption.md` encerrado
- [ ] Marcar **F12** e o item de Compose da Fase 1 em [`docs/spec/11-checklist.md`](../../spec/11-checklist.md)

---

