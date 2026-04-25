import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OCTAVE,
  chordSymbolToMidi,
  getChordOverlay,
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

describe('getChordOverlay', () => {
  it('I in C → root=0, tones={4,7}', () => {
    const overlay = getChordOverlay('I', 0 as PitchClass);
    expect(overlay.root).toBe(0);
    expect([...overlay.tones].sort()).toEqual([4, 7]);
  });

  it('V7 in C → root=7, tones={11,2,5}', () => {
    const overlay = getChordOverlay('V7', 0 as PitchClass);
    expect(overlay.root).toBe(7);
    expect([...overlay.tones].sort((a, b) => a - b)).toEqual([2, 5, 11]);
  });

  it('IV in G (key=7) → root=0, tones={4,7}', () => {
    // G 키의 IV = C → root pc=0, tones={E=4, G=7}
    const overlay = getChordOverlay('IV', 7 as PitchClass);
    expect(overlay.root).toBe(0);
    expect([...overlay.tones].sort()).toEqual([4, 7]);
  });

  it('파싱 실패 → root=null, tones=empty', () => {
    const overlay = getChordOverlay('???', 0 as PitchClass);
    expect(overlay.root).toBeNull();
    expect(overlay.tones.size).toBe(0);
  });
});
