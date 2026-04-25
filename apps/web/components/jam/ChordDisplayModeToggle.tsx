'use client';

/*
 * 코드 표기 모드 토글 — Roman(I, IV, V7) ↔ Absolute(C, F, G7).
 * 카탈로그 상단에 1개. store ui.chordDisplayMode 직접 조작.
 */

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import type { ChordDisplayMode } from '@/lib/theory/chord-display';

const OPTIONS: ReadonlyArray<{ mode: ChordDisplayMode; label: string }> = [
  { mode: 'roman', label: 'Roman' },
  { mode: 'absolute', label: 'Absolute' },
];

export function ChordDisplayModeToggle() {
  const current = useAppStore((s) => s.ui.chordDisplayMode);
  const setMode = useAppStore((s) => s.setChordDisplayMode);

  return (
    <div role="group" aria-label="코드 표기 모드" className="flex">
      {OPTIONS.map(({ mode, label }, idx) => {
        const isActive = current === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => setMode(mode)}
            className={clsx(
              'border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-widest transition-colors duration-75',
              idx === 0 ? 'border-r-0' : '',
              isActive
                ? 'border-accent-brass bg-accent-brass/10 text-accent-brass'
                : 'border-ink-muted/25 text-ink-secondary hover:text-ink-primary',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
