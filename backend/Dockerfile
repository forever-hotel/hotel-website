# syntax=docker/dockerfile:1

# ---- Build stage: install all dependencies and compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev

# ---- Runtime stage: production dependencies and compiled code only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# Never run as root inside the container.
USER node

# Documentation only; the service listens on $PORT (default 3000).
EXPOSE 3000

# Uses the service's own readiness endpoint (GET /health).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Configuration comes from environment variables (docker compose env_file / secrets), never from a baked-in .env.
# Apply migrations before starting a new version: docker compose run --rm <service> npm run migration:run:prod
CMD ["node", "dist/main.js"]
