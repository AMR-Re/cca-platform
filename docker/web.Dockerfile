# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /workspace

#############################################
# Dependencies
#############################################
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

#############################################
# Build
#############################################
FROM base AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build -w packages/shared-types
RUN npm run build -w apps/web

#############################################
# Runtime: Next.js standalone server output
#############################################
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /workspace/apps/web/public ./apps/web/public
COPY --from=build /workspace/apps/web/.next/standalone ./
COPY --from=build /workspace/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/en', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/web/server.js"]
