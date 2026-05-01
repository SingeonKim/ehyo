'use client';

import { useHasHydrated } from '@/lib/store/hooks';

import { FretboardOptions } from './FretboardOptions';
import { FretCountToggle } from './FretCountToggle';
import { ImportantDegreesToggle } from './ImportantDegreesToggle';
import { InstrumentSelector } from './InstrumentSelector';
import { RootPicker } from './RootPicker';
import { ScalePicker } from './ScalePicker';
import { TuningPresetSelector } from './TuningPresetSelector';

/*
 * 지판 컨트롤 그리드 — RootPicker / ScalePicker / FretboardOptions /
 * ImportantDegreesToggle을 묶은 컴포넌트.
 *
 * Surface와 분리한 이유는 FretboardSurface.tsx 주석 참조.
 * /fretboard 페이지는 FretboardClient를 통해 Surface + Controls 둘 다 마운트.
 * /jam 페이지는 Surface(sticky)와 Controls를 page level에서 따로 배치.
 *
 * Sprint 2-6 후속(v9): RootPicker는 더 이상 syncedToBacking 분기를 갖지 않는다.
 *   fretboard.root와 backing key가 단일 소스로 통합돼, 재생 중에도 root를
 *   자유롭게 변경 가능(엔진이 setKey로 다음 마디부터 전조).
 *
 * Instrument & Tuning 섹션은 패널 최상단에 배치 — instrument는 지판의 가장
 * 근본적 의사결정이라 root/scale 등 다른 컨트롤보다 위에 둔다. 2열 그리드와
 * 별개의 row로 두어 풀폭으로 보이게 한다.
 *
 * hydration gate — Surface와 동일하게 첫 렌더 DOM mismatch 방지.
 */

export function FretboardControls() {
  const hydrated = useHasHydrated();

  if (!hydrated) {
    return null;
  }

  return (
    <div className="space-y-8">
      <section
        aria-label="Instrument and tuning"
        className="space-y-3 border-b border-ink-muted/10 pb-6"
      >
        <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-ink-muted">
          § Instrument &amp; Tuning
        </h3>
        <InstrumentSelector />
        <TuningPresetSelector />
        <FretCountToggle />
      </section>
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-6">
          <RootPicker />
          <FretboardOptions />
        </div>
        <div className="space-y-6">
          <ScalePicker />
          <ImportantDegreesToggle />
        </div>
      </div>
    </div>
  );
}
