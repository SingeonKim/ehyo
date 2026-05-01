import { describe, it, expect } from 'vitest';
import {
  TUNING_PRESETS,
  presetsByInstrument,
  DEFAULT_PRESET_BY_INSTRUMENT,
  type InstrumentKind,
  type TuningPresetId,
} from '@/lib/theory/tunings';

describe('TUNING_PRESETS', () => {
  it('has 7 presets', () => {
    expect(Object.keys(TUNING_PRESETS)).toHaveLength(7);
  });

  it('guitar-6 standard is EADGBE (PC 4-9-2-7-11-4)', () => {
    const p = TUNING_PRESETS['guitar-6-standard'];
    expect(p.instrument).toBe('guitar-6');
    expect(p.tuning).toEqual([4, 9, 2, 7, 11, 4]);
    expect(p.tuning).toHaveLength(6);
    expect(p.displayString).toBe('EADGBE');
  });

  it('guitar-6 drop d lowers 6th string E→D', () => {
    const p = TUNING_PRESETS['guitar-6-drop-d'];
    const standard = TUNING_PRESETS['guitar-6-standard'];
    expect(p.tuning).toHaveLength(6);
    expect(p.tuning[0]).toBe(2); // D, lowered from E (4)
    // 나머지 줄은 standard와 동일해야 한다 (drop-d는 6번줄만 변경).
    expect(p.tuning.slice(1)).toEqual(standard.tuning.slice(1));
    expect(p.displayString).toBe('DADGBE');
  });

  it('guitar-6 dadgad', () => {
    const p = TUNING_PRESETS['guitar-6-dadgad'];
    expect(p.tuning).toEqual([2, 9, 2, 7, 9, 2]);
    expect(p.displayString).toBe('DADGAD');
  });

  it('guitar-6 eb-half steps every string down a semitone', () => {
    const p = TUNING_PRESETS['guitar-6-eb-half'];
    expect(p.tuning).toEqual([3, 8, 1, 6, 10, 3]);
    expect(p.displayString).toBe('E♭A♭D♭G♭B♭E♭');
  });

  it('guitar-7 standard is BEADGBE (low B added)', () => {
    const p = TUNING_PRESETS['guitar-7-standard'];
    expect(p.instrument).toBe('guitar-7');
    expect(p.tuning).toEqual([11, 4, 9, 2, 7, 11, 4]);
    expect(p.tuning).toHaveLength(7);
    expect(p.displayString).toBe('BEADGBE');
  });

  it('bass-4 standard is EADG (4 strings)', () => {
    const p = TUNING_PRESETS['bass-4-standard'];
    expect(p.instrument).toBe('bass-4');
    expect(p.tuning).toEqual([4, 9, 2, 7]);
    expect(p.tuning).toHaveLength(4);
    expect(p.displayString).toBe('EADG');
  });

  it('bass-4 drop d lowers 4th string E→D', () => {
    const p = TUNING_PRESETS['bass-4-drop-d'];
    expect(p.tuning).toEqual([2, 9, 2, 7]);
    expect(p.displayString).toBe('DADG');
  });

  it('every preset id matches its key', () => {
    for (const [id, preset] of Object.entries(TUNING_PRESETS)) {
      expect(preset.id).toBe(id);
    }
  });
});

describe('presetsByInstrument', () => {
  it('returns 4 presets for guitar-6', () => {
    const list = presetsByInstrument('guitar-6');
    expect(list).toHaveLength(4);
    expect(list[0]?.id).toBe('guitar-6-standard'); // standard always first
  });

  it('returns 1 preset for guitar-7', () => {
    const list = presetsByInstrument('guitar-7');
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('guitar-7-standard');
  });

  it('returns 2 presets for bass-4 with standard first', () => {
    const list = presetsByInstrument('bass-4');
    expect(list).toHaveLength(2);
    expect(list[0]?.id).toBe('bass-4-standard');
    expect(list[1]?.id).toBe('bass-4-drop-d');
  });
});

describe('DEFAULT_PRESET_BY_INSTRUMENT', () => {
  it.each<[InstrumentKind, TuningPresetId]>([
    ['guitar-6', 'guitar-6-standard'],
    ['guitar-7', 'guitar-7-standard'],
    ['bass-4', 'bass-4-standard'],
  ])('default for %s is %s', (kind, expected) => {
    expect(DEFAULT_PRESET_BY_INSTRUMENT[kind]).toBe(expected);
  });
});
