'use client';

import { useMemo } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';
import {
  STANDARD_TUNING,
  getFretboardNotes,
  getOpenStringLabels,
} from '@/lib/theory/fretboard';
import { resolveScaleHighlights } from '@/lib/theory/scales';

import { Fretboard } from './Fretboard';
import { FretboardOptions } from './FretboardOptions';
import { ImportantDegreesToggle } from './ImportantDegreesToggle';
import { RootPicker } from './RootPicker';
import { ScalePicker } from './ScalePicker';

/*
 * 지판 전체 화면 — Client Component.
 *
 * 책임:
 *   1. 스토어에서 Root·Scale·옵션 구독
 *   2. 매 변경 시 getFretboardNotes() 재계산 (useMemo)
 *   3. Fretboard(SVG)와 컨트롤들을 레이아웃
 *
 * hydration gate:
 *   useHasHydrated()가 false인 첫 렌더에는 로딩 박스만 보여줘 localStorage
 *   rehydrate 전후의 DOM 불일치를 피한다.
 */

export function FretboardClient() {
  const hydrated = useHasHydrated();

  const root = useAppStore((s) => s.fretboard.root);
  const scale = useAppStore((s) => s.fretboard.scale);
  const handedness = useAppStore((s) => s.fretboard.handedness);
  const labelMode = useAppStore((s) => s.fretboard.labelMode);
  const frets = useAppStore((s) => s.fretboard.frets);
  const fretSpacing = useAppStore((s) => s.fretboard.fretSpacing);
  const highlightsOverride = useAppStore((s) => s.fretboard.highlightsByScale[scale]);

  const notes = useMemo(() => {
    const highlights = resolveScaleHighlights(scale, highlightsOverride);
    return getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets,
      root,
      scale,
      highlights,
    });
  }, [root, scale, frets, highlightsOverride]);

  // 오픈 스트링은 스케일에 의존하지 않고 root의 플랫/샾 컨벤션만 반영.
  const openStrings = useMemo(() => getOpenStringLabels(STANDARD_TUNING, root), [root]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center border border-ink-muted/20 bg-bg-elevated">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Loading saved settings…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 지판 SVG — 와이드 */}
      <div className="overflow-x-auto border border-ink-muted/20 bg-bg-elevated px-4 py-6">
        <Fretboard
          notes={notes}
          openStrings={openStrings}
          frets={frets}
          handedness={handedness}
          fretSpacing={fretSpacing}
          labelMode={labelMode}
        />
      </div>

      {/* 컨트롤 그리드 — 2열 비대칭 */}
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
