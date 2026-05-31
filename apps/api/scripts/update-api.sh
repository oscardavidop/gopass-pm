#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for API update"
  exit 1
fi

API_ENV_FILE="${API_ENV_FILE:-./.env.docker.prod}"
export API_ENV_FILE

if [[ ! -f "$API_ENV_FILE" ]]; then
  echo "Environment file not found: $API_ENV_FILE"
  exit 1
fi

set -a
source "$API_ENV_FILE"
set +a

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${ZAVU_API_KEY:?ZAVU_API_KEY is required}"

SEND_REAL_EMAIL_VALUE="${SEND_REAL_EMAIL:-false}"
SEND_REAL_EMAIL_VALUE="${SEND_REAL_EMAIL_VALUE,,}"
if [[ "$SEND_REAL_EMAIL_VALUE" == "true" && -z "${ZAVU_SENDER_ID:-}" ]]; then
  echo "ZAVU_SENDER_ID is required when SEND_REAL_EMAIL=true"
  exit 1
fi

echo "Updating API stack (code + env)..."
docker compose --env-file "$API_ENV_FILE" -f docker-compose.prod.yml config >/dev/null
docker compose --env-file "$API_ENV_FILE" -f docker-compose.prod.yml up -d --build --force-recreate --remove-orphans

echo "Running database migrations..."
docker compose --env-file "$API_ENV_FILE" -f docker-compose.prod.yml exec -T api ./node_modules/.bin/prisma migrate deploy

API_PORT_VALUE="${API_PORT:-3001}"
API_PREFIX_VALUE="${API_PREFIX:-api/v1}"
API_PREFIX_VALUE="${API_PREFIX_VALUE#/}"
HEALTH_URL="http://localhost:${API_PORT_VALUE}/${API_PREFIX_VALUE}/health"

echo "Waiting for API health at ${HEALTH_URL}"
for attempt in {1..45}; do
  echo "Health check attempt ${attempt}/45..."
  if curl -fsS --connect-timeout 2 --max-time 4 "$HEALTH_URL" >/dev/null; then
    echo "API is healthy"
    exit 0
  fi
  sleep 2
done

echo "API health check failed"
docker compose --env-file "$API_ENV_FILE" -f docker-compose.prod.yml ps
docker compose --env-file "$API_ENV_FILE" -f docker-compose.prod.yml logs api --tail=80
exit 1