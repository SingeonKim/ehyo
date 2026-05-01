'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';

const VOICES = [
  { kind: 'drums', label: 'DR' },
  { kind: 'bass', label: 'BS' },
  { kind: 'guitar', label: 'GT' },
  { kind: 'aux', label: 'AUX' },
] as const;

export function VoiceMutePanel() {
  const voiceMutes = useAppStore((s) => s.backing.voiceMutes);
  const toggleVoiceMute = useAppStore((s) => s.toggleVoiceMute);

  return (
    <div role="group" aria-label="Voice mute" className="flex items-center gap-2">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-ink-muted">
        Mute
      </span>
      {VOICES.map(({ kind, label }) => {
        const muted = voiceMutes[kind];
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={muted}
            aria-label={`Mute ${kind}`}
            onClick={() => toggleVoiceMute(kind)}
            className={clsx(
              'border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-brass',
              muted
                ? 'border-ink-muted/30 text-ink-muted line-through'
                : 'border-ink-muted/20 text-ink-primary hover:text-accent-brass',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
