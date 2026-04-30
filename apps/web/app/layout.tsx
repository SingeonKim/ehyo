import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

/*
 * RootLayout — 앱 전체의 상위 쉘 (Django의 base.html에 대응).
 * 이 컴포넌트는 Server Component. 브라우저 API를 사용하지 않으므로 `'use client'` 없음.
 * 폰트·메타데이터·전역 CSS만 담당하고, 실제 상태를 가진 UI는 하위 Client Component에서 렌더.
 */

// JetBrains Mono — 수치·도수·코드 표기용. Google Fonts에서 variable font 로드.
// Pretendard는 globals.css의 CDN import로 로드하므로 여기서는 라틴 모노만 next/font로.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-local',
  display: 'swap',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: {
    default: '에휴.. (Ehyo..)',
    template: '%s · 에휴..',
  },
  description: '메트로놈과 기타 스케일 가이드를 한 화면에서. 기타 연습자를 위한 웹 도구.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: '에휴.. (Ehyo..)',
    description: '메트로놈과 기타 스케일 가이드를 한 화면에서.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0E0B08',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={jetbrainsMono.variable}>
      <body>{children}</body>
    </html>
  );
}
