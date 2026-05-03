import { describe, expect, it } from 'vitest';
import { parseRoman, romanToChord } from '@/lib/theory/chords';
import { chordBassMidi, chordSymbolToMidi } from '@/lib/theory/chord-voicing';

describe('parseRoman — slash chord', () => {
  describe('valid', () => {
    it('I/VII (C/B in C key) — major triad with VII degree bass', () => {
      const r = parseRoman('I/VII');
      expect(r).not.toBeNull();
      expect(r!.degree).toBe(1);
      expect(r!.quality).toBe('major');
      expect(r!.rootSemitones).toBe(0);
      expect(r!.bassDegree).toBe(7);
      expect(r!.bassSemitones).toBe(11);
    });

    it('vim/V (Am/G) — minor triad with V degree bass', () => {
      const r = parseRoman('vim/V');
      expect(r!.degree).toBe(6);
      expect(r!.quality).toBe('minor');
      expect(r!.rootSemitones).toBe(9);
      expect(r!.bassDegree).toBe(5);
      expect(r!.bassSemitones).toBe(7);
    });

    it('I/III (C/E) — first inversion', () => {
      const r = parseRoman('I/III');
      expect(r!.bassDegree).toBe(3);
      expect(r!.bassSemitones).toBe(4);
    });

    it('iim7/V (Dm7/G) — m7 with V bass', () => {
      const r = parseRoman('iim7/V');
      expect(r!.quality).toBe('minor7');
      expect(r!.bassDegree).toBe(5);
      expect(r!.bassSemitones).toBe(7);
    });

    it('bIII/V — flat root with V bass', () => {
      const r = parseRoman('bIII/V');
      expect(r!.degree).toBe(3);
      expect(r!.rootSemitones).toBe(3); // bIII = 4 - 1 = 3
      expect(r!.bassDegree).toBe(5);
      expect(r!.bassSemitones).toBe(7);
    });

    it('V/bVII — V with flat 7 bass', () => {
      const r = parseRoman('V/bVII');
      expect(r!.degree).toBe(5);
      expect(r!.bassDegree).toBe(7);
      expect(r!.bassSemitones).toBe(10); // bVII = 11 - 1 = 10
    });

    it('I7/V — dominant7 with V bass', () => {
      const r = parseRoman('I7/V');
      expect(r!.quality).toBe('dominant7');
      expect(r!.bassDegree).toBe(5);
    });

    it('Imaj7/III — maj7 with III bass', () => {
      const r = parseRoman('Imaj7/III');
      expect(r!.quality).toBe('major7');
      expect(r!.bassDegree).toBe(3);
    });
  });

  describe('invalid — return null', () => {
    it('rejects V/8 (invalid degree)', () => {
      expect(parseRoman('V/8')).toBeNull();
    });
    it('rejects V/ (empty bass)', () => {
      expect(parseRoman('V/')).toBeNull();
    });
    it('rejects V//VII (double slash)', () => {
      expect(parseRoman('V//VII')).toBeNull();
    });
    it('rejects /VII (no chord body)', () => {
      expect(parseRoman('/VII')).toBeNull();
    });
    it('rejects V/bb3 (invalid bass prefix)', () => {
      expect(parseRoman('V/bb3')).toBeNull();
    });
  });

  describe('non-slash chords (regression)', () => {
    it('V (no slash) leaves bassDegree undefined', () => {
      const r = parseRoman('V');
      expect(r!.bassDegree).toBeUndefined();
      expect(r!.bassSemitones).toBeUndefined();
    });
    it('iim7 (no slash) leaves bassDegree undefined', () => {
      const r = parseRoman('iim7');
      expect(r!.bassDegree).toBeUndefined();
    });
  });

  describe('romanToChord — slash retains semitones', () => {
    it('I/VII semitones는 chord triad 그대로 (베이스는 별도 필드)', () => {
      const r = romanToChord('I/VII');
      expect(r!.semitones).toEqual([0, 4, 7]);
      expect(r!.bassSemitones).toBe(11);
    });
  });
});

describe('chordBassMidi — bass voice resolver', () => {
  it('non-slash chord returns chord root midi', () => {
    // V in C key: chord root G = midi 67 (G4, default octave = 4)
    expect(chordBassMidi('V', 0, 4)).toBe(67);
  });

  it('I/VII in C returns VII bass midi (B = 71)', () => {
    expect(chordBassMidi('I/VII', 0, 4)).toBe(71);
  });

  it('vim/V in C returns V bass midi (G = 67)', () => {
    expect(chordBassMidi('vim/V', 0, 4)).toBe(67);
  });

  it('chord triad midi unchanged (regression)', () => {
    // chordSymbolToMidi는 슬래시 영향 받지 않음 — guitar voice / overlay용
    const triad = chordSymbolToMidi('I/VII', 0, 4);
    expect(triad).toEqual([60, 64, 67]); // C E G — VII bass는 별도
  });
});
