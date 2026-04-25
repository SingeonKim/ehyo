/**
 * 카테고리 → InstrumentPreset 매핑.
 *
 * GM 패치 번호 (General MIDI 표준):
 *   - drumsKit: 0 = Standard, 32 = Jazz (재즈 키트 — 브러시 sound 가까움)
 *   - bass: 32 = Acoustic Upright, 33 = Electric Finger, 34 = Electric Pick
 *   - guitar: 24 = Nylon, 25 = Steel Acoustic, 26 = Jazz, 27 = Clean Electric,
 *             28 = Muted, 29 = Overdrive, 30 = Distortion
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
  pop:   { drumsKit: 0,  bass: 33, guitar: 27, label: 'Pop · Clean Electric + Finger Bass' },
  rock:  { drumsKit: 0,  bass: 34, guitar: 27, label: 'Rock · Clean Electric + Pick Bass' },
  funk:  { drumsKit: 0,  bass: 34, guitar: 28, label: 'Funk · Muted Electric + Pick Bass' },
  jazz:  { drumsKit: 32, bass: 32, guitar: 26, label: 'Jazz · Jazz Guitar + Acoustic Bass' },
  blues: { drumsKit: 0,  bass: 33, guitar: 29, label: 'Blues · Overdrive + Finger Bass' },
  folk:  { drumsKit: 0,  bass: 33, guitar: 25, label: 'Folk · Steel Acoustic + Finger Bass' },
  bossa: { drumsKit: 0,  bass: 32, guitar: 24, label: 'Bossa · Nylon + Acoustic Bass' },
} as const satisfies Record<string, InstrumentPreset>;

export function getPreset(category: string): InstrumentPreset {
  return (CATEGORY_PRESETS as Record<string, InstrumentPreset>)[category] ?? CATEGORY_PRESETS.pop;
}
