import Link from 'next/link';

import { AudioMobileGuard } from '@/components/audio/AudioMobileGuard';
import { MetronomeDock } from '@/components/metronome/MetronomeDock';

/*
 * 연습 라우트 공통 레이아웃 — Server Component.
 * /metronome, /fretboard, /jam이 이 레이아웃을 공유한다.
 *
 * 탑바 우측에 MetronomeDock — 라우트 이동(예: /metronome → /fretboard)에도
 * 싱글턴 스케줄러가 계속 돌아가므로 Dock으로 어디서든 상태 인지·토글 가능.
 *
 * 배경/색상은 root layout body에서 지정 — 여기서는 sticky header + main만.
 */
export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-ink-muted/10 bg-bg-base">
        <nav aria-label="연습 섹션 내비게이션" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted transition-colors hover:text-ink-primary"
          >
            ← 에휴..
          </Link>
          <ul className="ml-auto flex gap-6 font-mono text-xs uppercase tracking-wider">
            <li>
              <Link
                href="/metronome"
                className="text-ink-secondary transition-colors hover:text-accent-brass"
              >
                Metronome
              </Link>
            </li>
            <li>
              <Link
                href="/fretboard"
                className="text-ink-secondary transition-colors hover:text-accent-brass"
              >
                Fretboard
              </Link>
            </li>
            <li>
              <Link
                href="/jam"
                className="text-ink-secondary transition-colors hover:text-accent-brass"
              >
                Practice
              </Link>
            </li>
          </ul>
          <MetronomeDock />
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      <AudioMobileGuard />
    </>
  );
}
