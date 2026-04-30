import Link from 'next/link';

/*
 * 랜딩 페이지 — Server Component.
 * Phase 0에서는 플레이스홀더. Phase 4 통합 뷰가 완성되면 여기서 바로 /jam으로 보내거나
 * 히어로 + CTA 구조로 확장한다.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-between px-8 py-16">
      <header className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          my-music-app · phase 0
        </p>
        <p className="font-mono text-xs tabular-nums text-ink-muted">v0.1.0</p>
      </header>

      <section className="py-24">
        <h1 className="font-display text-6xl font-black leading-[0.95] tracking-tight text-ink-primary md:text-8xl">
          연습의
          <br />
          <span className="text-accent-brass">정확한 속도.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-secondary">
          메트로놈과 기타 지판 스케일 가이드를 한 화면에서. Phase 0 셋업 완료. 실 기능은 Phase 1
          이후 순차 구현됩니다.
        </p>

        <nav aria-label="주요 기능 이동" className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/jam"
            className="border border-accent-brass px-6 py-3 font-mono text-sm uppercase tracking-wider text-accent-brass transition-colors hover:bg-accent-brass hover:text-bg-base"
          >
            Practice →
          </Link>
          <Link
            href="/metronome"
            className="border border-ink-secondary px-6 py-3 font-mono text-sm uppercase tracking-wider text-ink-secondary transition-colors hover:border-ink-primary hover:text-ink-primary"
          >
            Metronome
          </Link>
          <Link
            href="/fretboard"
            className="border border-ink-secondary px-6 py-3 font-mono text-sm uppercase tracking-wider text-ink-secondary transition-colors hover:border-ink-primary hover:text-ink-primary"
          >
            Fretboard
          </Link>
        </nav>
      </section>

      <footer className="flex items-end justify-between border-t border-ink-muted/20 pt-6">
        <p className="font-mono text-xs text-ink-muted">
          Pretendard · JetBrains Mono · Analog × Editorial
        </p>
        <p className="font-mono text-xs text-ink-muted">2026</p>
      </footer>
    </main>
  );
}
