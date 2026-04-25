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
              // 두 버튼이 1px 겹치도록 -ml-px. active 버튼은 z-[1]로 위에 표시해
              // active border가 inactive border를 가리도록 한다(이전엔 border-r-0
              // + 다음 버튼 좌측 회색 border가 active brass 박스의 우측을 잘랐음).
              'relative border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-widest transition-colors duration-75',
              idx > 0 && '-ml-px',
              isActive
                ? 'z-[1] border-accent-brass bg-accent-brass/10 text-accent-brass'
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
