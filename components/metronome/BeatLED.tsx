'use client';

import { clsx } from 'clsx';

/*
 * 박자 표시등 — time signature.numerator개의 원. 현재 박에 점등.
 *
 * Accent 처리: 1번 박이 현재이고 isAccentEnabled=true면 accent-signal 색으로.
 * 정박이지만 accent off면 accent-brass.
 * 비활성 박은 outline only.
 *
 * currentBeat: 1~numerator, 0이면 "정지 상태(아무것도 점등 안 됨)".
 */

interface BeatLEDProps {
  numerator: number;
  /** 1~numerator 범위. 0이면 아무것도 점등하지 않음(정지). */
  currentBeat: number;
  accentBeatOne: boolean;
  className?: string;
}

export function BeatLED({ numerator, currentBeat, accentBeatOne, className }: BeatLEDProps) {
  const dots = Array.from({ length: numerator }, (_, i) => i + 1);

  return (
    <div
      role="group"
      aria-label={`박자 표시등 (${numerator}박 중 ${currentBeat || 0}번 박)`}
      className={clsx('flex items-center gap-2', className)}
    >
      {dots.map((beat) => {
        const isActive = beat === currentBeat;
        const isAccentBeat = beat === 1 && accentBeatOne;
        return (
          <span
            key={beat}
            aria-hidden="true"
            className={clsx(
              'h-3 w-3 rounded-full border transition-colors duration-75',
              isActive && isAccentBeat && 'border-accent-signal bg-accent-signal',
              isActive && !isAccentBeat && 'border-accent-brass bg-accent-brass',
              !isActive && 'border-ink-muted/40 bg-transparent',
            )}
          />
        );
      })}
    </div>
  );
}
