import type { LabelMode, NoteTier } from '@/lib/theory/types';

/*
 * 지판 위 노트 한 개 — 원 + 텍스트 라벨.
 *
 * tier별 시각 규율:
 *   root      → 큰 원, 채움, scale-root 색
 *   important → 중간 원, 연한 채움, scale-important 색
 *   regular   → 작은 원, outline only, scale-tone 색
 *
 * 크기는 fretWidth의 비율 (fretboard-renderer 에이전트 규칙):
 *   root 0.32 / important 0.26 / regular 0.19
 */

interface FretboardNoteProps {
  cx: number;
  cy: number;
  fretWidth: number;
  tier: NoteTier;
  noteName: string;
  degree: string;
  labelMode: LabelMode;
  stringNumber: number;
  fret: number;
}

const TIER_RADIUS_RATIO: Record<NoteTier, number> = {
  root: 0.32,
  important: 0.26,
  regular: 0.19,
};

export function FretboardNote({
  cx,
  cy,
  fretWidth,
  tier,
  noteName,
  degree,
  labelMode,
  stringNumber,
  fret,
}: FretboardNoteProps) {
  const r = fretWidth * TIER_RADIUS_RATIO[tier];
  const label = labelMode === 'name' ? noteName : labelMode === 'degree' ? degree : '';

  // 색상은 CSS 변수 토큰으로 — 컴포넌트에 hex 직접 금지
  const fillVar =
    tier === 'root'
      ? 'var(--color-scale-root)'
      : tier === 'important'
        ? 'var(--color-scale-important)'
        : 'none'; // regular는 outline only
  const strokeVar =
    tier === 'root'
      ? 'var(--color-scale-root)'
      : tier === 'important'
        ? 'var(--color-scale-important)'
        : 'var(--color-scale-tone)';

  // 접근성 레이블 — Root와 Important만 스크린리더에 노출. Regular는 presentation으로
  // 스크린리더가 모든 노트를 읊어내는 것을 방지.
  const ariaLabel =
    tier === 'root'
      ? `Root note ${noteName} on string ${stringNumber} fret ${fret}`
      : tier === 'important'
        ? `Important note ${noteName} (${degree}) on string ${stringNumber} fret ${fret}`
        : undefined;
  const ariaHidden = tier === 'regular';

  // 텍스트 크기는 반지름 비례
  const fontSize = r * 0.9;

  return (
    <g
      role={ariaHidden ? 'presentation' : undefined}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaLabel}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fillVar}
        stroke={strokeVar}
        strokeWidth={tier === 'regular' ? 1.5 : 2}
      />
      {label && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontFamily="var(--font-mono)"
          // Root는 배경색 위에 씀 (강한 대비), 나머지는 primary ink
          fill={tier === 'root' ? 'var(--color-bg-base)' : 'var(--color-ink-primary)'}
          className="select-none pointer-events-none"
        >
          {label}
        </text>
      )}
    </g>
  );
}
