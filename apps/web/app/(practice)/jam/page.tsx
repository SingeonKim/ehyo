import type { Metadata } from 'next';

import { FretboardClient } from '@/components/fretboard/FretboardClient';
import { ProgressionCatalog } from '@/components/jam/ProgressionCatalog';
import { MetronomeClient } from '@/components/metronome/MetronomeClient';

/*
 * Jam — 통합 뷰. 메트로놈과 지판을 한 페이지에 놓는다.
 *
 * 설계 판단:
 *   두 Client를 그대로 쌓는 "두 세션을 한 자리에" 방식. 각 컴포넌트의 전체
 *   기능을 유지하되 시각적 구분자로 분리. 복잡해 보일 수 있지만 한번 설정
 *   후 연주 중에는 거의 건드리지 않는 사용 패턴이라 실 혼잡도는 낮다.
 *
 *   메트로놈 간이 제어는 이미 헤더 Dock에 상시 존재하므로, /jam에서는
 *   "메트로놈 페이지 풀 컨트롤 + 지판 풀 컨트롤" 조합으로 연습 워크벤치를 완성.
 *
 * 키보드 단축키는 MetronomeClient가 window-level로 등록하므로 /jam에서도
 * 그대로 작동 (Space, ↑↓, Shift+↑↓, T).
 */

export const metadata: Metadata = {
  title: 'Jam',
  description: '메트로놈과 기타 지판을 한 페이지에. 실제 연습 워크벤치.',
};

export default function JamPage() {
  return (
    <section className="space-y-16 py-8">
      <header className="mb-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          Practice / Jam
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
          <span className="text-accent-brass">Practice</span>, together.
        </h1>
        <p className="mt-4 max-w-xl font-mono text-sm text-ink-secondary">
          메트로놈과 지판이 한 화면에. 헤더 Dock으로 다른 페이지에서도 계속 재생.
        </p>
      </header>

      <section aria-label="Metronome 영역">
        <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Metronome
        </h2>
        <MetronomeClient />
      </section>

      <div className="border-t border-ink-muted/15" aria-hidden="true" />

      <section aria-label="Fretboard 영역">
        <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Fretboard
        </h2>
        <FretboardClient />
      </section>

      <div className="border-t border-ink-muted/15" aria-hidden="true" />

      {/* Phase 5 Day 4 — 백엔드 연결 확인용 프리뷰. Phase 5 후반에 각 카드가
          배킹 트랙 재생 버튼을 얻는다. */}
      <ProgressionCatalog />
    </section>
  );
}
