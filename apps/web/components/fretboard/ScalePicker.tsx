'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import {
  CATEGORY_LABELS,
  SCALE_CATEGORIES,
  SCALE_LABELS,
} from '@/lib/theory/scales';
import type { ScaleCategory, ScaleKey } from '@/lib/theory/types';

/*
 * 스케일 선택 — 카테고리별 섹션으로 그룹화된 버튼 리스트.
 *
 * 아코디언 대신 상시 노출:
 *   v1에서 총 16개 스케일은 한 뷰에 무리 없이 보인다. 펼치는 동작을
 *   추가하면 인터랙션 단계만 늘어나고 발견성은 오히려 떨어진다.
 *   카테고리 레이블을 강한 위계로 시각적 그룹화만 한다.
 */

const CATEGORY_ORDER: readonly ScaleCategory[] = ['standard', 'pentatonic', 'jazz', 'other'];

export function ScalePicker() {
  const scale = useAppStore((s) => s.fretboard.scale);
  const setScale = useAppStore((s) => s.setScale);

  return (
    <div role="radiogroup" aria-label="스케일 선택" className="space-y-4">
      <label className="block font-mono text-xs uppercase tracking-widest text-ink-muted">
        Scale
      </label>
      {CATEGORY_ORDER.map((category) => (
        <ScaleCategoryGroup
          key={category}
          category={category}
          selected={scale}
          onSelect={setScale}
        />
      ))}
    </div>
  );
}

function ScaleCategoryGroup({
  category,
  selected,
  onSelect,
}: {
  category: ScaleCategory;
  selected: ScaleKey;
  onSelect: (s: ScaleKey) => void;
}) {
  const scales = SCALE_CATEGORIES[category];
  return (
    <div className="space-y-2">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-ink-muted">
        {CATEGORY_LABELS[category]}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {scales.map((s) => {
          const active = s === selected;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(s)}
              className={clsx(
                'border px-3 py-1.5 font-mono text-xs transition-colors duration-75',
                active
                  ? 'border-accent-brass bg-accent-brass text-bg-base'
                  : 'border-ink-muted/30 bg-transparent text-ink-secondary hover:border-ink-secondary hover:text-ink-primary',
              )}
            >
              {SCALE_LABELS[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
