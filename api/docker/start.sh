#!/bin/sh
set -e
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running Prisma migrations (RUN_MIGRATIONS=true)..."
  npx prisma migrate deploy
else
  echo "Skipping Prisma migrations (handled by Render preDeployCommand)."
fi
echo "Starting API..."
node dist/main.js
