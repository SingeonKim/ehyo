import { describe, expect, it } from 'vitest';

import { CATEGORY_PRESETS, getPreset } from '@/lib/audio/backing/presets';

describe('CATEGORY_PRESETS', () => {
  it('9 카테고리 모두 정의됨 (seed의 모든 category 커버)', () => {
    expect(Object.keys(CATEGORY_PRESETS).sort()).toEqual([
      'blues', 'bossa', 'folk', 'funk', 'jazz', 'minor', 'modal', 'pop', 'rock',
    ]);
  });

  it('각 프리셋은 drumsKit/bass/guitar/label을 가짐', () => {
    for (const [name, preset] of Object.entries(CATEGORY_PRESETS)) {
      expect(preset, name).toMatchObject({
        drumsKit: expect.any(Number),
        bass: expect.any(Number),
        guitar: expect.any(Number),
        label: expect.any(String),
      });
    }
  });
});

describe('getPreset', () => {
  it('알려진 카테고리는 해당 프리셋 반환', () => {
    expect(getPreset('jazz').guitar).toBe(26);
  });

  it('알 수 없는 카테고리는 pop fallback', () => {
    expect(getPreset('unknown' as string)).toBe(CATEGORY_PRESETS.pop);
  });
});
