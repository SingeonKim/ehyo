import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OCTAVE,
  chordPitchClassSet,
  chordSymbolToMidi,
  midiToFrequency,
  voicingToMidi,
} from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

describe('voicingToMidi', () => {
  it('C major [0,4,7] at octave 4 → [60,64,67]', () => {
    expect(voicingToMidi([0, 4, 7], 4)).toEqual([60, 64, 67]);
  });

  it('A minor [9,0,4] stacks above root (A4=69)', () => {
    expect(voicingToMidi([9, 0, 4], 4)).toEqual([69, 72, 76]);
  });

  it('B diminished [11,2,5] wraps D and F above B4=71', () => {
    expect(voicingToMidi([11, 2, 5], 4)).toEqual([71, 74, 77]);
  });

  it('uses DEFAULT_OCTAVE when octave omitted', () => {
    expect(voicingToMidi([0, 4, 7])).toEqual(
      voicingToMidi([0, 4, 7], DEFAULT_OCTAVE),
    );
  });

  it('empty voicing returns empty array', () => {
    expect(voicingToMidi([])).toEqual([]);
  });
});

describe('chordSymbolToMidi', () => {
  it('I in C → [60,64,67]', () => {
    expect(chordSymbolToMidi('I', 0 as PitchClass, 4)).toEqual([60, 64, 67]);
  });

  it('V7 in C → [67,71,74,77] (G4, B4, D5, F5)', () => {
    expect(chordSymbolToMidi('V7', 0 as PitchClass, 4)).toEqual([
      67, 71, 74, 77,
    ]);
  });

  it('vi in C → [69,72,76] (A4, C5, E5)', () => {
    expect(chordSymbolToMidi('vi', 0 as PitchClass, 4)).toEqual([69, 72, 76]);
  });

  it('I transposed to key A (root=9) → [69,73,76]', () => {
    expect(chordSymbolToMidi('I', 9 as PitchClass, 4)).toEqual([69, 73, 76]);
  });

  it('returns null for unparseable symbol', () => {
    expect(chordSymbolToMidi('bVII', 0 as PitchClass, 4)).toBeNull();
    expect(chordSymbolToMidi('garbage', 0 as PitchClass, 4)).toBeNull();
  });
});

describe('midiToFrequency', () => {
  it('A4 (MIDI 69) === 440 Hz', () => {
    expect(midiToFrequency(69)).toBe(440);
  });

  it('C4 (MIDI 60) ≈ 261.63 Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });

  it('A5 (MIDI 81) === 880 Hz', () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 5);
  });
});

describe('chordPitchClassSet', () => {
  it('I7 in C → {0,4,7,10}', () => {
    const result = chordPitchClassSet('I7', 0 as PitchClass);
    expect(result).toEqual(new Set([0, 4, 7, 10]));
  });

  it('IV in G (key=7) → C major chord {0,4,7}', () => {
    const result = chordPitchClassSet('IV', 7 as PitchClass);
    expect(result).toEqual(new Set([0, 4, 7]));
  });

  it('파싱 실패 시 null', () => {
    expect(chordPitchClassSet('XYZ', 0 as PitchClass)).toBeNull();
  });

  it('Set 반환 — 동일 PC가 한 번만', () => {
    const result = chordPitchClassSet('I', 0 as PitchClass)!;
    expect(result.size).toBe(3);
  });
});
