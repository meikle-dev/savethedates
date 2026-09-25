FROM node:24.11.0-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM dependencies AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS builder
COPY . .
# Moves source maps (with debug IDs) to /app/sourcemaps so they never reach the production image.
RUN npm run build && node scripts/extract-sourcemaps.mjs

# CI exports this stage with `docker build --target sourcemaps --output type=local,dest=sourcemaps .` and uploads
# the maps to Sentry. No token is needed to build it.
FROM scratch AS sourcemaps
COPY --from=builder /app/sourcemaps /

FROM base AS production
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Limits glibc fragmentation after photo processing; measured against jemalloc in F040 (docs/operations.md).
ENV MALLOC_ARENA_MAX=2
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# The commit this image was built from; tags Sentry events and log lines. Not a secret.
ARG APP_RELEASE=""
ENV APP_RELEASE=$APP_RELEASE
USER node
EXPOSE 3000
CMD ["node", "server.js"]
