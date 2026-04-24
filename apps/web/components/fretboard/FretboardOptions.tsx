'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import type { Handedness, LabelMode } from '@/lib/theory/types';

/*
 * 지판 옵션 — 라벨 모드, 손잡이. Accidental 모드는 사소한 옵션이라 RootPicker
 * 헤더로 이동. 프렛 개수·프렛 간격은 Phase 2 후반 확장 여지로 기본값 고정.
 */

const LABEL_MODES: readonly { value: LabelMode; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'degree', label: 'Degree' },
  { value: 'none', label: 'Hide' },
] as const;

const HANDS: readonly { value: Handedness; label: string }[] = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
] as const;

export function FretboardOptions() {
  const labelMode = useAppStore((s) => s.fretboard.labelMode);
  const setLabelMode = useAppStore((s) => s.setLabelMode);
  const handedness = useAppStore((s) => s.fretboard.handedness);
  const setHandedness = useAppStore((s) => s.setHandedness);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Segmented label="Label" value={labelMode} options={LABEL_MODES} onChange={setLabelMode} />
      <Segmented label="Hand" value={handedness} options={HANDS} onChange={setHandedness} />
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block font-mono text-xs uppercase tracking-widest text-ink-muted">
        {label}
      </label>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-px overflow-hidden rounded-sm border border-ink-muted/20"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              // flex-1 + min-w-0으로 공간 공유하되, 텍스트는 nowrap + truncate로
              // 컬럼이 좁아져도 글자가 꺠지지 않게. 좌우 패딩은 px-2로 축소해
              // "Degree" 같은 긴 라벨이 소형 그리드에서도 들어가도록.
              className={clsx(
                'min-w-0 flex-1 truncate whitespace-nowrap px-2 py-2 font-mono text-xs transition-colors duration-75',
                'border-r border-ink-muted/10 last:border-r-0',
                active
                  ? 'bg-accent-brass text-bg-base'
                  : 'bg-bg-elevated text-ink-secondary hover:bg-bg-raised hover:text-ink-primary',
              )}
              title={opt.label}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
