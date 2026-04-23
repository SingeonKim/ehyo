import Link from 'next/link';

/*
 * 연습 라우트 공통 레이아웃 — Server Component.
 * /metronome, /fretboard, /jam이 이 레이아웃을 공유한다.
 * Django 템플릿 상속의 base 역할 (layout.tsx ↔ base.html).
 * 탑바만 최소로 두고 각 페이지가 주 콘텐츠를 채운다.
 */
export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base text-ink-primary">
      <header className="sticky top-0 z-10 border-b border-ink-muted/10 bg-bg-base">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted transition-colors hover:text-ink-primary"
          >
            ← my-music-app
          </Link>
          <ul className="flex gap-6 font-mono text-xs uppercase tracking-wider">
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
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
