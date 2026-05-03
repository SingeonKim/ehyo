import { describe, expect, it } from 'vitest';
import { BOSSA_RHYTHM } from '@/lib/audio/backing/patterns/library/bossa';

// bossa_chromatic variant 전용 테스트. 기존 bossa 패턴 회귀도 마지막 케이스에서 검증.
const TPL = { bars: 8, default_bpm: 132, progression: Array(8).fill({ chord: 'Imaj7' }) };

describe('bossa bossa_chromatic variant', () => {
  it('selectSlot — main 1-7, resolve 8', () => {
    // bar 1~7(idx 0~6)는 bossa_chromatic_main, bar 8(idx 7)은 bossa_chromatic_resolve
    for (let i = 0; i < 7; i++) {
      expect(BOSSA_RHYTHM.selectSlot(TPL, i, 'bossa_chromatic')).toBe('bossa_chromatic_main');
    }
    expect(BOSSA_RHYTHM.selectSlot(TPL, 7, 'bossa_chromatic')).toBe('bossa_chromatic_resolve');
  });

  it('bossa_chromatic_main — guitar 마디당 4× stab on 1·2·3·4박', () => {
    // 매 마디 다른 코드(4× quick change)를 표현하기 위해 박자마다 stab
    const slot = BOSSA_RHYTHM.patterns.bossa_chromatic_main;
    expect(slot).toBeDefined();
    expect(slot!.guitar.length).toBe(4);
    expect(slot!.guitar.map((s) => s.time)).toEqual(['0:0:0', '0:1:0', '0:2:0', '0:3:0']);
    // 모두 down stab
    expect(slot!.guitar.every((s) => s.direction === 'down')).toBe(true);
  });

  it('bossa_chromatic_main — 드럼/베이스는 bossa 표준(2박 주기)', () => {
    // 기존 bossa nova 그루브와 동일 — kick/bass 모두 1박·3박
    const slot = BOSSA_RHYTHM.patterns.bossa_chromatic_main;
    expect(slot!.drums.kick.map((s) => s.time)).toEqual(['0:0:0', '0:2:0']);
    expect(slot!.bass.steps.map((s) => s.time)).toEqual(['0:0:0', '0:2:0']);
  });

  it('bossa_chromatic_resolve — bar 8 마지막 stab 강조 (vel 0.6)', () => {
    // bar 8 마지막 stab(0:3:0)을 0.5→0.6으로 올려 다음 사이클 진입 액센트
    const slot = BOSSA_RHYTHM.patterns.bossa_chromatic_resolve;
    expect(slot).toBeDefined();
    expect(slot!.guitar.length).toBe(4);
    // 마지막 stab(0:3:0) velocity가 main(0.5)보다 강함
    const lastStab = slot!.guitar[3]!;
    expect(lastStab.time).toBe('0:3:0');
    expect(lastStab.velocity).toBe(0.6);
  });

  it('기존 bossa variant 회귀', () => {
    // bossa_chromatic 분기 추가 후 기존 default(clave) 동작이 깨지지 않아야 한다
    expect(() => BOSSA_RHYTHM.selectSlot(TPL, 0, undefined)).not.toThrow();
    expect(() => BOSSA_RHYTHM.selectSlot(TPL, 7, undefined)).not.toThrow();
  });
});
