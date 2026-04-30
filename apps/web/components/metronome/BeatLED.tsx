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
  /** 도트 사이즈. sm = 컨트롤용 12px, lg = 히어로 강조용 24px. 기본 sm. */
  size?: 'sm' | 'lg';
  className?: string;
}

// 사이즈별 도트/간격 비율을 3:2로 통일해 두 변형이 같은 시각 리듬을 가지게 한다.
const SIZE_STYLES = {
  sm: { dot: 'h-3 w-3', gap: 'gap-2' },
  lg: { dot: 'h-6 w-6', gap: 'gap-4' },
} as const;

export function BeatLED({
  numerator,
  currentBeat,
  accentBeatOne,
  size = 'sm',
  className,
}: BeatLEDProps) {
  const dots = Array.from({ length: numerator }, (_, i) => i + 1);
  const sz = SIZE_STYLES[size];

  return (
    <div
      role="group"
      aria-label={`박자 표시등 (${numerator}박 중 ${currentBeat || 0}번 박)`}
      // flex-wrap: numerator가 16처럼 큰 경우(특히 lg 사이즈)에 모바일 폭에서 한 줄로
      // 안 들어가는 상황을 안전하게 줄바꿈.
      className={clsx('flex flex-wrap items-center', sz.gap, className)}
    >
      {dots.map((beat) => {
        const isActive = beat === currentBeat;
        const isAccentBeat = beat === 1 && accentBeatOne;
        return (
          <span
            key={beat}
            aria-hidden="true"
            className={clsx(
              sz.dot,
              'rounded-full border transition-colors duration-75',
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
