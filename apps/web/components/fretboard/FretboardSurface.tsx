'use client';

import { useMemo } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';
import { getChordOverlay, type ChordOverlay } from '@/lib/theory/chord-voicing';
import {
  STANDARD_TUNING,
  getFretboardNotes,
  getOpenStringLabels,
} from '@/lib/theory/fretboard';
import { shouldUseFlats } from '@/lib/theory/notes';
import { resolveScaleHighlights } from '@/lib/theory/scales';

import { Fretboard } from './Fretboard';

/*
 * 지판 SVG만 분리한 Surface 컴포넌트.
 *
 * 분리 이유:
 *   FretboardClient가 SVG + 컨트롤 그리드를 한 컨테이너로 묶고 있어서, sticky를
 *   외부에서 적용하면 컨트롤까지 같이 고정되거나, FretboardClient 안에 sticky를
 *   넣으면 Fretboard "영역" 부모 안에서만 sticky가 작동(카탈로그로 내려가면 풀림).
 *   Surface와 Controls를 분리해 호출자(jam page)가 SVG만 별도 sticky 섹션에 둘 수
 *   있게 한다. /fretboard 페이지는 FretboardClient가 두 자식을 같이 마운트하므로
 *   동작 변동 없음.
 *
 * sticky 클래스는 호출자가 wrapping 컨테이너에 적용. Surface 자체는 sticky를
 * 갖지 않는다.
 */

export function FretboardSurface() {
  const hydrated = useHasHydrated();

  const root = useAppStore((s) => s.fretboard.root);
  const scale = useAppStore((s) => s.fretboard.scale);
  const handedness = useAppStore((s) => s.fretboard.handedness);
  const labelMode = useAppStore((s) => s.fretboard.labelMode);
  const frets = useAppStore((s) => s.fretboard.frets);
  const fretSpacing = useAppStore((s) => s.fretboard.fretSpacing);
  const highlightsOverride = useAppStore((s) => s.fretboard.highlightsByScale[scale]);
  const accidentalMode = useAppStore((s) => s.fretboard.accidentalMode);

  // Sprint 2-6 후속(v9): backing key가 fretboard.root로 통합됐다.
  // 이전엔 isBackingActive 분기로 backingKey를 effectiveRoot로 썼으나,
  // 이제 root 하나만 사용. backingPlayingSlug 구독은 chordOverlay 활성 분기용으로만 유지.
  const backingPlayingSlug = useAppStore((s) => s.backing.backingPlayingSlug);
  const currentChordSymbol = useAppStore(
    (s) => s.backing.backingCurrentChord?.symbol ?? null,
  );

  const isBackingActive = backingPlayingSlug !== null;

  const chordOverlay = useMemo<ChordOverlay | undefined>(() => {
    if (!isBackingActive || !currentChordSymbol) return undefined;
    const overlay = getChordOverlay(currentChordSymbol, root);
    if (overlay.root === null && overlay.tones.size === 0) return undefined;
    return overlay;
  }, [isBackingActive, currentChordSymbol, root]);

  const useFlats = shouldUseFlats(root, accidentalMode);

  const notes = useMemo(() => {
    const highlights = resolveScaleHighlights(scale, highlightsOverride);
    return getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets,
      root,
      scale,
      highlights,
      useFlats,
    });
  }, [root, scale, frets, highlightsOverride, useFlats]);

  const openStrings = useMemo(
    () => getOpenStringLabels(STANDARD_TUNING, useFlats),
    [useFlats],
  );

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
    <div className="overflow-x-auto border border-ink-muted/20 bg-bg-elevated px-4 py-6">
      <Fretboard
        notes={notes}
        openStrings={openStrings}
        frets={frets}
        handedness={handedness}
        fretSpacing={fretSpacing}
        labelMode={labelMode}
        chordOverlay={chordOverlay}
        chordSymbol={currentChordSymbol}
      />
    </div>
  );
}
