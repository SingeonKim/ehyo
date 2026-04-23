import type { Metadata } from 'next';

/*
 * 메트로놈 페이지 — Server Component (Phase 0 플레이스홀더).
 * Phase 1에서 이 위치에 `<MetronomeClient />`를 삽입한다.
 * MetronomeClient는 'use client' + dynamic({ ssr: false }) — AudioContext가 SSR에서 죽기 때문.
 */

export const metadata: Metadata = {
  title: 'Metronome',
  description: '20~300 BPM. Subdivision, Accent, Tap tempo.',
};

export default function MetronomePage() {
  return (
    <section className="py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
        Practice / Metronome
      </p>
      <h1 className="mt-4 font-display text-5xl font-black leading-none tracking-tight md:text-7xl">
        Tempo.
      </h1>

      <div className="mt-16 border border-ink-muted/20 p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Phase 1 — 구현 예정</p>
        <ul className="mt-4 space-y-1 font-mono text-sm text-ink-secondary">
          <li>· BPM 20–300, Time signature</li>
          <li>· Subdivision (quarter/eighth/triplet/sixteenth/swing)</li>
          <li>· Accent beat 1 on/off, Volume, Tap tempo (4탭 평균)</li>
          <li>· Sound type 5종 (click/wood/cowbell/digital/rim)</li>
          <li>· SVG 진자 애니메이션</li>
        </ul>
      </div>
    </section>
  );
}
