'use client';

import { useMemo } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated, useTuning } from '@/lib/store/hooks';
import {
  getAppropriateNotes,
  type AppropriateNotes,
} from '@/lib/theory/chord-voicing';
import {
  getFretboardNotes,
  getGhostFretboardPositions,
  getOpenStringLabels,
  type GhostNote,
} from '@/lib/theory/fretboard';
import { shouldUseFlats } from '@/lib/theory/notes';
import { resolveScaleHighlights } from '@/lib/theory/scales';
import type { PitchClass } from '@/lib/theory/types';

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
 *
 * Sprint 2-7: backing 재생 중 currentChordSymbol/category로 getAppropriateNotes
 * 호출. 스케일 밖 chord/color tone은 ghostNotes로 분리해 별도 SVG 그룹 렌더.
 */

export function FretboardSurface() {
  const hydrated = useHasHydrated();

  const tuning = useTuning();
  const root = useAppStore((s) => s.fretboard.root);
  const scale = useAppStore((s) => s.fretboard.scale);
  const handedness = useAppStore((s) => s.fretboard.handedness);
  const labelMode = useAppStore((s) => s.fretboard.labelMode);
  const frets = useAppStore((s) => s.fretboard.frets);
  const fretSpacing = useAppStore((s) => s.fretboard.fretSpacing);
  const highlightsOverride = useAppStore((s) => s.fretboard.highlightsByScale[scale]);
  const accidentalMode = useAppStore((s) => s.fretboard.accidentalMode);

  // chordSymbol prop은 chord 변경 감지용 key로 계속 사용 — Sprint 2-6 overlay 애니메이션
  // 재시작 트리거.
  //
  // Sprint 2-7 후속: chord 컨텍스트가 채워져 있으면(playing이든 정지 상태에서
  //   사용자가 마디를 클릭한 selection preview든) 동일하게 하이라이팅한다.
  //   따라서 backingPlayingSlug 게이트는 제거 — 정지 상태에서도 selection 기반
  //   chord context가 들어오면 ghost notes가 그려져야 한다.
  const currentChordSymbol = useAppStore(
    (s) => s.backing.backingCurrentChord?.symbol ?? null,
  );
  const backingPlayingCategory = useAppStore(
    (s) => s.backing.backingPlayingCategory,
  );

  const appropriateNotes = useMemo<AppropriateNotes | undefined>(() => {
    if (!currentChordSymbol || !backingPlayingCategory) {
      return undefined;
    }
    const result = getAppropriateNotes(
      currentChordSymbol,
      root,
      backingPlayingCategory,
    );
    // 모든 필드 비어있으면 undefined로 통일 — Fretboard에서 group 미렌더 분기를 단순화.
    if (
      result.chordRoot === null &&
      result.chordTones.size === 0 &&
      result.colorTones.size === 0
    ) {
      return undefined;
    }
    return result;
  }, [currentChordSymbol, root, backingPlayingCategory]);

  const useFlats = shouldUseFlats(root, accidentalMode);

  const notes = useMemo(() => {
    const highlights = resolveScaleHighlights(scale, highlightsOverride);
    return getFretboardNotes({
      tuning,
      frets,
      root,
      scale,
      highlights,
      useFlats,
    });
  }, [tuning, root, scale, frets, highlightsOverride, useFlats]);

  const ghostNotes = useMemo<readonly GhostNote[]>(() => {
    if (!appropriateNotes) return [];
    // chord/color tones 중 스케일 밖 pitch class만 추출.
    // notes 배열은 이미 스케일 멤버십 필터를 거쳐 있으므로 거기서 in-scale set을 만든다.
    const inScalePcs = new Set<PitchClass>(notes.map((n) => n.pitchClass));
    const outOfScalePcs = new Set<PitchClass>();
    if (
      appropriateNotes.chordRoot !== null &&
      !inScalePcs.has(appropriateNotes.chordRoot)
    ) {
      outOfScalePcs.add(appropriateNotes.chordRoot);
    }
    for (const pc of appropriateNotes.chordTones) {
      if (!inScalePcs.has(pc)) outOfScalePcs.add(pc);
    }
    for (const pc of appropriateNotes.colorTones) {
      if (!inScalePcs.has(pc)) outOfScalePcs.add(pc);
    }
    if (outOfScalePcs.size === 0) return [];
    return getGhostFretboardPositions({
      tuning,
      frets,
      pitchClasses: outOfScalePcs,
      useFlats,
    });
  }, [appropriateNotes, notes, frets, tuning, useFlats]);

  const openStrings = useMemo(
    () => getOpenStringLabels(tuning, useFlats),
    [tuning, useFlats],
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
        stringCount={tuning.length}
        frets={frets}
        handedness={handedness}
        fretSpacing={fretSpacing}
        labelMode={labelMode}
        appropriateNotes={appropriateNotes}
        chordSymbol={currentChordSymbol}
        ghostNotes={ghostNotes}
      />
    </div>
  );
}
