#!/bin/sh
set -e

# Run database migrations (safe to run on every startup — only applies pending migrations)
npx prisma migrate deploy

# Start the application
exec node dist/index.js
