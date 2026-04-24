import type { LabelMode, NoteTier } from '@/lib/theory/types';

/*
 * 지판 위 노트 한 개 — 원 + 텍스트 라벨.
 *
 * tier별 시각 규율 — 크기는 regular 기준 상대 비율:
 *   root    → 1.2× (채움, scale-root/red)
 *   orange  → 1.1× (채움, highlight-orange)
 *   green   → 1.1× (채움, highlight-green)
 *   blue    → 1.1× (채움, highlight-blue)
 *   regular → 1.0× (outline only, scale-tone)
 *
 * 컬러는 전부 CSS 변수 토큰. hex 하드코딩 금지.
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

// regular = 기준 1.0 → fretWidth * 0.19.  root = 1.2 → 0.228, colored = 1.1 → 0.209.
const TIER_RADIUS_RATIO: Record<NoteTier, number> = {
  root: 0.23,
  orange: 0.21,
  green: 0.21,
  blue: 0.21,
  regular: 0.19,
};

const TIER_COLOR_TOKEN: Record<NoteTier, string> = {
  root: 'var(--color-scale-root)',
  orange: 'var(--color-highlight-orange)',
  green: 'var(--color-highlight-green)',
  blue: 'var(--color-highlight-blue)',
  regular: 'var(--color-scale-tone)',
};

const COLORED_TIERS: ReadonlySet<NoteTier> = new Set<NoteTier>(['root', 'orange', 'green', 'blue']);

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
  const color = TIER_COLOR_TOKEN[tier];
  const isColored = COLORED_TIERS.has(tier);

  // regular는 outline만, 나머지는 fill + 같은 색 stroke
  const fillVar = isColored ? color : 'none';
  const strokeVar = color;

  // 접근성 — Root와 colored 강조만 스크린리더에 노출.
  const ariaLabel =
    tier === 'root'
      ? `Root note ${noteName} on string ${stringNumber} fret ${fret}`
      : isColored
        ? `Highlighted note ${noteName} (${degree}, ${tier}) on string ${stringNumber} fret ${fret}`
        : undefined;
  const ariaHidden = !isColored;

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
        strokeWidth={isColored ? 2 : 1.5}
      />
      {label && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontFamily="var(--font-mono)"
          // colored 채움 위에는 배경색(강한 대비), outline은 primary ink
          fill={isColored ? 'var(--color-bg-base)' : 'var(--color-ink-primary)'}
          className="select-none pointer-events-none"
        >
          {label}
        </text>
      )}
    </g>
  );
}
