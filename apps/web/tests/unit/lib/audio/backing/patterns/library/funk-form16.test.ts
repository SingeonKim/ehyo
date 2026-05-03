import { describe, expect, it } from 'vitest';
import { FUNK_RHYTHM } from '@/lib/audio/backing/patterns/library/funk';

// 16bar cissy-strut-funk 형태 템플릿 (selectSlot 테스트용 최소 구조)
const TPL = { bars: 16, default_bpm: 96, progression: Array(16).fill({ chord: 'i7' }) };

describe('funk funk_form_16 variant', () => {
  it('selectSlot 매핑 — A 1-4·7-12, B 5-6, bridge 13-15, stop 16', () => {
    const map: Record<string, string> = {};
    for (let i = 0; i < 16; i++) {
      map[`bar${i + 1}`] = FUNK_RHYTHM.selectSlot(TPL, i, 'funk_form_16');
    }
    expect(map.bar1).toBe('funk_a_main');
    expect(map.bar4).toBe('funk_a_main');
    expect(map.bar5).toBe('funk_b_iv');
    expect(map.bar6).toBe('funk_b_iv');
    expect(map.bar7).toBe('funk_a_main');
    expect(map.bar12).toBe('funk_a_main');
    expect(map.bar13).toBe('funk_bridge_c');
    expect(map.bar14).toBe('funk_bridge_c');
    expect(map.bar15).toBe('funk_bridge_c');
    expect(map.bar16).toBe('funk_stop_resolve');
  });

  it('funk_stop_resolve — kick 1박만, snare 4박만, hat 비움 (stop-time)', () => {
    const slot = FUNK_RHYTHM.patterns.funk_stop_resolve;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick).toEqual([{ time: '0:0:0', velocity: 0.95 }]);
    expect(slot!.drums.snare).toEqual([{ time: '0:3:0', velocity: 0.9 }]);
    expect(slot!.drums.hat).toEqual([]);
  });

  it('funk_a_main과 funk_b_iv는 동일 그루브(harmonic만 다름)', () => {
    const a = FUNK_RHYTHM.patterns.funk_a_main;
    const b = FUNK_RHYTHM.patterns.funk_b_iv;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    // 드럼 그루브는 완전히 동일
    expect(a!.drums.kick).toEqual(b!.drums.kick);
    expect(a!.drums.snare).toEqual(b!.drums.snare);
    expect(a!.drums.hat.length).toBe(b!.drums.hat.length);
    // 베이스 라인도 동일
    expect(a!.bass.steps).toEqual(b!.bass.steps);
  });

  it('funk_bridge_c — bar 13-15 추가 액센트 (kick 4 entries)', () => {
    const slot = FUNK_RHYTHM.patterns.funk_bridge_c;
    expect(slot).toBeDefined();
    // a_main의 kick 3 + 4박-and chromatic 추가 = 4
    expect(slot!.drums.kick.length).toBe(4);
  });

  it('기존 1bar vamp variant 회귀 — 변경 0', () => {
    const tpl1 = { bars: 1, default_bpm: 96, progression: [{ chord: 'i7' }] };
    // idx 0-2: groove_a (첫 8마디 블록 내 3박), idx 3: pickup_one (4사이클 마지막)
    expect(FUNK_RHYTHM.selectSlot(tpl1, 0, undefined)).toBe('groove_a');
    expect(FUNK_RHYTHM.selectSlot(tpl1, 3, undefined)).toBe('pickup_one');
    // idx 4-6: groove_b (두 번째 8마디 블록), idx 7: pickup_one
    expect(FUNK_RHYTHM.selectSlot(tpl1, 4, undefined)).toBe('groove_b');
    expect(FUNK_RHYTHM.selectSlot(tpl1, 7, undefined)).toBe('pickup_one');
    // idx 8: groove_a 재시작
    expect(FUNK_RHYTHM.selectSlot(tpl1, 8, undefined)).toBe('groove_a');
  });
});
