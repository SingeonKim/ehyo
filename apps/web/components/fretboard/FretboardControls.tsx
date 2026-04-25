'use client';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';

import { FretboardOptions } from './FretboardOptions';
import { ImportantDegreesToggle } from './ImportantDegreesToggle';
import { RootPicker } from './RootPicker';
import { ScalePicker } from './ScalePicker';

/*
 * 지판 컨트롤 그리드 — RootPicker / ScalePicker / FretboardOptions /
 * ImportantDegreesToggle을 묶은 컴포넌트.
 *
 * Surface와 분리한 이유는 FretboardSurface.tsx 주석 참조.
 * /fretboard 페이지는 FretboardClient를 통해 Surface + Controls 둘 다 마운트.
 * /jam 페이지는 Surface(sticky)와 Controls를 page level에서 따로 배치.
 *
 * hydration gate — Surface와 동일하게 첫 렌더 DOM mismatch 방지.
 * Surface가 별도 hydration gate를 가지므로 Controls는 hydrated=false일 때 null만
 * 렌더해 페이지 레이아웃에서 자리만 비운다.
 */

export function FretboardControls() {
  const hydrated = useHasHydrated();
  const backingPlayingSlug = useAppStore((s) => s.backing.backingPlayingSlug);
  const isBackingActive = backingPlayingSlug !== null;

  if (!hydrated) {
    return null;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-6">
        <RootPicker syncedToBacking={isBackingActive} />
        <FretboardOptions />
      </div>
      <div className="space-y-6">
        <ScalePicker />
        <ImportantDegreesToggle />
      </div>
    </div>
  );
}
