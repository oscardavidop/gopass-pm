#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for API deploy"
  exit 1
fi

if [[ ! -f ./.env ]]; then
  echo "apps/api/.env is required"
  exit 1
fi

set -a
source ./.env
set +a

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${ZAVU_API_KEY:?ZAVU_API_KEY is required}"

echo "Building and starting API stack (postgres, redis, api)..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

API_PORT_VALUE="${API_PORT:-3001}"
API_PREFIX_VALUE="${API_PREFIX:-api/v1}"
HEALTH_URL="http://localhost:${API_PORT_VALUE}/${API_PREFIX_VALUE}/health"

echo "Waiting for API health at ${HEALTH_URL}"
for attempt in {1..30}; do
  if node -e "fetch(process.argv[1]).then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$HEALTH_URL"; then
    echo "API is healthy"
    exit 0
  fi
  sleep 2
done

echo "API health check failed"
exit 1
