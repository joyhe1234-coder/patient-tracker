#!/bin/sh
set -e

# Run database migrations (safe to run on every startup — only applies pending migrations)
npx prisma migrate deploy

# Local dev seed (only runs when DEV_SEED=true + NODE_ENV=development + ≤1 user)
if [ "$DEV_SEED" = "true" ]; then
  echo "[dev-seed] DEV_SEED=true — running local dev seed..."
  node dist/scripts/seedDev.js 2>&1 || echo "[dev-seed] Seed failed (non-fatal)"
fi

# Start the application
exec node dist/index.js
