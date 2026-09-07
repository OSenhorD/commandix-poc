#!/bin/sh
set -e

# Os e2e escrevem no banco (seed, tenants, execuções). Quando TEST_DATABASE_URL
# existe — Compose de desenvolvimento, banco `commandix_test` — a suíte roda lá,
# isolada do banco de desenvolvimento. Sem ela (CI, banco descartável), roda no
# DATABASE_URL mesmo.
if [ -n "$TEST_DATABASE_URL" ]; then
  echo "Applying migrations to the test database..."
  DATABASE_URL="$TEST_DATABASE_URL" ./node_modules/.bin/prisma db migrate
  export DATABASE_URL="$TEST_DATABASE_URL"
else
  echo "TEST_DATABASE_URL is not set — running e2e against DATABASE_URL."
fi

echo "Running e2e tests..."
exec npm run test:e2e:run
