# 10. Critérios de avaliação

[← Índice](./README.md)

| Critério | Peso | O que observamos |
|----------|------|------------------|
| Funcionamento geral | Alto | `docker compose up`, seed, fluxo completo |
| NestJS e TypeScript | Alto | Módulos, Guards, Pipes, DTOs |
| Modelagem PostgreSQL | Alto | Schema Prisma, relações, migrations, tenant isolation |
| Multi-tenancy | Alto | Dados de um tenant nunca vazam para outro |
| Histórico de execuções | Médio | Registro correto, filtros e paginação |
| README e decisões | Médio | Clareza, aprendizados, melhorias futuras; incluir escolha de `authKey` at-rest |
| Testes críticos | **Obrigatório** | Tenant isolation, auth guards, trigger, scoping de execuções (Vitest + supertest) |
| Bônus n8n | Bônus | Workflow funcional integrado |
| Testes extras | Bônus | Cobertura E2E/unitária além do mínimo crítico |
