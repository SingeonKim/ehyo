# syntax=docker/dockerfile:1.7
#
# my-music-app web 컨테이너 (monorepo).
#
# 구조:
#   context: 루트(.). 루트·apps/web 경로를 모두 접근 가능.
#   pnpm workspace — pnpm-workspace.yaml 기반 hoist.
#
# 이미지 크기 목표: < 200MB (standalone runner)
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
# 루트 lock·workspace 선언·.npmrc만 먼저 복사 (의존성 변경 시 캐시 효율)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# ─── dev target ─────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["pnpm", "dev"]

# ─── builder ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @my-music-app/web build

# ─── runner (production standalone) ───────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone은 apps/web/.next/standalone 에 생성되며
# 내부 구조는 server.js·node_modules가 포함된 apps/web/ + 루트 구조를 복제.
# outputFileTracingRoot=../.. 설정에 따라 워크스페이스 루트 기준으로 tracing.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# standalone entry — apps/web/server.js (monorepo 레이아웃)
CMD ["node", "apps/web/server.js"]
