import { memo } from 'react';

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
  /**
   * 현재 코드 톤에 해당하는 노트인지 여부.
   * 내부적으로는 halo 렌더를 Fretboard에서 별도 레이어로 처리하므로 직접 쓰지 않지만,
   * React.memo의 shallow comparison이 코드 톤 변화 시 올바르게 동작하도록 여기에 선언.
   */
  isChordTone?: boolean;
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

function FretboardNoteImpl({
  cx,
  cy,
  fretWidth,
  tier,
  noteName,
  degree,
  labelMode,
  stringNumber,
  fret,
  // isChordTone은 현재 컴포넌트 내에서 직접 사용하지 않으나,
  // props로 받아둬야 React.memo shallow compare가 값 변화를 감지할 수 있다.
  // '_' 접두사로 unused-vars lint 규칙 통과 (argsIgnorePattern: '^_').
  isChordTone: _isChordTone,
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

// memo로 감싸 노트별 props가 바뀔 때만 리렌더. 지판 그리드는 변하지 않아도
// 코드 톤 set이 바뀌면 isChordTone이 달라진 노트만 선택적으로 리렌더된다.
export const FretboardNote = memo(FretboardNoteImpl);
