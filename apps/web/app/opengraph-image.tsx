import { ImageResponse } from 'next/og';

/*
 * Open Graph 이미지 — Next.js App Router 컨벤션.
 * 빌드 시 `/opengraph-image`로 prerender되어 og:image, twitter:image 메타태그에 자동 연결.
 *
 * runtime은 명시 안 함 → Node 기본. Edge runtime 강제 시 Railway 호환성 약간 떨어짐.
 * 폰트는 system fallback만 사용 — Pretendard/JetBrains 외부 로드는 cold start 비용.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '에휴.. (Ehyo..) — 메트로놈과 기타 스케일 가이드';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0E0B08',
          color: '#F4EDE0',
          fontFamily: 'sans-serif',
        }}
      >
        <p
          style={{
            fontSize: 22,
            color: '#6E6558',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            margin: 0,
          }}
        >
          ehyo · 에휴
        </p>
        <h1
          style={{
            fontSize: 220,
            fontWeight: 900,
            margin: '32px 0 0',
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
          }}
        >
          에휴..
        </h1>
        <h2
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: '#C9A961',
            margin: 0,
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
          }}
        >
          Ehyo..
        </h2>
        <p
          style={{
            fontSize: 28,
            color: '#A89B86',
            marginTop: 56,
          }}
        >
          메트로놈 · 기타 스케일 · 배킹 트랙
        </p>
      </div>
    ),
    { ...size },
  );
}
