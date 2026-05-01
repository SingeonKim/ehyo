'use client';

import { useAppStore } from '@/lib/store/app-store';
import { useInstrument } from '@/lib/store/hooks';
import {
  TUNING_PRESETS,
  presetsByInstrument,
  type TuningPresetId,
} from '@/lib/theory/tunings';

/*
 * 현재 instrument에 속한 tuning preset만 노출하는 dropdown + 우측 readout.
 * Native <select>로 키보드 네비 자동 보장.
 */
export function TuningPresetSelector() {
  const instrument = useInstrument();
  const tuningId = useAppStore((s) => s.fretboard.tuning);
  const setTuning = useAppStore((s) => s.setTuning);

  const presets = presetsByInstrument(instrument);
  const currentPreset = TUNING_PRESETS[tuningId];

  return (
    <div className="flex items-center gap-3">
      <label className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
        Tuning
      </label>
      <select
        value={tuningId}
        onChange={(e) => setTuning(e.target.value as TuningPresetId)}
        aria-label="Tuning preset"
        className="appearance-none border border-ink-muted/30 bg-bg-elevated px-2 py-1 pr-7 font-mono text-xs text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-brass [background-image:url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2010%206%22%20fill=%22none%22%20stroke=%22currentColor%22%20stroke-width=%221.5%22><path%20d=%22M1%201l4%204%204-4%22/></svg>')] bg-[length:0.6rem] bg-[right_0.5rem_center] bg-no-repeat"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="font-mono text-[0.7rem] tracking-[0.1em] text-ink-muted">
        {currentPreset.displayString}
      </span>
    </div>
  );
}
