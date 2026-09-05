#!/bin/sh
set -e

if [ -z "$TEST_DATABASE_URL" ]; then
  echo "TEST_DATABASE_URL is not set." >&2
  exit 1
fi

echo "Applying migrations to the test database..."
DATABASE_URL="$TEST_DATABASE_URL" ./node_modules/.bin/prisma db migrate

echo "Running e2e tests against the test database..."
DATABASE_URL="$TEST_DATABASE_URL" npm run test:e2e
