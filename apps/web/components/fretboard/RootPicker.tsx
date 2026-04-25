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
 * syncedToBacking=true 시: 배킹 트랙이 키를 제어하므로 root 버튼 전체 disabled.
 * 라벨을 "Root · Synced"로 교체해 sync 상태를 명시.
 * active 강조(bg-accent-brass)를 제거 — 사용자가 "내가 선택한 것"으로 오독하지 않도록.
 * cursor-default 유지: 물리 하드웨어의 잠긴 노브는 커서 변화 없이 반응만 없다.
 */

const PITCH_CLASSES: readonly PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

const ACCIDENTAL_CHIPS: readonly { value: AccidentalMode; label: string; aria: string }[] = [
  { value: 'auto', label: 'Auto', aria: 'Auto (조표 기반 자동)' },
  { value: 'sharp', label: '♯', aria: 'Sharp 강제' },
  { value: 'flat', label: '♭', aria: 'Flat 강제' },
] as const;

interface RootPickerProps {
  /** 배킹 트랙 재생 중일 때 true — 모든 root 버튼 disabled, 라벨 "Root · Synced". */
  syncedToBacking?: boolean;
}

export function RootPicker({ syncedToBacking = false }: RootPickerProps = {}) {
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
    <div className={clsx('space-y-2', syncedToBacking && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label
          id="root-picker-label"
          className="font-mono text-xs uppercase tracking-widest text-ink-muted"
        >
          {syncedToBacking ? 'Root · Synced' : 'Root'}
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
              disabled={syncedToBacking}
              onClick={() => !syncedToBacking && setRoot(pc)}
              className={clsx(
                'min-w-8 flex-1 px-1 py-2 text-center font-mono text-sm transition-colors duration-75',
                'border-r border-ink-muted/10 last:border-r-0',
                syncedToBacking
                  ? /* sync 중: active 강조 없이 전체 균일 처리. hover 반응도 제거.
                     * cursor-default: 하드웨어 잠금 노브처럼 커서 변화 없이 반응만 없음.  */
                    'bg-bg-elevated text-ink-muted cursor-default'
                  : isActive
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
