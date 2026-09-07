# Nexus Frontend

SPA React do Commandix PoC — gestão de integrações multi-tenant, consumindo a API NestJS em `/api/v1`.

Contexto de projeto vem da raiz: [`../AGENTS.md`](../AGENTS.md) (decisões adotadas) e [`../.agents/rules/react-frontend.md`](../.agents/rules/react-frontend.md) (stack, estrutura, auth, armadilhas do contrato — ler antes de codar neste diretório).

- Imports com alias `@/` → `src/`, **sem** sufixo `.js` (isso é regra do backend). Nunca Radix — os componentes shadcn aqui são Base UI. Nunca criar `tailwind.config.js`.
- Comandos, testes e lint rodam dentro do container `frontend`: ver [`../readme.md`](../readme.md).
