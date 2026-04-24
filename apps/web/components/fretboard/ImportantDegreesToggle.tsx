'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import {
  SCALE_HIGHLIGHTS,
  getScaleDegreeLabels,
  resolveScaleHighlights,
} from '@/lib/theory/scales';
import type { ImportantColor } from '@/lib/theory/types';

/*
 * 중요 노트 색상 사이클 토글.
 *
 * 각 도수 pill은 현재 색(orange/green/blue/none)을 시각적으로 반영하고,
 * 클릭하면 다음 색으로 사이클된다: none → orange → green → blue → none.
 * Root(도수 1)는 항상 red 고정으로 사이클 금지.
 *
 * 유저가 변경한 결과는 스토어의 highlightsByScale에 스케일별로 저장된다.
 */

const COLOR_CLASSES: Record<ImportantColor, { pill: string; dot: string }> = {
  orange: {
    pill: 'border-highlight-orange bg-highlight-orange/15 text-highlight-orange',
    dot: 'bg-highlight-orange',
  },
  green: {
    pill: 'border-highlight-green bg-highlight-green/15 text-highlight-green',
    dot: 'bg-highlight-green',
  },
  blue: {
    pill: 'border-highlight-blue bg-highlight-blue/15 text-highlight-blue',
    dot: 'bg-highlight-blue',
  },
};

export function ImportantDegreesToggle() {
  const scale = useAppStore((s) => s.fretboard.scale);
  const override = useAppStore((s) => s.fretboard.highlightsByScale[scale]);
  const cycle = useAppStore((s) => s.cycleNoteHighlight);
  const reset = useAppStore((s) => s.resetHighlights);

  const allDegrees = getScaleDegreeLabels(scale);
  const applied = resolveScaleHighlights(scale, override);
  const defaults = SCALE_HIGHLIGHTS[scale];
  const hasOverride = override !== undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Highlight Colors
        </label>
        <div className="flex items-baseline gap-3">
          <span className="hidden font-mono text-[0.65rem] text-ink-muted sm:inline">
            클릭: orange → green → blue → off
          </span>
          <button
            type="button"
            onClick={() => reset(scale)}
            disabled={!hasOverride}
            className="font-mono text-[0.65rem] uppercase tracking-widest text-ink-secondary transition-colors duration-75 hover:text-accent-brass disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-muted"
            title={hasOverride ? '현재 스케일을 기본값으로 되돌림' : '이미 기본값'}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allDegrees.map(({ semitones, label }) => {
          const isRoot = semitones === 0;
          const currentColor = isRoot ? undefined : applied[semitones];
          const isDefault = semitones in defaults;

          const colorClasses = currentColor ? COLOR_CLASSES[currentColor] : null;

          return (
            <button
              key={semitones}
              type="button"
              aria-label={`Degree ${label}${currentColor ? ` — ${currentColor}` : ''}${isDefault ? ' — default' : ''}${isRoot ? ' — Root (fixed)' : ''}`}
              title={
                isRoot
                  ? 'Root는 항상 red로 고정'
                  : currentColor
                    ? `현재: ${currentColor} — 클릭 시 다음 색`
                    : '미강조 — 클릭하면 orange부터'
              }
              disabled={isRoot}
              onClick={() => cycle(scale, semitones)}
              className={clsx(
                'flex items-center gap-1.5 border px-2.5 py-1 text-center font-mono text-xs transition-colors duration-75',
                isRoot && 'cursor-default border-scale-root bg-scale-root/20 text-scale-root',
                !isRoot && colorClasses && colorClasses.pill,
                !isRoot && !colorClasses && 'border-ink-muted/30 text-ink-secondary hover:border-ink-secondary hover:text-ink-primary',
              )}
            >
              <span>{label}</span>
              {/* 색상 닷 — 루트는 항상 red 표시, 나머지는 현재 색 또는 빈 outline */}
              <span
                aria-hidden="true"
                className={clsx(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  isRoot && 'bg-scale-root',
                  !isRoot && colorClasses && colorClasses.dot,
                  !isRoot && !colorClasses && 'border border-ink-muted/40',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
