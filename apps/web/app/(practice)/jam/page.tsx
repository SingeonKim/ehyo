import type { Metadata } from 'next';

import { FretboardClient } from '@/components/fretboard/FretboardClient';
import { ProgressionCatalog } from '@/components/jam/ProgressionCatalog';

/*
 * Jam — Sprint 2-6 재구성.
 *
 * 본문에서 메트로놈을 제거 — 헤더 MetronomeDock만으로 박자 잡기 충분.
 * Fretboard SVG는 lg: 이상에서 sticky로 카탈로그를 스크롤하면서도 지판이
 * 항상 보이도록 한다. 컨트롤 그리드(RootPicker 등)는 sticky 아님.
 *
 * sticky offset: globals.css의 --header-height (현재 56px).
 * 모바일(<lg)에서는 일반 흐름 — fretboard가 화면 절반을 잡으면 카탈로그가
 * 가려지므로 sticky 해제.
 */

export const metadata: Metadata = {
  title: 'Jam',
  description: '지판과 배킹 트랙이 한 화면에. 코드 진행 따라 chord overlay가 매 마디 갱신.',
};

export default function JamPage() {
  return (
    <section className="space-y-12 py-8">
      <header className="mb-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          Practice / Jam
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
          <span className="text-accent-brass">Practice</span>, together.
        </h1>
        <p className="mt-4 max-w-xl font-mono text-sm text-ink-secondary">
          지판과 배킹 트랙이 한 자리에. 헤더 Dock으로 다른 페이지에서도 메트로놈 계속.
        </p>
      </header>

      <section aria-label="Fretboard 영역" className="space-y-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Fretboard
        </h2>
        {/* sticky는 FretboardClient 내부의 SVG 컨테이너에서 처리 — page는 단순 마운트만 */}
        <FretboardClient />
      </section>

      <div className="border-t border-ink-muted/15" aria-hidden="true" />

      <ProgressionCatalog />
    </section>
  );
}
