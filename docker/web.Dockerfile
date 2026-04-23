# syntax=docker/dockerfile:1.7
#
# my-music-app web 컨테이너.
# 3-stage 빌드:
#   deps   → 의존성만 캐시 (package.json 변경 없으면 스킵)
#   dev    → 로컬 개발 (핫 리로드, volume mount 전제)
#   builder→ 프로덕션 빌드
#   runner → 최종 런타임 (Next.js standalone)
#
# 이미지 크기 목표: < 200MB
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
# lockfile이 없으면 frozen 실패하므로 최초 빌드는 --no-frozen-lockfile 허용
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# ─── dev target (docker-compose.yml에서 사용) ─────────────
FROM node:20-alpine AS dev
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# ─── builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ─── runner (production) ─────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# non-root 유저
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 빌드 산출물만 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
