# E2E rodam no banco de desenvolvimento, não em `commandix_test`

**Lado:** backend
**Tipo:** erro
**Contexto:** percebido ao verificar o seed novo (2 tenants / 3 integrações / 10 execuções) — `nexus-backend/src/prisma/db.ts`, `nexus-backend/test/*.e2e-spec.ts`, `readme.md` § Testes, `docker/development/docker-compose.yml:46`

**Descrição:** o `readme.md` afirma que "os e2e usam o `TEST_DATABASE_URL` que o Compose de desenvolvimento já injeta (banco `commandix_test`)", mas nada lê essa variável. `db.ts` resolve a conexão só por `process.env['DATABASE_URL']`, e cada spec usa `DATABASE_URL` apenas como guard (`skipIf`). Na prática `npm run test:e2e` escreve no banco `commandix` de desenvolvimento; `commandix_test` nunca é usado nem migrado.

**Impacto:** os e2e sujam e apagam dados do banco de desenvolvimento (o `seed.e2e-spec.ts` chega a inserir os tenants do seed lá). Um teste destrutivo futuro apagaria dados demo que o avaliador está usando, e a documentação induz a acreditar num isolamento que não existe.

**Sugestão:** fazer `db.ts` (ou um `test/vitest.setup.ts`) preferir `TEST_DATABASE_URL` quando `NODE_ENV === 'test'`, garantir o migrate do `commandix_test` antes da suíte (script no `test:e2e`) e só então manter a frase do readme. Alternativa mínima: corrigir o readme para descrever o comportamento real.
