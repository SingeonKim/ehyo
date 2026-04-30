import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Next.js 15 설정.
 * - output: 'standalone' → Docker 이미지 슬림화
 * - outputFileTracingRoot: 모노레포 루트(../..)를 tracing 기준으로. 지정 없으면
 *   apps/web 하위에서만 tracing해 workspace 상호 의존성 누락 가능성.
 * - reactStrictMode off — AudioContext 싱글턴 이중 mount 방지 (Phase 1 결정)
 * - headers(): 표준 보안 헤더. CSP는 smplr SoundFont CDN(smpldsnds.github.io) 흐름을
 *   세밀히 검증해야 해 별도 sweep으로 분리. HSTS는 production만(localhost HTTPS 강제 회피).
 */

const isProd = process.env.NODE_ENV === 'production';

const securityHeaders: { key: string; value: string }[] = [
  // iframe 임베드 차단 — clickjacking 방지
  { key: 'X-Frame-Options', value: 'DENY' },
  // MIME sniffing 비활성 — 브라우저가 Content-Type을 신뢰
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 외부 도메인 이동 시 origin만 노출
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 사용하지 않는 강력 권한 자동 거부 (interest-cohort = FLoC 옵트아웃)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

if (isProd) {
  // 2년 + 서브도메인 + preload — 첫 응답 이후 브라우저가 HTTPS 강제
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  reactStrictMode: false,
  typedRoutes: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
