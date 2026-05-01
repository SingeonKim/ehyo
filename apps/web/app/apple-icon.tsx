import { ImageResponse } from 'next/og';

/*
 * Apple Touch Icon — Next.js App Router 컨벤션.
 * iOS Safari가 홈 화면 추가/북마크용으로 자동 요청하는 180x180 PNG.
 * 빌드 시 `/apple-icon`로 prerender되어 <link rel="apple-touch-icon"> 태그가 자동 주입됨.
 *
 * 디자인은 icon.svg(파비콘)와 동일 — 다크 배경 위 금색 "에" 글자.
 * iOS가 모서리 둥글림을 자동 적용하므로 사각형으로 채우면 됨.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0E0B08',
          color: '#C9A961',
          fontFamily: 'sans-serif',
          fontWeight: 900,
          fontSize: 120,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        에
      </div>
    ),
    { ...size },
  );
}
