'use client';

/*
 * 배킹 트랙 재생 Key 셀렉터.
 *
 * 12 키 드롭다운. 표기는 `isFlatKey(pc)` 기준으로 flat/sharp 분리 —
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
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const setBackingKey = useAppStore((s) => s.setBackingKey);

  return (
    <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
      <span>Key</span>
      <select
        value={backingKey}
        onChange={(e) => setBackingKey(Number(e.target.value) as PitchClass)}
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
