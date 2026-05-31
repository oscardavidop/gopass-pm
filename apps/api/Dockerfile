FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# --- Production image ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat \
	&& addgroup --system appgroup \
	&& adduser --system --ingroup appgroup appuser

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts/start-prod.sh ./scripts/start-prod.sh

RUN chmod +x ./scripts/start-prod.sh

USER appuser

EXPOSE 3001

CMD ["./scripts/start-prod.sh"]
