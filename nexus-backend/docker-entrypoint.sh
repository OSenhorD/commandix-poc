#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma db migrate

echo "Running seed..."
node dist/prisma/seed.js

echo "Starting API..."
exec node dist/main.js
