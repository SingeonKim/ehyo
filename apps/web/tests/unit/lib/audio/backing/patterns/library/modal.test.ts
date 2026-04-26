import { describe, expect, it } from 'vitest';
import { MODAL_RHYTHM } from '@/lib/audio/backing/patterns/library/modal';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('MODAL_RHYTHM.selectSlot', () => {
  it('짝수 idx → groove_a', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 0)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 2)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 4)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 6)).toBe('groove_a');
  });

  it('홀수 idx → groove_b', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 1)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 3)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 5)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 7)).toBe('groove_b');
  });

  it('tpl.bars와 무관하게 절대 idx 기준 (vamp toggle)', () => {
    // modal은 로컬 인덱스가 아닌 절대 idx로 toggle
    expect(MODAL_RHYTHM.selectSlot(tpl(1), 100)).toBe('groove_a'); // 100 % 2 === 0
    expect(MODAL_RHYTHM.selectSlot(tpl(1), 101)).toBe('groove_b');
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(MODAL_RHYTHM.patterns.groove_a).toBeDefined();
    expect(MODAL_RHYTHM.patterns.groove_b).toBeDefined();
  });
});

const tpl4 = { bars: 4, default_bpm: 90, progression: Array(4).fill({ chord: 'i' }) };

describe('modal variants', () => {
  it('routes dorian_groove → dorian_groove slot', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4, 0, 'dorian_groove')).toBe('dorian_groove');
  });

  it('routes lydian_dreamy → lydian_dreamy slot', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4, 0, 'lydian_dreamy')).toBe('lydian_dreamy');
  });

  it('routes mixolydian_driving → mixolydian_driving slot', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4, 0, 'mixolydian_driving')).toBe('mixolydian_driving');
  });

  it('all 3 variant slot patterns are defined', () => {
    expect(MODAL_RHYTHM.patterns.dorian_groove).toBeDefined();
    expect(MODAL_RHYTHM.patterns.lydian_dreamy).toBeDefined();
    expect(MODAL_RHYTHM.patterns.mixolydian_driving).toBeDefined();
  });

  it('undefined variant falls back to original default (no regression)', () => {
    const slot = MODAL_RHYTHM.selectSlot(tpl4, 0);
    expect(['dorian_groove', 'lydian_dreamy', 'mixolydian_driving']).not.toContain(slot);
  });
});

// phrygian_dark 테스트용 헬퍼 — 함수 형태로 별도 정의 (위의 tpl4 객체와 구분)
const makeTpl4 = (default_bpm = 100) => ({
  bars: 4,
  default_bpm,
  progression: Array.from({ length: 4 }, (_, i) => ({ bar: i + 1, chord: 'i' })),
});

describe('modal selectSlot — phrygian_dark variant', () => {
  it('모든 idx에서 phrygian_dark 슬롯 사용', () => {
    for (const i of [0, 1, 2, 3]) {
      expect(MODAL_RHYTHM.selectSlot(makeTpl4(), i, 'phrygian_dark')).toBe('phrygian_dark');
    }
  });

  it('phrygian_dark 패턴 정의됨 (half-time)', () => {
    const pattern = MODAL_RHYTHM.patterns.phrygian_dark;
    expect(pattern).toBeDefined();
    expect(pattern?.drums.kick.length).toBe(1);
    expect(pattern?.drums.snare.length).toBeGreaterThan(0);
    expect(pattern?.drums.snare[0]?.time).toBe('0:2:0');
  });
});

describe('modal selectSlot — 기존 회귀 (4bar)', () => {
  it('variant 미지정 시 짝/홀수 toggle (4bar 진행에서도 동일)', () => {
    expect(MODAL_RHYTHM.selectSlot(makeTpl4(), 0)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(makeTpl4(), 1)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(makeTpl4(), 2)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(makeTpl4(), 3)).toBe('groove_b');
  });

  it('dorian_groove/lydian_dreamy/mixolydian_driving 분기 유지', () => {
    expect(MODAL_RHYTHM.selectSlot(makeTpl4(), 0, 'dorian_groove')).toBe('dorian_groove');
    expect(MODAL_RHYTHM.selectSlot(makeTpl4(), 0, 'lydian_dreamy')).toBe('lydian_dreamy');
    expect(MODAL_RHYTHM.selectSlot(makeTpl4(), 0, 'mixolydian_driving')).toBe('mixolydian_driving');
  });
});
