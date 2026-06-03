ARG NODE_VERSION=24.11.1-alpine
FROM node:${NODE_VERSION} AS base

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build
RUN ./node_modules/.bin/tsc prisma/seed.ts --outDir dist/prisma --target es2022 --module commonjs --moduleResolution node --skipLibCheck true --types node
RUN npm prune --omit=dev

# --- Production image ---
FROM node:${NODE_VERSION} AS production

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY prisma.config.js ./
COPY --from=base /app/package.json ./
COPY --from=base /app/scripts/start-prod.sh ./scripts/start-prod.sh

RUN chmod +x ./scripts/start-prod.sh

USER appuser

EXPOSE 3002

CMD ["./scripts/start-prod.sh"]
