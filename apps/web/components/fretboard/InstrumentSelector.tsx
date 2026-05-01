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
 * 디자인 토큰: 활성 칸은 bg-bg-elevated + text-accent-brass, 비활성은 text-ink-muted.
 * Hex 하드코딩 금지 — aesthetic-reviewer 게이트.
 */

const OPTIONS: { kind: InstrumentKind; label: string }[] = [
  { kind: 'guitar-6', label: 'Guitar 6' },
  { kind: 'guitar-7', label: 'Guitar 7' },
  { kind: 'bass-4', label: 'Bass 4' },
];

export function InstrumentSelector() {
  const current = useInstrument();
  const setInstrument = useAppStore((s) => s.setInstrument);

  return (
    <div role="group" aria-label="Instrument" className="inline-flex border border-ink-muted/30">
      {OPTIONS.map(({ kind, label }) => {
        const active = kind === current;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            onClick={() => setInstrument(kind)}
            className={clsx(
              'px-3 py-1.5 font-mono text-xs uppercase tracking-[0.15em] transition-colors',
              active
                ? 'bg-bg-elevated text-accent-brass'
                : 'bg-transparent text-ink-muted hover:text-ink-primary',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
