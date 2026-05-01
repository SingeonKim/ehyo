'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';

const OPTIONS = [22, 24] as const;

export function FretCountToggle() {
  const frets = useAppStore((s) => s.fretboard.frets);
  const setFretCount = useAppStore((s) => s.setFretCount);

  return (
    <div role="group" aria-label="Fret count" className="flex items-center gap-3">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
        Frets
      </span>
      <div className="inline-flex border border-ink-muted/30">
        {OPTIONS.map((n) => {
          const active = n === frets;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => setFretCount(n)}
              className={clsx(
                'px-3 py-1 font-mono text-xs',
                active
                  ? 'bg-bg-elevated text-accent-brass'
                  : 'bg-transparent text-ink-muted hover:text-ink-primary',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
