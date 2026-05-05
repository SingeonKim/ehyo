import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import Script from 'next/script';

import { Footer } from '@/components/site/Footer';
import { ThemeSync } from '@/components/ui/ThemeSync';

import './globals.css';

/*
 * RootLayout — 앱 전체의 상위 쉘 (Django의 base.html에 대응).
 * Server Component. 폰트·메타데이터·전역 CSS·전역 푸터만 담당하고,
 * 인터랙티브 UI는 하위 Client Component에서 렌더한다.
 *
 * 폰트 전부 self-host:
 *   - Pretendard Variable: public/fonts/ → next/font/local
 *   - JetBrains Mono: next/font/google이 빌드 시 self-host
 *   외부 도메인(jsdelivr 등) 런타임 의존을 제거 — CSP 단순화 + CDN 단절 리스크 해소.
 */

// Pretendard Variable — 본문/디스플레이용 한글·라틴 변동 폰트(weight 45–920 axis).
const pretendard = localFont({
  src: '../public/fonts/PretendardVariable.woff2',
  variable: '--font-sans-local',
  display: 'swap',
  weight: '45 920',
});

// JetBrains Mono — 수치·도수·코드 표기용. next/font/google이 빌드에 self-host.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-local',
  display: 'swap',
  weight: ['400', '500', '700'],
});

/*
 * FOUC 방지 — hydration 이전에 localStorage의 라이트 선택을 읽어
 * documentElement에 data-theme를 박는다.
 *
 * SYNC WITH: app-store persist key('my-music-app:v1') + ui.theme 위치.
 * 키나 위치를 바꿀 때 이 스크립트도 같이 갱신.
 *
 * color-scheme은 globals.css의 html / html[data-theme="light"] selector가
 * 자동 처리하므로 여기서 별도 설정하지 않는다.
 */
const THEME_FOUC_SCRIPT = `(function(){try{var raw=localStorage.getItem('my-music-app:v1');if(!raw)return;var t=JSON.parse(raw).state.ui.theme;if(t==='light'){document.documentElement.dataset.theme='light';}}catch(e){}})()`;

// metadataBase는 절대 URL 생성에 사용. 배포 환경의 공개 URL을 환경변수로 받고,
// 미설정이면 로컬 개발용 폴백.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: '에휴.. (Ehyo..)',
    template: '%s · 에휴..',
  },
  description: '메트로놈과 기타 스케일 가이드를 한 화면에서. 기타 연습자를 위한 웹 도구.',
  metadataBase: new URL(SITE_URL),
  applicationName: '에휴..',
  openGraph: {
    title: '에휴.. (Ehyo..)',
    description: '메트로놈과 기타 스케일 가이드를 한 화면에서.',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '에휴.. (Ehyo..)',
    description: '메트로놈과 기타 스케일 가이드를 한 화면에서.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0E0B08',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jetbrainsMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg-base text-ink-primary">
        <Script id="theme-fouc" strategy="beforeInteractive">
          {THEME_FOUC_SCRIPT}
        </Script>
        <ThemeSync />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
