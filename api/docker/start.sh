#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
fi

echo "Starting API..."
node dist/main.js