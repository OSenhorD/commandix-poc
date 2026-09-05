#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma db migrate

echo "Running seed..."
npm run seed

echo "Starting API in watch mode..."
exec npm run start:dev
