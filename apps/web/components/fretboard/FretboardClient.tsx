'use client';

import { useMemo } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';
import { chordPitchClassSet } from '@/lib/theory/chord-voicing';
import {
  STANDARD_TUNING,
  getFretboardNotes,
  getOpenStringLabels,
} from '@/lib/theory/fretboard';
import { shouldUseFlats } from '@/lib/theory/notes';
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
 *   1. fretboard + backing 슬라이스 구독
 *   2. backing 재생 중이면 effectiveRoot = backingKey, RootPicker는 sync 모드
 *   3. backing 재생 중이면 현재 코드의 코드톤 PC Set을 Fretboard에 전달
 *      (Fretboard가 halo overlay를 렌더)
 *   4. 매 변경 시 getFretboardNotes() 재계산
 *
 * 셀렉터 분리:
 *   backingCurrentChord 전체 대신 .symbol만 분리 구독해 같은 코드 반복 마디에서
 *   불필요 리렌더 회피. barIndex가 바뀌어도 symbol이 같으면 렌더 발생 안 함.
 *
 * hydration gate:
 *   useHasHydrated()가 false인 첫 렌더에는 로딩 박스만 보여줘 localStorage
 *   rehydrate 전후의 DOM 불일치를 피한다.
 */

export function FretboardClient() {
  const hydrated = useHasHydrated();

  const fretboardRoot = useAppStore((s) => s.fretboard.root);
  const scale = useAppStore((s) => s.fretboard.scale);
  const handedness = useAppStore((s) => s.fretboard.handedness);
  const labelMode = useAppStore((s) => s.fretboard.labelMode);
  const frets = useAppStore((s) => s.fretboard.frets);
  const fretSpacing = useAppStore((s) => s.fretboard.fretSpacing);
  const highlightsOverride = useAppStore((s) => s.fretboard.highlightsByScale[scale]);
  const accidentalMode = useAppStore((s) => s.fretboard.accidentalMode);

  // backing 동기화 — symbol만 분리 구독해 같은 코드 반복 마디에서 리렌더 회피.
  // backingCurrentChord 전체 객체를 구독하면 barIndex 변경마다 새 참조가 생겨 리렌더.
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const backingPlayingSlug = useAppStore((s) => s.backing.backingPlayingSlug);
  const currentChordSymbol = useAppStore(
    (s) => s.backing.backingCurrentChord?.symbol ?? null,
  );

  // backing 재생 중이면 사용자 root 대신 backingKey를 사용.
  // 이 분기가 없으면 C 스케일을 보다가 G 키로 배킹을 재생해도 지판이 C로 유지된다.
  const isBackingActive = backingPlayingSlug !== null;
  const effectiveRoot = isBackingActive ? backingKey : fretboardRoot;

  // 현재 코드 톤 PC Set — isBackingActive 이고 currentChordSymbol이 있을 때만 계산.
  // 파싱 실패 시 chordPitchClassSet이 null을 반환하므로 undefined로 폴백.
  const chordTonePcs = useMemo(() => {
    if (!isBackingActive || !currentChordSymbol) return undefined;
    return chordPitchClassSet(currentChordSymbol, backingKey) ?? undefined;
  }, [isBackingActive, currentChordSymbol, backingKey]);

  // 이명동음 표기는 effectiveRoot 기준 — backing 재생 중에는 backingKey 조표 적용.
  const useFlats = shouldUseFlats(effectiveRoot, accidentalMode);

  const notes = useMemo(() => {
    const highlights = resolveScaleHighlights(scale, highlightsOverride);
    return getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets,
      root: effectiveRoot,
      scale,
      highlights,
      useFlats,
    });
  }, [effectiveRoot, scale, frets, highlightsOverride, useFlats]);

  // 오픈 스트링은 스케일에 무관하고 effectiveRoot + mode 조합의 useFlats만 반영.
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
          chordTonePcs={chordTonePcs}
          chordSymbol={currentChordSymbol}
        />
      </div>

      {/* 컨트롤 그리드 — 2열 비대칭 */}
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
    </div>
  );
}
