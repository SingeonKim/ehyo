import { describe, expect, it } from 'vitest';
import { FOLK_RHYTHM } from '@/lib/audio/backing/patterns/library/folk';

const tpl4 = (default_bpm = 95) => ({
  bars: 4,
  default_bpm,
  progression: Array.from({ length: 4 }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('FOLK_RHYTHM.selectSlot', () => {
  it('마지막 마디 → pickup', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 3)).toBe('pickup');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 7)).toBe('pickup');
  });

  it('짝수 마디(마지막 제외) → picking', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 0)).toBe('picking');
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 2)).toBe('picking');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 0)).toBe('picking');
  });

  it('홀수 마디(마지막 제외) → strum_8th', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 1)).toBe('strum_8th');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 1)).toBe('strum_8th');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 3)).toBe('strum_8th');
  });

  it('picking 슬롯은 드럼 없음', () => {
    // noUncheckedIndexedAccess 대응 — optional chaining 사용
    expect(FOLK_RHYTHM.patterns['picking']?.drums.kick).toHaveLength(0);
    expect(FOLK_RHYTHM.patterns['picking']?.drums.snare).toHaveLength(0);
    expect(FOLK_RHYTHM.patterns['picking']?.drums.hat).toHaveLength(0);
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(FOLK_RHYTHM.patterns.picking).toBeDefined();
    expect(FOLK_RHYTHM.patterns.strum_8th).toBeDefined();
    expect(FOLK_RHYTHM.patterns.pickup).toBeDefined();
  });
});

describe('folk selectSlot — folk_strum variant', () => {
  it('모든 idx에서 folk_strum 슬롯 사용 (짝/홀 토글 우회)', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 0, 'folk_strum')).toBe('folk_strum');
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 1, 'folk_strum')).toBe('folk_strum');
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 2, 'folk_strum')).toBe('folk_strum');
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 3, 'folk_strum')).toBe('folk_strum');
  });

  it('folk_strum 패턴 정의됨', () => {
    expect(FOLK_RHYTHM.patterns.folk_strum).toBeDefined();
    expect(FOLK_RHYTHM.patterns.folk_strum?.drums.kick.length).toBeGreaterThan(0);
  });
});

describe('folk selectSlot — ballad_pick variant (Sprint 10 PR-D 짝/홀 변주)', () => {
  const tpl8 = {
    bars: 8,
    default_bpm: 70,
    progression: Array.from({ length: 8 }, (_, i) => ({ bar: i + 1, chord: 'I' })),
  };

  it('짝수 idx → ballad_pick_a (표준)', () => {
    for (const i of [0, 2, 4, 6]) {
      expect(FOLK_RHYTHM.selectSlot(tpl8, i, 'ballad_pick')).toBe('ballad_pick_a');
    }
  });

  it('홀수 idx → ballad_pick_b (4박-and pickup)', () => {
    for (const i of [1, 3, 5, 7]) {
      expect(FOLK_RHYTHM.selectSlot(tpl8, i, 'ballad_pick')).toBe('ballad_pick_b');
    }
  });

  it('ballad_pick_a/b 둘 다 정의 + half-time kick 1박만', () => {
    expect(FOLK_RHYTHM.patterns.ballad_pick_a).toBeDefined();
    expect(FOLK_RHYTHM.patterns.ballad_pick_b).toBeDefined();
    expect(FOLK_RHYTHM.patterns.ballad_pick_a?.drums.kick.length).toBe(1);
    expect(FOLK_RHYTHM.patterns.ballad_pick_b?.drums.kick.length).toBe(1);
    expect(FOLK_RHYTHM.patterns.ballad_pick_a?.drums.kick[0]?.time).toBe('0:0:0');
  });

  it('ballad_pick_a snare = 3박 backbeat 1개 (half-time)', () => {
    const snare = FOLK_RHYTHM.patterns.ballad_pick_a?.drums.snare ?? [];
    expect(snare.length).toBe(1);
    expect(snare[0]?.time).toBe('0:2:0');
  });

  it('ballad_pick_b는 4박-and pickup 추가 (snare/hat/bass/guitar 끝에 ghost)', () => {
    const b = FOLK_RHYTHM.patterns.ballad_pick_b;
    // snare 4박-and ghost
    expect(b?.drums.snare.some((s) => s.time === '0:3:2')).toBe(true);
    // bass 4박-and pickup
    expect(b?.bass.steps.some((s) => s.time === '0:3:2')).toBe(true);
    // guitar 4박-and up strum
    expect(b?.guitar.some((s) => s.time === '0:3:2' && s.direction === 'up')).toBe(true);
  });
});
