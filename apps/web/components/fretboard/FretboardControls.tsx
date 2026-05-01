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
 * 레이아웃 — 2컬럼 그리드 단일 행. 좌측은 [Root → Label/Hand → Instrument →
 * Tuning → Fret count] 순으로 스케일 외 모든 컨트롤을 모으고, 우측은 Scale
 * 전용. Instrument/Tuning을 별도 풀폭 row로 띄우지 않고 좌측 스택에 흡수해
 * 시각적 구획을 줄였다.
 *
 * hydration gate — Surface와 동일하게 첫 렌더 DOM mismatch 방지.
 */

export function FretboardControls() {
  const hydrated = useHasHydrated();

  if (!hydrated) {
    return null;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-6">
        <RootPicker />
        <FretboardOptions />
        <InstrumentSelector />
        <TuningPresetSelector />
        <FretCountToggle />
      </div>
      <div className="space-y-6">
        <ScalePicker />
        <ImportantDegreesToggle />
      </div>
    </div>
  );
}
