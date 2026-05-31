#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required"
  exit 1
fi

# Check wangler authentication
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "You must be authenticated with Wrangler to deploy. Run 'npx wrangler login' to authenticate."
  exit 1
fi


: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
: "${CLOUDFLARE_PAGES_PROJECT:?CLOUDFLARE_PAGES_PROJECT is required}"
: "${VITE_API_URL:?VITE_API_URL is required}"
: "${VITE_WS_URL:?VITE_WS_URL is required}"
: "${VITE_APP_URL:?VITE_APP_URL is required}"

export VITE_SUPPORTED_LOCALES="${VITE_SUPPORTED_LOCALES:-en,es}"

echo "Building web app..."
npm run build

echo "Deploying dist/ to Cloudflare Pages project: ${CLOUDFLARE_PAGES_PROJECT}"
npx wrangler pages deploy dist --project-name "${CLOUDFLARE_PAGES_PROJECT}" --branch main

echo "Web deploy completed successfully."
