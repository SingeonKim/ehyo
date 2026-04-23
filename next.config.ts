import type { NextConfig } from 'next';

/**
 * Next.js 15 설정.
 * - output: 'standalone' → Docker 이미지 슬림화 (multi-stage builder의 .next/standalone 복사 패턴)
 * - reactStrictMode: 의도적 off. AudioContext 싱글턴이 StrictMode의 이중 mount와 충돌해 2개 생성되는 문제 방지.
 *   Phase 1에서 context.ts의 싱글턴 가드 검증 후 재검토.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
