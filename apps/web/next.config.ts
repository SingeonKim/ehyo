import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Next.js 15 설정.
 * - output: 'standalone' → Docker 이미지 슬림화
 * - outputFileTracingRoot: 모노레포 루트(../..)를 tracing 기준으로. 지정 없으면
 *   apps/web 하위에서만 tracing해 workspace 상호 의존성 누락 가능성.
 * - reactStrictMode off — AudioContext 싱글턴 이중 mount 방지 (Phase 1 결정)
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  reactStrictMode: false,
  typedRoutes: true,
};

export default nextConfig;
