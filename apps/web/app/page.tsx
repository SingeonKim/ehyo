import Link from 'next/link';

import { RandomTaunt } from '@/components/home/random-taunt';

/*
 * 랜딩 페이지 — Server Component.
 * 메인 타이틀(앱 이름 "에휴..")은 정적이라 서버에서 렌더하고,
 * 서브타이틀은 랜덤 자극 멘트라 RandomTaunt(Client Component)로 분리한다.
 *
 * 글로벌 푸터(layout.tsx)와 자연스럽게 이어지도록 자체 footer 제거.
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-8 py-16">
      <header className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          ehyo · 에휴
        </p>
        <p className="font-mono text-xs tabular-nums text-ink-muted">v0.1.0</p>
      </header>

      <section className="py-24">
        {/* 앱 이름 = 한숨 그 자체. 한/영 동일 글씨체(font-display) + 동일 스케일로 페어링. */}
        <h1 className="font-display leading-[0.95] tracking-tight text-ink-primary">
          <span className="block text-7xl font-black md:text-9xl">에휴..</span>
          <span className="mt-2 block text-[3.125rem] font-black text-accent-brass md:text-[6.625rem]">
            Ehyo..
          </span>
        </h1>
        <RandomTaunt />

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
    </main>
  );
}
