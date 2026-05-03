import { describe, expect, it } from 'vitest';
import { romanToAbsolute, displayChord } from '@/lib/theory/chord-display';

describe('chord-display — slash chord', () => {
  it('I/VII in C → C/B', () => {
    expect(romanToAbsolute('I/VII', 0)).toBe('C/B');
  });

  it('vim/V in C → Am/G', () => {
    expect(romanToAbsolute('vim/V', 0)).toBe('Am/G');
  });

  it('I/III in C → C/E', () => {
    expect(romanToAbsolute('I/III', 0)).toBe('C/E');
  });

  it('Imaj7/V in C → Cmaj7/G', () => {
    expect(romanToAbsolute('Imaj7/V', 0)).toBe('Cmaj7/G');
  });

  it('I/VII in F# (key=6) — sharp key', () => {
    // F# key는 sharp key (isFlatKey false). F# major + VII = E# = F (반음 5)
    const result = romanToAbsolute('I/VII', 6);
    expect(result).toMatch(/^F#\/F$/); // F# major + VII = F (실제 F#의 VII는 E#=F)
  });

  it('displayChord roman mode normalizes case and preserves slash', () => {
    // normalizeRomanCase는 대소문자를 정규화하므로 vim → VIm. 슬래시 부분도 함께 보존.
    // vim/V → VIm/V (minor = 소문자 표기 → 대문자 도수 + m suffix)
    expect(displayChord('vim/V', 0, 'roman')).toBe('VIm/V');
  });

  it('non-slash chord 회귀 — V → G', () => {
    expect(romanToAbsolute('V', 0)).toBe('G');
  });
});
