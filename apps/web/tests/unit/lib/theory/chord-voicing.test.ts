import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OCTAVE,
  chordSymbolToMidi,
  getAppropriateNotes,
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

describe('getAppropriateNotes — chord tones', () => {
  it('I in C / scale=major / category=pop → root=0, tones={4,7}, colorTones={2}', () => {
    const r = getAppropriateNotes('I', 0 as PitchClass, 'pop');
    expect(r.chordRoot).toBe(0);
    expect([...r.chordTones].sort((a, b) => a - b)).toEqual([4, 7]);
    expect([...r.colorTones].sort((a, b) => a - b)).toEqual([2]); // major triad의 9
  });

  it('V7 in C / category=jazz → alt 텐션이 colorTones에 포함', () => {
    // V7 = G7 (root=7), chord tones = {7, 11, 2, 5}
    // Jazz dominant7 추가: G+1=Ab, G+3=Bb, G+6=C#, G+8=Eb
    // 합쳐 chord tones 제외 → 다양한 alt가 colorTones에 들어감.
    const r = getAppropriateNotes('V7', 0 as PitchClass, 'jazz');
    expect(r.chordRoot).toBe(7);
    expect([...r.chordTones].sort((a, b) => a - b)).toEqual([2, 5, 11]);
    const colors = [...r.colorTones].sort((a, b) => a - b);
    // alt b9, #9, #11, b13 = pcs 8, 10, 1, 3 (이 중 chord tones와 겹치는 건 없음)
    expect(colors).toContain(1);  // C# = #11
    expect(colors).toContain(3);  // Eb = b13
    expect(colors).toContain(8);  // Ab = b9
    expect(colors).toContain(10); // Bb = #9
    // Part A에서 9th(A=9), 13th(E=4) 도 들어감 — 4는 chord tone이라 제외, 9는 colorTones
    expect(colors).toContain(9);  // E = 13 (Wait — actually E=4 is chord tone, 9 is A which is 9th. Recompute)
    // Note: chord tones are {7, 11, 2, 5}. A=9 is NOT in chord tones, so 9 is in colorTones.
  });

  it('I7 in A blues / scale=minor_pentatonic → universal blues notes 포함', () => {
    // I7 = A7 (root=9, tones=1=C#, 4=E, 7=G)
    // blues universal [3,6,10] applied to keyRoot 9 → [0(C), 3(Eb), 7(G)]
    // G(7) is chord tone so it's removed. C(0), Eb(3) remain.
    const r = getAppropriateNotes('I7', 9 as PitchClass, 'blues');
    expect(r.chordRoot).toBe(9);
    const colors = [...r.colorTones].sort((a, b) => a - b);
    expect(colors).toContain(0); // b3 of A = C
    expect(colors).toContain(3); // b5 of A = Eb
  });

  it('Dorian Im7 / category=modal → colorTones는 Part A만 (Part B/C는 비어있음)', () => {
    // Im7 in D dorian (keyRoot=2): chord tones = D, F, A, C → pcs include {2(root), 5, 9, 0}
    // chordTones (root 제외) = {5, 9, 0}
    // Part A minor7: [2,5,9] → relative to chord root D(2): pcs 4, 7, 11 (E, G, B)
    // None collide with chord tones.
    const r = getAppropriateNotes('Im7', 2 as PitchClass, 'modal');
    expect(r.chordRoot).toBe(2);
    const colors = [...r.colorTones].sort((a, b) => a - b);
    expect(colors).toEqual([4, 7, 11]); // Part A only — Part B/C empty for modal
  });

  it('I in C / category=folk → colorTones는 Part A의 9만', () => {
    const r = getAppropriateNotes('I', 0 as PitchClass, 'folk');
    expect(r.chordRoot).toBe(0);
    expect([...r.chordTones].sort((a, b) => a - b)).toEqual([4, 7]);
    expect([...r.colorTones]).toEqual([2]);
  });

  it('파싱 실패 → chordRoot=null, chordTones·colorTones 비어있음', () => {
    const r = getAppropriateNotes('???', 0 as PitchClass, 'pop');
    expect(r.chordRoot).toBeNull();
    expect(r.chordTones.size).toBe(0);
    expect(r.colorTones.size).toBe(0);
  });

  it('chordTones와 colorTones는 항상 disjoint, chordRoot도 colorTones에 없음', () => {
    // 어떤 코드/카테고리에서도 같은 pc가 두 집합에 들어가면 안 됨.
    const r = getAppropriateNotes('Imaj7', 0 as PitchClass, 'blues');
    const tones = new Set(r.chordTones);
    for (const c of r.colorTones) {
      expect(tones.has(c)).toBe(false);
    }
    if (r.chordRoot !== null) {
      expect(r.colorTones.has(r.chordRoot)).toBe(false);
    }
  });
});
