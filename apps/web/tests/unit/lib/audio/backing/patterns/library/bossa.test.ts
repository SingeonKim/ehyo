import { describe, expect, it } from 'vitest';
import { BOSSA_RHYTHM } from '@/lib/audio/backing/patterns/library/bossa';

const tpl = (bars: number, default_bpm = 130) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'Imaj7' })),
});

describe('BOSSA_RHYTHM.selectSlot', () => {
  it('마지막 마디 → pickup', () => {
    expect(BOSSA_RHYTHM.selectSlot(tpl(4), 3)).toBe('pickup');
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 7)).toBe('pickup');
  });

  it('idx 0·1(Math.floor(0/2)=0 짝수) → clave_3_2', () => {
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 0)).toBe('clave_3_2'); // floor(0/2)=0
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 1)).toBe('clave_3_2'); // floor(1/2)=0
  });

  it('idx 2·3(Math.floor(2/2)=1 홀수) → clave_2_3', () => {
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 2)).toBe('clave_2_3'); // floor(2/2)=1
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 3)).toBe('clave_2_3'); // floor(3/2)=1
  });

  it('idx 4·5 → clave_3_2 (두 번째 3_2 블록)', () => {
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 4)).toBe('clave_3_2'); // floor(4/2)=2
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 5)).toBe('clave_3_2'); // floor(5/2)=2
  });

  it('idx 6 → clave_2_3 (두 번째 2_3 블록), idx 7 → pickup (8마디 기준)', () => {
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 6)).toBe('clave_2_3'); // floor(6/2)=3
    expect(BOSSA_RHYTHM.selectSlot(tpl(8), 7)).toBe('pickup');
  });

  it('aux(clave)가 모든 슬롯에 존재하고 5 노트', () => {
    // noUncheckedIndexedAccess로 인해 undefined 가능 — 비null 단언 후 검증
    expect(BOSSA_RHYTHM.patterns['clave_3_2']?.aux).toHaveLength(5);
    expect(BOSSA_RHYTHM.patterns['clave_2_3']?.aux).toHaveLength(5);
    expect(BOSSA_RHYTHM.patterns['pickup']?.aux).toHaveLength(5);
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(BOSSA_RHYTHM.patterns.clave_3_2).toBeDefined();
    expect(BOSSA_RHYTHM.patterns.clave_2_3).toBeDefined();
    expect(BOSSA_RHYTHM.patterns.pickup).toBeDefined();
  });
});
