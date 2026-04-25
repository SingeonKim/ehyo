'use client';

/*
 * 카탈로그 카드 1개를 렌더링하는 컴포넌트.
 *
 * 추출 이유 (Sprint 2-7 후속):
 *   - click-to-seek 기능을 위해 카드별 local state(selectedBarIdx)가 필요해서
 *     ProgressionCatalogClient의 인라인 <li> 렌더링을 별도 컴포넌트로 떼어냄.
 *   - 마디 strip을 12 bars 초과 시 2 row로 분할 — 16-bar 진행이 너무 길게
 *     늘어지지 않게 시각적으로 끊어준다.
 *
 * 마디 chip = <button>:
 *   - 재생 중 currentBarIdx와 일치 → playing highlight (aria-current).
 *   - 정지 중 selectedBarIdx와 일치 → selected highlight (aria-pressed).
 *   - 재생 중에는 selection 시각화가 currentBar에 가려진다 (의도적).
 *   - 같은 마디 재클릭 시 토글 해제 (selectedBarIdx → null).
 */

import { useMemo, useState } from 'react';

import { clsx } from 'clsx';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { displayChord } from '@/lib/theory/chord-display';
import type { ChordDisplayMode } from '@/lib/theory/chord-display';
import type { PitchClass } from '@/lib/theory/types';

import { BpmSlider } from './BpmSlider';
import { ProgressionPlayButton } from './ProgressionPlayButton';
import { UseRecommendedScaleButton } from './UseRecommendedScaleButton';

/**
 * 12 bars 이하면 단일 row, 초과면 절반씩 2 row.
 * 16 → 8+8, 14 → 7+7, 13 → 7+6 등. flex-wrap이 한 줄이 너무 좁아질 때
 * 자연스럽게 줄을 바꿔주지만, 12 초과 진행은 명시적으로 끊어 시각 균형을 맞춤.
 */
function splitIntoBarRows<T>(steps: readonly T[]): T[][] {
  if (steps.length <= 12) return [Array.from(steps)];
  const half = Math.ceil(steps.length / 2);
  return [Array.from(steps).slice(0, half), Array.from(steps).slice(half)];
}

export function ProgressionCard({
  template: t,
  root,
  chordDisplayMode,
  isPlayingThisCard,
  currentBarIdx,
}: {
  template: ProgressionTemplate;
  root: PitchClass;
  chordDisplayMode: ChordDisplayMode;
  isPlayingThisCard: boolean;
  currentBarIdx: number | null;
}) {
  // 클릭한 마디. 정지 상태일 때만 시각화. 같은 마디 재클릭 시 토글 해제.
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  const rows = useMemo(
    () => splitIntoBarRows(t.progression),
    [t.progression],
  );

  const onBarClick = (absoluteIdx: number) => {
    setSelectedBarIdx((prev) => (prev === absoluteIdx ? null : absoluteIdx));
  };

  return (
    <li className="space-y-2 border border-ink-muted/15 bg-bg-elevated px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-sm text-ink-primary">{t.name}</span>
        <span className="font-mono text-[0.65rem] tabular-nums text-ink-muted">
          {t.default_bpm} bpm · {t.bars} bars
        </span>
      </div>
      {/* 마디 strip — 12 bars 초과는 2 row로 분할 */}
      <div className="space-y-1">
        {rows.map((rowSteps, rowIdx) => {
          // rowStartIdx — 절대 bar index 계산용
          // (두 번째 row의 첫 칩이 absoluteIdx = rowStartIdx + localIdx)
          const rowStartIdx = rows
            .slice(0, rowIdx)
            .reduce((acc, r) => acc + r.length, 0);
          return (
            <ul
              key={rowIdx}
              className="flex flex-wrap gap-1 font-mono text-xs text-ink-muted"
            >
              {rowSteps.map((step, localIdx) => {
                const absoluteIdx = rowStartIdx + localIdx;
                const isPlayingHighlight =
                  isPlayingThisCard && currentBarIdx === absoluteIdx;
                const isSelectedHighlight =
                  !isPlayingThisCard && selectedBarIdx === absoluteIdx;
                const isHighlighted =
                  isPlayingHighlight || isSelectedHighlight;
                return (
                  <li key={absoluteIdx}>
                    <button
                      type="button"
                      onClick={() => onBarClick(absoluteIdx)}
                      aria-current={isPlayingHighlight ? 'true' : undefined}
                      aria-pressed={
                        isSelectedHighlight ? 'true' : undefined
                      }
                      aria-label={`Bar ${absoluteIdx + 1}: ${displayChord(
                        step.chord,
                        root,
                        chordDisplayMode,
                      )}`}
                      className={clsx(
                        // min-w-[3rem]: 짧은 코드(I)도 충분한 클릭 영역 + 시각 일관성
                        // text-center: 코드 텍스트 가운데 정렬
                        'min-w-[3rem] border px-1.5 py-[1px] text-center tabular-nums transition-colors duration-75',
                        'cursor-pointer hover:text-ink-primary',
                        isHighlighted
                          ? 'border-accent-brass bg-accent-brass/10 font-bold text-accent-brass'
                          : 'border-ink-muted/15 text-ink-secondary',
                      )}
                    >
                      {displayChord(step.chord, root, chordDisplayMode)}
                    </button>
                  </li>
                );
              })}
            </ul>
          );
        })}
      </div>
      {/* 컨트롤 row — BPM은 좌측, PlayButton만 ml-auto로 우측 */}
      <div className="flex flex-wrap items-center gap-2">
        <BpmSlider slug={t.slug} defaultBpm={t.default_bpm} />
        <UseRecommendedScaleButton template={t} />
        <div className="ml-auto">
          <ProgressionPlayButton
            template={t}
            startBarIndex={selectedBarIdx ?? undefined}
          />
        </div>
      </div>
    </li>
  );
}
