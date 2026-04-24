'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import { NOTE_NAMES_FLAT, NOTE_NAMES_SHARP, shouldUseFlats } from '@/lib/theory/notes';
import type { PitchClass } from '@/lib/theory/types';

/*
 * Root 선택 — 12 피치 클래스를 버튼으로 나열.
 *
 * 디자인 선택:
 *   가로 12칸. 이명동음(C#/Db 등)은 현재 Root의 플랫 여부에 따라 표기가 바뀐다.
 *   UI 일관성을 위해 버튼 라벨은 샾·플랫 중 "현재 선택된 Root 컨벤션"을 따른다.
 */

const PITCH_CLASSES: readonly PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function RootPicker() {
  const root = useAppStore((s) => s.fretboard.root);
  const setRoot = useAppStore((s) => s.setRoot);
  const accidentalMode = useAppStore((s) => s.fretboard.accidentalMode);
  const useFlats = shouldUseFlats(root, accidentalMode);
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;

  // 표시용 현재 모드 라벨
  const conventionHint =
    accidentalMode === 'auto'
      ? useFlats
        ? 'auto → flat'
        : 'auto → sharp'
      : accidentalMode === 'sharp'
        ? 'sharp (forced)'
        : 'flat (forced)';

  return (
    <div role="radiogroup" aria-label="Root 노트 선택" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-xs uppercase tracking-widest text-ink-muted">Root</label>
        <span className="font-mono text-xs text-ink-muted">{conventionHint}</span>
      </div>
      <div className="flex gap-px overflow-hidden rounded-sm border border-ink-muted/20">
        {PITCH_CLASSES.map((pc) => {
          const isActive = pc === root;
          return (
            <button
              key={pc}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setRoot(pc)}
              className={clsx(
                'flex-1 min-w-10 px-1 py-2 text-center font-mono text-sm transition-colors duration-75',
                'border-r border-ink-muted/10 last:border-r-0',
                isActive
                  ? 'bg-accent-brass text-bg-base'
                  : 'bg-bg-elevated text-ink-secondary hover:bg-bg-raised hover:text-ink-primary',
              )}
            >
              {names[pc]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
