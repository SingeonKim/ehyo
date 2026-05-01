'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import { useInstrument } from '@/lib/store/hooks';
import type { InstrumentKind } from '@/lib/theory/tunings';

/*
 * Instrument segmented control — Guitar 6 / Guitar 7 / Bass 4.
 * 클릭 시 setInstrument를 호출. 같은 instrument 안에서의 tuning 변형은
 * 보존(스토어 액션이 분기 처리).
 *
 * 시각 통일 — FretboardOptions의 Segmented(Label/Hand)와 동일한 헤더 + 버튼
 * 스타일을 사용. 새 컨트롤마다 별개의 톤이 생기는 것을 막기 위함.
 */

const OPTIONS: readonly { value: InstrumentKind; label: string }[] = [
  { value: 'guitar-6', label: 'Guitar 6' },
  { value: 'guitar-7', label: 'Guitar 7' },
  { value: 'bass-4', label: 'Bass 4' },
] as const;

export function InstrumentSelector() {
  const current = useInstrument();
  const setInstrument = useAppStore((s) => s.setInstrument);

  return (
    <div className="space-y-2">
      <label className="block font-mono text-xs uppercase tracking-widest text-ink-muted">
        Instrument
      </label>
      <div
        role="radiogroup"
        aria-label="Instrument"
        className="flex gap-px overflow-hidden rounded-sm border border-ink-muted/20"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === current;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setInstrument(opt.value)}
              // Label/Hand 세그먼트와 동일: flex-1 + min-w-0 + truncate로
              // 좁은 컬럼에서도 라벨이 깨지지 않게.
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
