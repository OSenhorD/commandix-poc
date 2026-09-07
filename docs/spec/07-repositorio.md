# 7. Estrutura do repositório

[← Índice](./README.md)

Monorepo com dois pacotes (`nexus-backend/`, `nexus-frontend/`) e a infra compartilhada na raiz.

```
commandix-poc/
├── docker/{production,development}/docker-compose.yml   # composes; Dockerfiles ficam nos pacotes
├── docs/{spec,todo}/                                    # spec técnica + fila de pendências
├── .agents/rules/                                       # regras por domínio
├── nexus-backend/
└── nexus-frontend/
```

Este documento não repete a árvore completa — ela envelhece mais rápido do que é lida. Abaixo só os caminhos cuja **localização é uma decisão**, não uma convenção óbvia do framework.

## Onde as coisas ficam, e por quê

| Caminho | Por que está aí |
|---------|-----------------|
| `docker/*/docker-compose.yml` | Composes centralizados na raiz; os **Dockerfiles** ficam em cada pacote (`nexus-backend/docker/`, `nexus-frontend/docker/`), perto do que constroem. Por isso todo comando usa `--project-directory .` |
| `nexus-backend/docker/*/entrypoint.sh` | Sequência `db migrate` → seed → start. O de produção também é usado como referência do fluxo de CI |
| `nexus-backend/src/prisma/` | `contract.prisma` (fonte), `contract.json` e `contract.d.ts` (gerados, **commitados**), `db.ts` (runtime) e `seed.ts`. Ver [04-modelo-dados](./04-modelo-dados.md) |
| `nexus-backend/migrations/app/` | Migrations versionadas — commitadas |
| `nexus-backend/.agents/skills/prisma-8/` | **Fonte única** da skill Prisma, sincronizada por `npm run skills:sync`. Sem symlink na raiz: ler direto neste caminho |
| `nexus-frontend/src/components/ui/` | Componentes shadcn. **Não pode** mudar de lugar — `components.json` fixa o alias `@/components/ui` e mover quebra o `shadcn add` |
| `nexus-frontend/src/{app,shared,features}/` | Estrutura feature-sliced — cada `features/<domínio>/` fecha api, hooks, schemas, componentes e páginas; o que serve mais de uma feature sobe para `shared/` |
| `.agents/rules/*.md` | Regras por domínio, separadas do [`AGENTS.md`](../../AGENTS.md) para não carregar tudo em todo contexto |

## Convenções de import

| Pacote | Alias | Sufixo `.js` |
|--------|-------|--------------|
| `nexus-backend` | `@/` → `src/` | **Obrigatório** — Node ESM não resolve alias; o build usa `tsc-alias` |
| `nexus-frontend` | `@/` → `src/` | **Nunca** — o Vite resolve |

Comandos (Prisma, testes, lint) rodam dentro dos containers — ver [`readme.md`](../../readme.md).
