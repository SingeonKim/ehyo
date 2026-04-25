'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import { NOTE_NAMES_FLAT, NOTE_NAMES_SHARP, shouldUseFlats } from '@/lib/theory/notes';
import type { AccidentalMode, PitchClass } from '@/lib/theory/types';

/*
 * Root 선택 — 12 피치 클래스를 버튼으로 나열.
 *
 * 헤더 구성: [ROOT 라벨] ... [Accidental 소형 칩: Auto/♯/♭] [현재 해석 힌트]
 * Accidental은 사소한 옵션이라 별도 세그먼트 블록 대신 헤더에 인라인 칩으로 둔다.
 *
 * Sprint 2-6 후속(v9): 배킹 재생 중에도 RootPicker 비활성화하지 않는다.
 *   fretboard.root와 backing key가 단일 소스로 통합돼, 사용자가 jam을 들으며
 *   여기서 root를 바꾸면 엔진이 다음 마디부터 새 키로 전조한다(setKey 브리지).
 *   따라서 이전 sprint의 syncedToBacking prop은 폐기됐다.
 */

const PITCH_CLASSES: readonly PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

const ACCIDENTAL_CHIPS: readonly { value: AccidentalMode; label: string; aria: string }[] = [
  { value: 'auto', label: 'Auto', aria: 'Auto (조표 기반 자동)' },
  { value: 'sharp', label: '♯', aria: 'Sharp 강제' },
  { value: 'flat', label: '♭', aria: 'Flat 강제' },
] as const;

export function RootPicker() {
  const root = useAppStore((s) => s.fretboard.root);
  const setRoot = useAppStore((s) => s.setRoot);
  const accidentalMode = useAppStore((s) => s.fretboard.accidentalMode);
  const setAccidentalMode = useAppStore((s) => s.setAccidentalMode);
  const useFlats = shouldUseFlats(root, accidentalMode);
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;

  const conventionHint =
    accidentalMode === 'auto'
      ? useFlats
        ? 'auto → ♭'
        : 'auto → ♯'
      : accidentalMode === 'sharp'
        ? 'forced ♯'
        : 'forced ♭';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label
          id="root-picker-label"
          className="font-mono text-xs uppercase tracking-widest text-ink-muted"
        >
          Root
        </label>
        <div
          role="radiogroup"
          aria-label="이명동음 표기 모드"
          className="ml-auto flex gap-px overflow-hidden rounded-sm border border-ink-muted/20"
        >
          {ACCIDENTAL_CHIPS.map((chip) => {
            const active = chip.value === accidentalMode;
            return (
              <button
                key={chip.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={chip.aria}
                onClick={() => setAccidentalMode(chip.value)}
                className={clsx(
                  'min-w-[1.75rem] px-1.5 py-0.5 font-mono text-[0.65rem] leading-tight transition-colors duration-75',
                  'border-r border-ink-muted/10 last:border-r-0',
                  active
                    ? 'bg-accent-brass text-bg-base'
                    : 'bg-bg-elevated text-ink-secondary hover:bg-bg-raised hover:text-ink-primary',
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[0.65rem] text-ink-muted">{conventionHint}</span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="root-picker-label"
        className="flex gap-px overflow-x-auto rounded-sm border border-ink-muted/20"
      >
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
                'min-w-8 flex-1 px-1 py-2 text-center font-mono text-sm transition-colors duration-75',
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
