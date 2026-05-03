import { describe, expect, it } from 'vitest';
import { FOLK_RHYTHM } from '@/lib/audio/backing/patterns/library/folk';
import { chordBassMidi } from '@/lib/theory/chord-voicing';

const TPL = { bars: 8, default_bpm: 100, progression: Array(8).fill({ chord: 'I' }) };

describe('folk travis_pick variant', () => {
  it('selectSlot — main 1-7, resolve 8', () => {
    for (let i = 0; i < 7; i++) {
      expect(FOLK_RHYTHM.selectSlot(TPL, i, 'travis_pick')).toBe('travis_main');
    }
    expect(FOLK_RHYTHM.selectSlot(TPL, 7, 'travis_pick')).toBe('travis_resolve');
  });

  it('travis_main — 드럼 비움(kick/snare/hat 모두 빈 배열)', () => {
    const slot = FOLK_RHYTHM.patterns.travis_main;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick).toEqual([]);
    expect(slot!.drums.snare).toEqual([]);
    expect(slot!.drums.hat).toEqual([]);
  });

  it('travis_main — bass 1·3박 alternating thumb (Travis 패턴)', () => {
    const slot = FOLK_RHYTHM.patterns.travis_main;
    expect(slot!.bass.steps).toEqual([
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
    ]);
  });

  it('travis_main — guitar 8th finger arpeggio 6 steps', () => {
    const slot = FOLK_RHYTHM.patterns.travis_main;
    // 1·3박은 베이스 엄지 → guitar는 그 사이 8분 6 steps
    // 패턴: 1박-and / 2박 / 2박-and / 3박-and / 4박 / 4박-and
    expect(slot!.guitar).toHaveLength(6);
    expect(slot!.guitar.map((s) => s.time)).toEqual([
      '0:0:2', '0:1:0', '0:1:2', '0:2:2', '0:3:0', '0:3:2',
    ]);
  });

  it('travis_resolve — 마지막 마디 root sustain (1박만)', () => {
    const slot = FOLK_RHYTHM.patterns.travis_resolve;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick).toEqual([]);
    expect(slot!.drums.snare).toEqual([]);
    expect(slot!.drums.hat).toEqual([]);
    expect(slot!.bass.steps).toEqual([{ time: '0:0:0', velocity: 0.95 }]);
    expect(slot!.guitar).toEqual([
      { time: '0:0:0', direction: 'down', velocity: 0.7 },
    ]);
  });

  it('슬래시 코드 bass — bar 2 I/VII에서 베이스 midi가 root와 다름 (descending bass 발현)', () => {
    // C key (root=0): I=C(midi 60 default oct 4), VII=B(midi 71)
    const rootMidi = chordBassMidi('I', 0, 4);
    const slashBassMidi = chordBassMidi('I/VII', 0, 4);
    expect(rootMidi).toBe(60);
    expect(slashBassMidi).toBe(71);
    expect(slashBassMidi).not.toBe(rootMidi);
  });

  it('슬래시 코드 bass — 진행 전체 베이스 라인 검증 (C→B→A→G→F→E→D→C)', () => {
    // C key 기준 progression의 각 마디 bass midi (oct 4)
    const expectedBassMidi = [
      ['I', 60],         // C
      ['I/VII', 71],     // B (C key의 VII = B)
      ['vim', 69],       // A (vi degree)
      ['vim/V', 67],     // G (V degree)
      ['IV', 65],        // F (IV degree)
      ['I/III', 64],     // E (III degree)
      ['iim7', 62],      // D (ii degree)
      ['I', 60],         // C
    ] as const;
    for (const [chord, expectedMidi] of expectedBassMidi) {
      expect(chordBassMidi(chord, 0, 4)).toBe(expectedMidi);
    }
  });

  it('기존 folk variant 회귀 — variant 미지정 시 throw 없음', () => {
    expect(() => FOLK_RHYTHM.selectSlot(TPL, 0, undefined)).not.toThrow();
    expect(() => FOLK_RHYTHM.selectSlot(TPL, 7, undefined)).not.toThrow();
  });
});
