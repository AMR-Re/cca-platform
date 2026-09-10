# syntax=docker/dockerfile:1

#############################################
# Base: shared setup for install/build stages
#############################################
FROM node:20-alpine AS base
WORKDIR /workspace
RUN apk add --no-cache openssl

#############################################
# Dependencies: install full workspace deps
# (needed because shared-types is a local
# workspace package that api depends on)
#############################################
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

#############################################
# Build: compile shared-types then the API
#############################################
FROM base AS build
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build -w packages/shared-types
RUN npm run --workspace=apps/api prisma:generate
RUN npm run build -w apps/api
RUN npm prune --omit=dev

#############################################
# Runtime: minimal image, non-root user
#############################################
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl \
  && addgroup -S nodejs && adduser -S nestjs -G nodejs

ENV NODE_ENV=production

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /workspace/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build /workspace/node_modules/.prisma ./node_modules/.prisma

USER nestjs
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
