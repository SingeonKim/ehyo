import type { Metadata } from 'next';

import { FretboardControls } from '@/components/fretboard/FretboardControls';
import { FretboardSurface } from '@/components/fretboard/FretboardSurface';
import { ProgressionCatalog } from '@/components/jam/ProgressionCatalog';

/*
 * Jam — 지판 + 배킹 카탈로그 통합 뷰.
 *
 * sticky 구조:
 *   FretboardSurface 섹션을 page level의 직속 자식으로 두고 lg: 이상에서
 *   sticky로 고정. 부모 스크롤 컨테이너가 main(layout)이라 카탈로그까지 내려가도
 *   Surface가 헤더 바로 아래에 계속 붙어있다.
 *
 *   FretboardControls는 sticky 영역 밖에 별도 형제로 배치 — Surface만 sticky고
 *   컨트롤은 함께 스크롤된다(사용자 의도: 프랫영역 고정, 세팅 영역 제외).
 *
 *   모바일(<lg)에서는 sticky 해제. 화면 폭이 좁아 Surface가 화면 절반을 잡으면
 *   카탈로그가 가려지므로 일반 흐름.
 *
 * 헤더 메트로놈은 (practice)/layout.tsx의 MetronomeDock이 담당. 본문에는
 * 메트로놈 풀 컨트롤 섹션이 없다.
 */

export const metadata: Metadata = {
  title: 'Jam',
  description: '지판과 배킹 트랙이 한 화면에. 코드 진행 따라 chord overlay가 매 마디 갱신.',
};

export default function JamPage() {
  return (
    <section className="space-y-8 py-8">
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

      {/* sticky 섹션 — Surface만 고정. 카탈로그까지 스크롤해도 헤더 아래에 유지.
          z-10: 카탈로그 내부 일부 요소(예: ChordDisplayModeToggle active 버튼의
          z-[1] stacking)가 sticky fretboard 위로 떠 보이지 않도록 우선순위 확보.
          헤더(layout.tsx)는 top-0 + z-10이지만 위치가 안 겹쳐 충돌 없음. */}
      <section
        aria-label="Fretboard 영역"
        className="lg:sticky lg:top-[var(--header-height)] lg:z-10 bg-bg-base"
      >
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Fretboard
        </h2>
        <FretboardSurface />
      </section>

      <FretboardControls />

      <div className="border-t border-ink-muted/15" aria-hidden="true" />

      <ProgressionCatalog />
    </section>
  );
}
