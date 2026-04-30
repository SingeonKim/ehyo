import type { Metadata } from 'next';

import { MetronomeClient } from '@/components/metronome/MetronomeClient';

/*
 * 메트로놈 페이지 — Server Component.
 * 정적 헤더만 SSR. 오디오·인터랙션은 MetronomeClient가 담당 ('use client').
 */

export const metadata: Metadata = {
  title: 'Metronome',
  description: '20~300 BPM. Subdivision, Accent, Tap tempo.',
};

export default function MetronomePage() {
  return (
    <section className="py-8">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          Metronome
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
          <span className="text-accent-brass">Tempo</span>, on time.
        </h1>
      </header>

      <MetronomeClient />
    </section>
  );
}
