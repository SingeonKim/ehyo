'use client';

/*
 * 배킹 트랙 + 지판 공용 Key 셀렉터.
 *
 * Sprint 2-6 후속(v9): 배킹 키와 지판 root를 단일 소스로 통합.
 *   이 셀렉터는 fretboard.root를 set하고, RootPicker(설정 영역)도 동일한
 *   fretboard.root를 set/구독한다. 엔진은 store 브리지에서 fretboard.root
 *   변화를 감지해 다음 마디부터 새 키로 전조한다.
 *
 * 12 키 드롭다운. 표기는 `isFlatKey(pc)` 기준 flat/sharp 분리 —
 * music-theory-guardian 규율(F, Bb, Eb, Ab, Db는 flat, 나머지는 sharp).
 */

import { isFlatKey } from '@/lib/theory/notes';
import { useAppStore } from '@/lib/store/app-store';
import type { PitchClass } from '@/lib/theory/types';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const KEY_PCS: PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function keyLabel(pc: PitchClass): string {
  return isFlatKey(pc) ? FLAT_NAMES[pc]! : SHARP_NAMES[pc]!;
}

export function KeySelector() {
  // fretboard.root를 단일 소스로 사용. 지판 RootPicker와 양방향 동기.
  const root = useAppStore((s) => s.fretboard.root);
  const setRoot = useAppStore((s) => s.setRoot);

  return (
    <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
      <span>Key</span>
      <select
        value={root}
        onChange={(e) => setRoot(Number(e.target.value) as PitchClass)}
        className="border border-ink-muted/25 bg-bg-elevated px-2 py-1 font-mono text-sm text-ink-primary"
        aria-label="Backing track key"
      >
        {KEY_PCS.map((pc) => (
          <option key={pc} value={pc}>
            {keyLabel(pc)}
          </option>
        ))}
      </select>
    </label>
  );
}
