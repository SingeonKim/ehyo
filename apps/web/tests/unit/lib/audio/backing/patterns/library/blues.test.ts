import { describe, expect, it } from 'vitest';
import { BLUES_RHYTHM } from '@/lib/audio/backing/patterns/library/blues';

const tpl12 = (default_bpm = 100) => ({
  bars: 12,
  default_bpm,
  progression: Array.from({ length: 12 }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

// Sprint 9 PR-C: shuffle_a/shuffle_b → groove_a/groove_b 재명명.
// 옛 회귀 케이스를 새 슬롯 이름에 맞게 갱신. 신규 variant 동작은
// tests/unit/lib/audio/backing/patterns/blues.test.ts에서 별도 검증.
describe('BLUES_RHYTHM.selectSlot', () => {
  it('12bar: idx=3 (4마디, 0-based) → iv_pickup', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 3)).toBe('iv_pickup');
    // 두 번째 반복: idx=15 → local=3 → iv_pickup
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 15)).toBe('iv_pickup');
  });

  // Sprint 9 PR-D 후속(hotfix): 9·11·12마디 변주(tension/resolve/turnaround).
  // 10마디(idx=9, IV7)는 사용자 검수 결과 다이나믹 원복 — 짝/홀 alternating에 위임.
  it('12bar: idx=8 → tension (V7 빌드업)', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 8)).toBe('tension');
  });

  it('12bar: idx=9 (IV7 마디) → 일반 alternating', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 9)).toBe('groove_b');
  });

  it('12bar: idx=10 → resolve (I7 안정)', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 10)).toBe('resolve');
  });

  it('12bar: idx=11 → turnaround (V7 climax)', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 11)).toBe('turnaround');
  });

  it('12bar: 짝수 마디(분기 외) → groove_a', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 0)).toBe('groove_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 2)).toBe('groove_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 4)).toBe('groove_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 6)).toBe('groove_a');
  });

  it('12bar: 홀수 마디(분기 외) → groove_b', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 1)).toBe('groove_b');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 5)).toBe('groove_b');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 7)).toBe('groove_b');
  });

  it('non-12bar: 항상 groove_a', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl(4), 0)).toBe('groove_a');
    expect(BLUES_RHYTHM.selectSlot(tpl(4), 3)).toBe('groove_a');
    expect(BLUES_RHYTHM.selectSlot(tpl(8), 7)).toBe('groove_a');
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(BLUES_RHYTHM.patterns.groove_a).toBeDefined();
    expect(BLUES_RHYTHM.patterns.groove_b).toBeDefined();
    expect(BLUES_RHYTHM.patterns.iv_pickup).toBeDefined();
    expect(BLUES_RHYTHM.patterns.turnaround).toBeDefined();
  });
});
