/**
 * 카테고리 → InstrumentPreset 매핑.
 *
 * GM 패치 번호 (General MIDI 표준):
 *   - drumsKit: 0 = Standard, 8 = Room, 16 = Power, 24 = Electronic, 25 = TR-808
 *   - bass: 32 = Acoustic Upright, 33 = Electric Finger, 34 = Electric Pick
 *   - guitar: 24 = Nylon, 25 = Steel Acoustic, 26 = Jazz, 27 = Clean Electric,
 *             28 = Muted, 29 = Overdrive, 30 = Distortion
 *
 * surikov CDN의 drum kit 가용성:
 *   sound/128{note}_{kit}_FluidR3_GM_sf2_file.js 패턴에서 kit=0,8,16,24,25만
 *   모든 노트(36 kick, 38 snare, 42 hat) 파일이 존재. kit=32(Jazz) 이상은
 *   파일 자체가 없어 404 → loadPreset이 reject로 카드가 무음. 따라서 jazz
 *   카테고리도 drumsKit=0(Standard)을 사용한다. 재즈 특유의 브러시 사운드는
 *   Sprint 2-8(RhythmRecipe + 사운드폰트 교체) 단계에서 복원 예정.
 *
 * 카테고리는 ProgressionTemplate.category 값. 알려지지 않은 카테고리는
 * pop fallback — 모든 카드가 최소한 들리도록 보장.
 */

export type InstrumentPreset = {
  drumsKit: number;
  bass: number;
  guitar: number;
  label: string;
};

export const CATEGORY_PRESETS = {
  pop:   { drumsKit: 0, bass: 33, guitar: 27, label: 'Pop · Clean Electric + Finger Bass' },
  rock:  { drumsKit: 0, bass: 34, guitar: 27, label: 'Rock · Clean Electric + Pick Bass' },
  funk:  { drumsKit: 0, bass: 34, guitar: 28, label: 'Funk · Muted Electric + Pick Bass' },
  // jazz: surikov가 kit=32 파일을 보유하지 않아 임시로 Standard kit 사용. Sprint 2-8에서 교체.
  jazz:  { drumsKit: 0, bass: 32, guitar: 26, label: 'Jazz · Jazz Guitar + Acoustic Bass' },
  blues: { drumsKit: 0, bass: 33, guitar: 29, label: 'Blues · Overdrive + Finger Bass' },
  folk:  { drumsKit: 0, bass: 33, guitar: 25, label: 'Folk · Steel Acoustic + Finger Bass' },
  bossa: { drumsKit: 0, bass: 32, guitar: 24, label: 'Bossa · Nylon + Acoustic Bass' },
  minor: { drumsKit: 0, bass: 33, guitar: 27, label: 'Minor · Clean Electric + Finger Bass' },
  modal: { drumsKit: 0, bass: 33, guitar: 27, label: 'Modal · Clean Electric + Finger Bass' },
} as const satisfies Record<string, InstrumentPreset>;

export function getPreset(category: string): InstrumentPreset {
  return (CATEGORY_PRESETS as Record<string, InstrumentPreset>)[category] ?? CATEGORY_PRESETS.pop;
}
