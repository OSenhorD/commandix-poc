#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma db migrate

echo "Running seed..."
./node_modules/.bin/tsx src/prisma/seed.ts

echo "Starting API..."
exec node dist/main.js
