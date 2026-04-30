# syntax=docker/dockerfile:1.7
#
# 프로덕션 단일 이미지 — Railway/Fly/Render 같은 컨테이너 PaaS에서 사용.
#
# 카탈로그를 빌드 타임에 박은 뒤로 web 외에 런타임 의존이 없으므로 이 이미지
# 하나면 배포가 끝난다. 개발/테스트용 docker-compose는 docker/web.Dockerfile을
# 사용 — 이 파일과 분리.
#
# 빌드 컨텍스트: 모노레포 루트. pnpm workspace 통째로 들어옴.
# 최종 이미지: Node 20 Alpine standalone (목표 < 200MB).
# ─────────────────────────────────────────────────────────────

# ─── deps: lockfile + workspace 메타로 의존성만 설치 (캐시 효율) ───
FROM node:20-alpine AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# ─── builder: 소스 복사 후 next build (standalone) ───
FROM node:20-alpine AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

RUN pnpm --filter @my-music-app/web build

# ─── runner: standalone 산출물만 담은 슬림 이미지 ───
# Next.js standalone은 apps/web/.next/standalone 에 생성되며,
# outputFileTracingRoot=../.. 설정에 따라 워크스페이스 루트 기준으로 tracing된
# 최소 node_modules가 함께 포함된다.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 비루트 사용자 — 보안 권장.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

# Railway는 PORT env를 런타임에 주입 — 여기 ENV는 로컬 docker run 기본값.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# standalone entry는 monorepo 레이아웃이라 apps/web 하위.
CMD ["node", "apps/web/server.js"]
