#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma db migrate

echo "Running seed..."
npm run seed

echo "Starting API in watch mode (debug inspector on 9229)..."
exec npm run start:debug
