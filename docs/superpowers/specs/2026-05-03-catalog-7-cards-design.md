# Sprint 11 Design — 카탈로그 +7장 (idiom 다변화)

> **Goal:** 카탈로그 22장 → 29장. jazz · minor · funk · bossa · folk · rock 6개 카테고리에 각 1~2장의 신규 카드를 더해, 카드 단위 *idiom 정통성*을 한 단계 끌어올린다. 모든 신규 카드는 **신규 rhythm variant**를 동반하며 8/16 마디 long-form 위주.

**Date:** 2026-05-03
**Sprint:** 11 (Phase 4 후속)
**Status:** Approved (사용자 승인 — 섹션 1~4)

---

## 1. 개요와 배경

### 현재 상태 (Sprint 10 + 후속 머지)

- 카탈로그 **22장 / 9 카테고리**.
- bossa / funk / jazz / minor 각 **1장**으로 가장 비어 있음.
- folk 2장 (`folk-I-IV-V` 4bar strum, `ballad-I-V-vi-IV` 8bar fingerpick).
- rock 2장 (`rock-I-bVII-IV` 4bar mixo, `rock-12-bar` 12bar Chuck Berry).
- 8bar+ long-form은 ballad 1장 + 12bar blues 8장이 전부 — 다른 장르의 *연속 연습용 long loop*가 부족.
- card-profiles 시스템(Sprint 9 도입) + swing/triplet8(Sprint 9) + 절대 볼륨 통일(Sprint 10 후속)이 안정 상태.

### 사용자 요구

1. **카드 +7장** — jazz +1, minor +1, funk +1, bossa +1, folk +1, rock +2.
2. **8 마디 이상** (12 / 16 도 허용) — long-form 위주.
3. **도메인 깊게 조사** — Sprint 9 hard-bop / jump 수준의 정통성.
4. **카드마다 신규 variant** (그루브 자체가 idiom의 본질).

### 결정 요약 (브레인스토밍 합의)

| 축 | 선택 | 이유 |
|---|---|---|
| 신규 카테고리 추가 여부 | **추가 안 함** | 카테고리 신설은 라이브러리 + bundle + tone defaults 동반. 1~2장 위해 ROI 안 나옴. 9 카테고리로 idiom 다양성 충분 |
| 그루브 정책 | **A. 카드마다 신규 variant** | "도메인 깊게" 사용자 요구 + Sprint 9 깊이 유지 |
| 카드별 idiom 선택 | jazz=Autumn Leaves form, minor=Epic Cinematic, funk=Cissy Strut form, bossa=major chromatic Ipanema, folk=Travis pick, rock=power ballad + punk | 카탈로그가 빠져 있던 *대표 idiom* 충원. 기존 카드와 정체성 충돌 없음 |
| 코드 표기 | **영문 통일** (`Imaj7`, `viim7b5`, `vii°7`) + 슬래시 코드(`I/VII`) 도입 | 파서가 영문 alias 이미 지원. 슬래시는 인프라 작업으로 신규 도입 |
| 슬래시 코드 처리 | **A. 파서 확장** | Travis picking의 descending bass(`C→B→A→G→F→E→D→C`)가 idiom 본질. 향후 jazz walking bass 재활용 |
| Punk power chord | **engine guitar voice에 `voicingMode` 옵션 도입** (들어보고 원복 가능) | 정통성 시도, 청취 후 원복 비용 낮음 |
| 브랜치 전략 | **`feat/catalog-7-cards` 통합 브랜치 + 8 sub-PR + 1 통합 PR** | main이 자동 배포되어 직접 머지 위험. sub-task별 독립 검토 |
| 테스트 강도 | **단위 + 컴포넌트 + 오디오 spy + E2E 카테고리당 1장 (총 6 E2E)** | CI 시간 +30초 수용 |

---

## 2. 아키텍처 개요

**한 줄 요약:** 카드 7장이 추가되며, 각 카드는 카테고리별 패턴 라이브러리에 신규 variant 1개씩을 넣는다. 인프라 변경은 **3개 — chord 파서 슬래시 확장 / engine guitar `voicingMode` 옵션 / drums tom·crash dynamic lookup**. 카탈로그·시드·DB 스키마 변경 없음 (catalog.json에 7 entry 추가만, 마이그레이션 0).

### 데이터 흐름 (변화 없음 — 추가만)

```
catalog.json (7 entry 추가)
   └─ seed.py (idempotent upsert) → DB.progression_templates
   └─ FE 정적 import → ProgressionCatalog 렌더

slug → CardProfile lookup (CARD_PROFILES + 7 entry 추가)
        ├─ rhythmVariant   → CategoryRhythm.selectSlot(tpl, idx, variant)
        │                       (selectSlot에 variant별 분기 추가)
        ├─ toneProfile     → reverbWet (카드별)
        └─ instrumentOverrides → guitar instrument 교체 (power-ballad 한정)

engine.start
  └─ ensureVoices → fxChain.input
  └─ loadBundle(ctx, bundle, fxChain.input)
  └─ resolveCardProfile(slug, category) → variant + tone + bundle
  └─ scheduleBar(idx) → selectSlot(tpl, idx, variant) → 슬롯
                      → voice trigger (drums/bass/guitar/aux)
                      → guitar voice가 voicingMode 옵션 받음 (slot이 명시)
                      → drums voice가 tom/crash sample 동적 lookup
                      → bass voice가 slash 코드의 bassSemitones override 적용
```

### 변경 범위 매트릭스

| 레이어 | 변경 | 파일 |
|---|---|---|
| 음악 이론 (theory) | 슬래시 코드 파싱 + chord-display Roman↔Absolute | `lib/theory/chords.ts`, `lib/theory/chord-display.ts` |
| 오디오 voice | guitar `voicingMode`, drums tom/crash lookup, bass slash override | `lib/audio/backing/voices/{guitar,drums,bass}.ts` |
| 패턴 라이브러리 | 신규 variant 7개 (슬롯 + selectSlot 분기) | `patterns/library/{jazz,minor,funk,bossa,folk,rock}.ts` |
| swing | jazz `autumn_leaves` perVariant 0.62 | `patterns/library/jazz.ts` (CategoryRhythm.swing) |
| 카드 프로필 | 신규 7 entry | `lib/audio/backing/card-profiles.ts` |
| 카탈로그 | 신규 7 entry | `apps/web/lib/api/catalog.json` |
| 시드 | 변경 없음 (catalog.json 자동 반영) | `apps/api/app/scripts/seed.py` |
| Alembic | **변경 없음** (스키마 변경 0) | — |
| 테스트 | 단위 + 컴포넌트 + 오디오 spy + E2E (카테고리당 1장) | `tests/unit/**`, `tests/component/**`, `tests/e2e/**` |

---

## 3. 카드 7장 데이터 스펙

### 3.1 `autumn-leaves` (jazz, 16bar, 90bpm)

```json
{
  "slug": "autumn-leaves",
  "name": "Autumn Leaves (16-bar form)",
  "category": "jazz",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 90,
  "recommended_scales": ["dorian", "harmonic_minor", "natural_minor"],
  "progression": [
    { "bar": 1,  "chord": "iim7" },     { "bar": 2,  "chord": "V7" },
    { "bar": 3,  "chord": "Imaj7" },    { "bar": 4,  "chord": "IVmaj7" },
    { "bar": 5,  "chord": "viim7b5" },  { "bar": 6,  "chord": "III7" },
    { "bar": 7,  "chord": "vim7" },     { "bar": 8,  "chord": "vim7" },
    { "bar": 9,  "chord": "iim7" },     { "bar": 10, "chord": "V7" },
    { "bar": 11, "chord": "Imaj7" },    { "bar": 12, "chord": "IVmaj7" },
    { "bar": 13, "chord": "viim7b5" },  { "bar": 14, "chord": "III7" },
    { "bar": 15, "chord": "vim7" },     { "bar": 16, "chord": "vim7" }
  ]
}
```

**근거:** 재즈 학생이 가장 많이 연주하는 standard 1순위. relative major(I)와 minor(vi) 사이 ii-V 피벗 학습. recommended `dorian` 첫 항목 = vi 기반 솔로의 가장 안전한 선택.

### 3.2 `epic-minor-cinematic` (minor, 16bar, 70bpm)

```json
{
  "slug": "epic-minor-cinematic",
  "name": "Epic Minor (Cinematic 16-bar)",
  "category": "minor",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 70,
  "recommended_scales": ["natural_minor", "harmonic_minor", "minor_pentatonic"],
  "progression": [
    { "bar": 1,  "chord": "i" },   { "bar": 2,  "chord": "VI" },
    { "bar": 3,  "chord": "III" }, { "bar": 4,  "chord": "VII" },
    { "bar": 5,  "chord": "iv" },  { "bar": 6,  "chord": "VI" },
    { "bar": 7,  "chord": "VII" }, { "bar": 8,  "chord": "i" },
    { "bar": 9,  "chord": "i" },   { "bar": 10, "chord": "VI" },
    { "bar": 11, "chord": "III" }, { "bar": 12, "chord": "VII" },
    { "bar": 13, "chord": "iv" },  { "bar": 14, "chord": "V" },
    { "bar": 15, "chord": "V" },   { "bar": 16, "chord": "i" }
  ]
}
```

**근거:** bar 14·15의 V는 harmonic minor의 dominant — 학습자가 phrygian dominant 도수 자연스럽게 도출. 기존 `minor-i-VI-III-VII`(4bar Russian/Pachelbel feel)와 정반대 색.

### 3.3 `cissy-strut-funk` (funk, 16bar, 96bpm)

```json
{
  "slug": "cissy-strut-funk",
  "name": "Cissy Strut Funk (16-bar form)",
  "category": "funk",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 96,
  "recommended_scales": ["dorian", "minor_pentatonic", "minor_blues"],
  "progression": [
    { "bar": 1,  "chord": "i7" },    { "bar": 2,  "chord": "i7" },
    { "bar": 3,  "chord": "i7" },    { "bar": 4,  "chord": "i7" },
    { "bar": 5,  "chord": "iv7" },   { "bar": 6,  "chord": "iv7" },
    { "bar": 7,  "chord": "i7" },    { "bar": 8,  "chord": "i7" },
    { "bar": 9,  "chord": "i7" },    { "bar": 10, "chord": "i7" },
    { "bar": 11, "chord": "i7" },    { "bar": 12, "chord": "i7" },
    { "bar": 13, "chord": "bIII7" }, { "bar": 14, "chord": "iv7" },
    { "bar": 15, "chord": "V7" },    { "bar": 16, "chord": "i7" }
  ]
}
```

**근거:** The Meters / Crescent City funk form. 1bar vamp(`funk-i7-vamp`)와 차별 — song form 함의 + bar 16 stop-time이 funk 본질의 한 축.

### 3.4 `bossa-major-ipanema` (bossa, 8bar, 132bpm)

```json
{
  "slug": "bossa-major-ipanema",
  "name": "Bossa Nova (Major Chromatic 8-bar)",
  "category": "bossa",
  "bars": 8,
  "time_signature": "4/4",
  "default_bpm": 132,
  "recommended_scales": ["major", "lydian", "major_pentatonic"],
  "progression": [
    { "bar": 1, "chord": "Imaj7" }, { "bar": 2, "chord": "II7" },
    { "bar": 3, "chord": "iim7" },  { "bar": 4, "chord": "bII7" },
    { "bar": 5, "chord": "Imaj7" }, { "bar": 6, "chord": "II7" },
    { "bar": 7, "chord": "iim7" },  { "bar": 8, "chord": "bII7" }
  ]
}
```

**근거:** Girl from Ipanema A섹션 패밀리 — descending chromatic(`I→II→ii→bII→I`). bII7은 V7의 tritone substitution. 기존 `bossa-i-iv-ii-v`(minor key, Black Orpheus)와 major↔minor 색 분리.

### 3.5 `travis-pick-folk` (folk, 8bar, 100bpm)

```json
{
  "slug": "travis-pick-folk",
  "name": "Travis Picking (Fingerstyle 8-bar)",
  "category": "folk",
  "bars": 8,
  "time_signature": "4/4",
  "default_bpm": 100,
  "recommended_scales": ["major", "major_pentatonic", "mixolydian"],
  "progression": [
    { "bar": 1, "chord": "I" },      { "bar": 2, "chord": "I/VII" },
    { "bar": 3, "chord": "vim" },    { "bar": 4, "chord": "vim/V" },
    { "bar": 5, "chord": "IV" },     { "bar": 6, "chord": "I/III" },
    { "bar": 7, "chord": "iim7" },   { "bar": 8, "chord": "I" }
  ]
}
```

**근거:** Dust in the Wind / Anji 스타일. 베이스 라인 `C→B→A→G→F→E→D→C` 완전 하강 — Travis picking idiom의 본질. 기존 folk 2장은 strumming 기반이라 fingerstyle은 새 차원.

### 3.6 `power-ballad-rock` (rock, 16bar, 75bpm)

```json
{
  "slug": "power-ballad-rock",
  "name": "Power Ballad (16-bar)",
  "category": "rock",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 75,
  "recommended_scales": ["major", "minor_pentatonic", "natural_minor"],
  "progression": [
    { "bar": 1,  "chord": "vim" }, { "bar": 2,  "chord": "IV" },
    { "bar": 3,  "chord": "I" },   { "bar": 4,  "chord": "V" },
    { "bar": 5,  "chord": "vim" }, { "bar": 6,  "chord": "IV" },
    { "bar": 7,  "chord": "I" },   { "bar": 8,  "chord": "V" },
    { "bar": 9,  "chord": "IV" },  { "bar": 10, "chord": "I" },
    { "bar": 11, "chord": "V" },   { "bar": 12, "chord": "vim" },
    { "bar": 13, "chord": "bVII" },{ "bar": 14, "chord": "V" },
    { "bar": 15, "chord": "I" },   { "bar": 16, "chord": "I" }
  ]
}
```

**근거:** November Rain / Stairway 패밀리. half-time + clean arpeggio로 기존 rock 2장(distortion strum)과 dynamic 정반대.

### 3.7 `punk-garage-rock` (rock, 8bar, 170bpm)

```json
{
  "slug": "punk-garage-rock",
  "name": "Punk / Garage (8-bar)",
  "category": "rock",
  "bars": 8,
  "time_signature": "4/4",
  "default_bpm": 170,
  "recommended_scales": ["major_pentatonic", "minor_pentatonic", "mixolydian"],
  "progression": [
    { "bar": 1, "chord": "I" },  { "bar": 2, "chord": "IV" },
    { "bar": 3, "chord": "V" },  { "bar": 4, "chord": "V" },
    { "bar": 5, "chord": "I" },  { "bar": 6, "chord": "IV" },
    { "bar": 7, "chord": "V" },  { "bar": 8, "chord": "I" }
  ]
}
```

**근거:** Ramones 4-chord. power ballad와 정반대 끝점 — rock 카테고리 BPM 범위 확장(75~170). 코드 표기는 `I` (파서가 `I5` 미지원이라 power chord 보이싱은 variant 내 `voicingMode='power'`로 처리).

---

## 4. 패턴 라이브러리 신규 variant 7개

### 4.1 variant + 슬롯 + selectSlot 매트릭스

| 카드 | variant | 슬롯 → 사용 마디 | swing | 핵심 차별 |
|---|---|---|---|---|
| autumn-leaves | `autumn_leaves` (jazz.ts) | `autumn_walk` 1-15, `autumn_turnaround` 16 | **0.62** (perVariant) | walk보다 sparse(Freddie Green 2박만, 4박 drop), brush snare velocity 0.25 |
| epic-minor-cinematic | `epic_minor_halftime` (minor.ts) | `epic_main` 1-12·14-15, `epic_climax` 13, `epic_resolve` 16 | straight | half-time(kick 1+3, snare 3만), hat 4분만, climax/resolve에 tom 강조 |
| cissy-strut-funk | `funk_form_16` (funk.ts) | `funk_a_main` 1-4·7-12, `funk_b_iv` 5-6, `funk_bridge_c` 13-15, `funk_stop_resolve` 16 (**stop-time**) | straight | bar 16 stop-time(kick 1박만, snare 4박만, hat 비움) |
| bossa-major-ipanema | `bossa_chromatic` (bossa.ts) | `bossa_chromatic_main` 1-7, `bossa_chromatic_resolve` 8 | straight | 기존 bossa 드럼/베이스 + guitar comp 마디당 4× stab |
| travis-pick-folk | `travis_pick` (folk.ts) | `travis_main` 1-7, `travis_resolve` 8 | straight | **드럼 비움**, bass alternating(slash bass override 활용), guitar 8분 finger arpeggio |
| power-ballad-rock | `power_ballad` (rock.ts) | `pb_intro` 1-4, `pb_main` 5-12, `pb_climax` 13-15, `pb_resolve` 16 | straight | half-time, clean arpeggio guitar(instrument override), pb_climax는 hat 8분 + tom fills |
| punk-garage-rock | `punk_8th` (rock.ts) | `punk_main` 1-7, `punk_climax` 8 | straight | hat 8분 16 hits, kick 4박, snare 2+4, guitar 8분 down-only distortion + `voicingMode='power'` |

### 4.2 selectSlot 분기 패턴

```typescript
// jazz.ts
if (variant === 'autumn_leaves') {
  return idx % tpl.bars === tpl.bars - 1 ? 'autumn_turnaround' : 'autumn_walk';
}
// 기존 walk/walk_approach 분기 그대로 유지

// minor.ts
if (variant === 'epic_minor_halftime') {
  const local = idx % tpl.bars;
  if (local === 12) return 'epic_climax';   // bar 13
  if (local === 15) return 'epic_resolve';  // bar 16
  return 'epic_main';
}

// funk.ts
if (variant === 'funk_form_16') {
  const local = idx % tpl.bars;
  if (local === 15) return 'funk_stop_resolve';      // bar 16
  if (local >= 12) return 'funk_bridge_c';            // 13-15
  if (local === 4 || local === 5) return 'funk_b_iv'; // 5-6
  return 'funk_a_main';                                // 1-4, 7-12
}

// bossa.ts
if (variant === 'bossa_chromatic') {
  return idx % tpl.bars === tpl.bars - 1 ? 'bossa_chromatic_resolve' : 'bossa_chromatic_main';
}

// folk.ts
if (variant === 'travis_pick') {
  return idx % tpl.bars === tpl.bars - 1 ? 'travis_resolve' : 'travis_main';
}

// rock.ts
if (variant === 'power_ballad') {
  const local = idx % tpl.bars;
  if (local <= 3) return 'pb_intro';        // 1-4
  if (local === 15) return 'pb_resolve';
  if (local >= 12) return 'pb_climax';      // 13-15
  return 'pb_main';                          // 5-12
}
if (variant === 'punk_8th') {
  return idx % tpl.bars === tpl.bars - 1 ? 'punk_climax' : 'punk_main';
}
```

### 4.3 swing perVariant — jazz.ts

```typescript
// 기존
swing: { default: 0.66 }

// 변경
swing: { default: 0.66, perVariant: { autumn_leaves: 0.62 } }
```

`resolveSwing` 함수가 perVariant를 이미 지원 — 회귀 테스트 1건만 추가.

---

## 5. 사전 인프라 작업 (3건)

신규 카드 작업 *전*에 머지되어야 하는 인프라.

### 5.1 chord 파서 슬래시 확장 (PR-A)

**범위:** `lib/theory/chords.ts` + `lib/theory/chord-display.ts` + 테스트

**파서 변경 (`chords.ts`):**

```typescript
export interface ParsedChord {
  degree: number;
  rootSemitones: number;
  quality: ChordQuality;
  semitones: readonly number[];
  /** 슬래시 코드의 베이스 도수 (1~7). 없으면 undefined. */
  bassDegree?: number;
  /** 베이스의 반음 오프셋 (0~11, prefix b/# 적용 후). */
  bassSemitones?: number;
}

// parseRoman / romanToChord에 '/' suffix 처리:
// 1. 입력 분해: 'V/VII' → { chord: 'V', bass: 'VII' }
// 2. 베이스 부분도 도수 + b/# prefix 파싱 (chord 본체와 동일 로직 재사용)
// 3. bass의 quality는 무시 (베이스는 단음)
// 4. 미지/잘못된 베이스(예: 'V/8', 'V/', 'V//VII')는 null 반환
```

**`chord-display.ts` 확장:** Roman ↔ Absolute 변환 시 슬래시 코드도 round-trip — `I/VII` (key C) ↔ `C/B`. 베이스 부분은 별도 `pitchClassToLabel` 적용.

**bass voice override (`voices/bass.ts` 또는 engine bass scheduling):** ParsedChord에 `bassSemitones`가 있으면 root 대신 사용. 기존 패턴(없으면 root) 폴백.

**테스트:**
- `chords.test.ts`: `I/VII`, `vim/V`, `I/III`, `iim7/V`, `bIII/V`, `V/bVII` 등 +15 케이스 / invalid 거부 +5 케이스
- `chord-display.test.ts`: round-trip C key + F♯ key 등 +5 케이스
- bass voice 단위: `bassSemitones` 우선 사용 +3 케이스

### 5.2 voice 확장 (PR-B)

**범위:** `voices/guitar.ts` + `voices/drums.ts` + 테스트

**`voices/guitar.ts` — voicingMode 옵션:**

```typescript
type GuitarStrumOptions = {
  // ...existing
  voicingMode?: 'full' | 'power';  // default 'full'
};

// strum 함수 내부:
//   'full': chord.semitones 전체 사용 (기존 동작)
//   'power': root + perfect 5th만 사용 (즉 semitones[0]과 +7 반음)
```

**`voices/drums.ts` — tom/crash dynamic lookup:**

```typescript
// 기존 resolveHatNote 패턴 그대로 확장
const TOM_CACHE = new WeakMap<DrumMachine, string>();
const CRASH_CACHE = new WeakMap<DrumMachine, string>();

function resolveTomNote(dm: DrumMachine): string {
  const cached = TOM_CACHE.get(dm);
  if (cached) return cached;
  const candidates = ['tom-mid', 'tom-low', 'tom-high', 'tom', 'snare-l'];  // 폴백: low snare
  const found = candidates.find((c) => dm.sampleNames.includes(c)) ?? 'snare';
  TOM_CACHE.set(dm, found);
  return found;
}

function resolveCrashNote(dm: DrumMachine): string {
  const cached = CRASH_CACHE.get(dm);
  if (cached) return cached;
  const candidates = ['crash', 'crash-1', 'crash-2', 'cymbal', 'clap'];  // 폴백: clap → snare
  const found = candidates.find((c) => dm.sampleNames.includes(c)) ?? 'snare';
  CRASH_CACHE.set(dm, found);
  return found;
}
```

**사전 sample 검증:** PR-B 작업 시작 시 LM-2 / TR-808 / Roland CR-8000의 `dm.json` 다운로드해서 tom·crash 존재 확인.

```bash
curl https://smpldsnds.github.io/drum-machines/LM-2/dm.json | jq '.sampleNames'
curl https://smpldsnds.github.io/drum-machines/TR-808/dm.json | jq '.sampleNames'
curl https://smpldsnds.github.io/drum-machines/Roland-CR-8000/dm.json | jq '.sampleNames'
```

결과 — 어느 kit에도 tom/crash가 부재면 *문제 보고 후* 카드 패턴에서 해당 voice를 빼고 snare만 사용하는 쪽으로 fallback (PR-D / PR-H에서 반영).

**테스트:**
- guitar voicingMode='power' → 2 노트만 트리거 +3 케이스
- drum tom/crash lookup → kit 모킹으로 +6 케이스

---

## 6. 카드 7장 본 작업 (PR C ~ H)

### 6.1 PR별 변경

| PR | 변경 파일 | LOC |
|---|---|---|
| **C**. card-autumn-leaves | `catalog.json`, `jazz.ts` (variant + slot + swing perVariant + selectSlot 분기), `card-profiles.ts` | +120 |
| **D**. card-epic-minor | `catalog.json`, `minor.ts`, `card-profiles.ts` | +130 |
| **E**. card-cissy-strut | `catalog.json`, `funk.ts`, `card-profiles.ts` | +160 |
| **F**. card-bossa-major | `catalog.json`, `bossa.ts`, `card-profiles.ts` | +90 |
| **G**. card-travis-pick | `catalog.json`, `folk.ts`, `card-profiles.ts` | +130 |
| **H**. cards-rock-pair | `catalog.json` (2 entry), `rock.ts` (2 variant), `card-profiles.ts` (2 entry) | +220 |

### 6.2 `CARD_PROFILES` 신규 7 entry

```typescript
'autumn-leaves': {
  rhythmVariant: 'autumn_leaves',
  toneProfile: { reverbWet: 0.20 },  // jazz default 0.22 → 0.20 (Blue Note dry)
},
'epic-minor-cinematic': {
  rhythmVariant: 'epic_minor_halftime',
  toneProfile: { reverbWet: 0.35 },  // minor default 0.18 → 0.35 (cinematic hall)
},
'cissy-strut-funk': {
  rhythmVariant: 'funk_form_16',
  // funk default 0.12 그대로
},
'bossa-major-ipanema': {
  rhythmVariant: 'bossa_chromatic',
  // bossa default 0.20 그대로
},
'travis-pick-folk': {
  rhythmVariant: 'travis_pick',
  toneProfile: { reverbWet: 0.25 },  // folk default 0.18 → 0.25 (intimate)
},
'power-ballad-rock': {
  rhythmVariant: 'power_ballad',
  toneProfile: { reverbWet: 0.30 },  // rock default 0.14 → 0.30
  instrumentOverrides: {
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
},
'punk-garage-rock': {
  rhythmVariant: 'punk_8th',
  toneProfile: { reverbWet: 0.08 },  // 카탈로그 최저 — punk dry
},
```

### 6.3 catalog.json 추가 위치

기존 카테고리 클러스터 사이에 idiom 비슷한 카드 옆 배치 — 카탈로그 UI에서 사용자 인지 자연스럽게.

---

## 7. 테스트 계획

### 7.1 단위 테스트 (Vitest)

| 영역 | 신규 테스트 |
|---|---|
| `chords.test.ts` | 슬래시 파싱 +15 케이스 (valid + invalid) |
| `chord-display.test.ts` | 슬래시 round-trip +5 케이스 (C / F♯ key) |
| `voices/bass.test.ts` | bassSemitones override +3 케이스 |
| `voices/guitar.test.ts` | voicingMode='power' +3 케이스 |
| `voices/drums.test.ts` | tom/crash lookup +6 케이스 (kit 모킹) |
| `swing.test.ts` | jazz autumn_leaves perVariant 0.62 +1 케이스 |
| `patterns/library/{jazz,minor,funk,bossa,folk,rock}.test.ts` | selectSlot 매핑 +7 케이스 (각 신규 variant별 16/8 idx → 슬롯 검증) |
| `card-profiles.test.ts` | 신규 7 entry 검증 (rhythmVariant 정의됨, instrumentOverrides 유효 instrument 이름) |

### 7.2 컴포넌트 테스트 (Testing Library)

- 카탈로그 카드 22→29장 — `ProgressionCatalog` 렌더 카드 수 회귀 1건
- 신규 카드 슬러그 버튼 click → `useAppStore.getState().backing.activeSlug` 갱신 확인 +7 케이스 (가벼운 smoke)

### 7.3 오디오 타이밍 테스트 (`createSchedulerSpy`)

- **funk_stop_resolve**: 16번째 마디에 kick 1개 + snare 1개 + hat 0개 검증
- **power_ballad pb_climax vs pb_intro**: hat 8분 16 hits vs 4분 4 hits 차이 검증
- **travis_pick**: 드럼 0개, bass slash 인버전 발현 확인 (bar 2 `I/VII`에서 베이스 root semitone +11 = VII)
- **autumn_leaves swing**: parseBeatStep 결과의 8th off-beat 시각이 0.62 비율인지 검증
- **punk_8th**: hat 8분 16 hits 모두 down-stroke velocity 0.6+ 검증
- **epic_minor halftime vs straight**: 같은 카테고리 다른 카드 대비 kick·snare 시각 배열 차이 검증

### 7.4 E2E (Playwright Docker, 카테고리당 1장 = 6 테스트)

`jam-card-profiles.spec.ts` 확장 — jazz / minor / funk / bossa / folk / rock 각 1장씩:

```typescript
const NEW_CARDS_E2E = [
  { slug: 'autumn-leaves',       category: 'jazz',  bars: 16 },
  { slug: 'epic-minor-cinematic',category: 'minor', bars: 16 },
  { slug: 'cissy-strut-funk',    category: 'funk',  bars: 16 },
  { slug: 'bossa-major-ipanema', category: 'bossa', bars: 8 },
  { slug: 'travis-pick-folk',    category: 'folk',  bars: 8 },
  { slug: 'power-ballad-rock',   category: 'rock',  bars: 16 },  // rock 대표 1장
];

// 각 카드: 카드 click → ▶ → 4초 대기 → bar counter 'bar X/<bars>' 갱신 확인 + console error 0건
```

**rock 2장 중 power-ballad만 E2E** — punk는 단위/오디오 spy로 커버. 향후 회귀 발견 시 추가.

기존 22장 카드도 회귀 통과 보장.

### 7.5 API 테스트 (pytest)

- `test_progression_templates.py`: GET `/progression-templates` 응답에 신규 7 슬러그 포함 확인 (seed 정상 upsert)

---

## 8. 브랜치 · 워크플로우

### 8.1 브랜치 트리

```
main  (auto-deploy, 보호)
 │
 └── feat/catalog-7-cards   ← 통합 브랜치
      │
      ├── feat/parser-slash-chord       (PR-A)
      ├── feat/voice-extensions         (PR-B)
      ├── feat/card-autumn-leaves       (PR-C)
      ├── feat/card-epic-minor          (PR-D)
      ├── feat/card-cissy-strut         (PR-E)
      ├── feat/card-bossa-major         (PR-F)
      ├── feat/card-travis-pick         (PR-G)
      └── feat/cards-rock-pair          (PR-H)
                       │
                       └─ 통합 검증 후 → PR-I (catalog-7-cards → main, squash)
```

### 8.2 의존성 그래프

```
[A] parser-slash-chord     ─┐
                            ├─→ [C-H] 카드 6 PR (병렬)  ─→ [I] 통합 → main
[B] voice-extensions       ─┘
```

A·B 파일 겹침 없음 → **병렬 가능**. 둘 다 머지된 뒤 카드 6 PR 병렬(파일 겹침 없음).

### 8.3 에이전트 리뷰 매트릭스

| 작업 | 리뷰 에이전트 |
|---|---|
| PR-A | `music-theory-guardian` (필수) + `test-strategist` |
| PR-B | `web-audio-engineer` (필수) + `test-strategist` |
| PR-C ~ H | `web-audio-engineer` (필수) + `music-theory-guardian` (코드 진행 정통성) + `test-strategist` |
| catalog.json 변경 | `backend-architect` (seed 정합성) |
| PR-I 통합 | 위 모두 + `aesthetic-reviewer` (UI 회귀) |

### 8.4 통합 검증 체크리스트 (PR-I main 머지 직전)

- [ ] `feat/catalog-7-cards`에서 `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` 모두 green
- [ ] `cd apps/api && uv run pytest` green
- [ ] `pnpm screenshots` 14장 회귀 (기존 셀렉터 깨짐 없음)
- [ ] **사용자 청취**: 신규 7장 각 30초 재생 → 정체성 식별 가능한지 (특히 funk stop-time, travis bass 하강, punk power chord, power-ballad 청결 arpeggio, autumn-leaves swing feel)
- [ ] `__assertCardProfilesMatch` console.warn 없음 (dev 모드)
- [ ] localStorage 스키마 v12 그대로

---

## 9. 위험 · 완화

| # | 위험 | 영향 | 완화 |
|---|---|---|---|
| 1 | smplr DrumMachine kit별 tom/crash sample 부재 | epic_climax / pb_climax / punk_climax 무음 | PR-B 시작 시 `dm.json` dump로 사전 검증. 부재 시 `snare-l`/`clap`/`snare` 폴백 우선순위 명시 |
| 2 | chord-voicing(fretboard chord overlay)이 슬래시 베이스 반영 필요? | Travis pick에서 fretboard root ring이 G인지 B인지 | **이번 스코프는 audio 한정**. fretboard overlay는 triad root 그대로 표시. 슬래시는 bass voice만 영향 (디커플링) |
| 3 | Punk power chord voicingMode 청취 결과 별로일 수 있음 | punk 정체성 약화 | PR-H 별도 분리되어 원복 비용 낮음. voicingMode 옵션 자체는 유지 (향후 metal/grunge 카드용). 원복 시 `'full'` default 사용 |
| 4 | CI 시간 증가 | E2E 6 카테고리 추가 ~30초 | 수용. 1분 미만 |
| 5 | 카탈로그 UI 카드 수 불균형 (rock 4 / blues 8 / 그 외 1~2) | 시각적 imbalance | 도메인 다양성 > UI 균형. 향후 sprint에서 분포 조정 |
| 6 | 슬래시 코드 표기 round-trip — Roman ↔ Absolute 토글에서 `I/VII` → `C/B` 정상 변환 | 사용자 혼란 | PR-A에 `chord-display.ts` 함수 확장 포함. 단위 테스트 +5 케이스 |
| 7 | 카탈로그 시드 idempotent — 신규 7 슬러그 중복 없음 | seed.py가 skip 안 함 | 슬러그 컨벤션 점검 — 기존 22 슬러그와 중복 없음 확인. PR-I에서 `uv run python -m app.scripts.seed` dry-run 검증 |
| 8 | jazz 카테고리 swing perVariant 도입으로 기존 jazz 카드들이 영향 받을지 | 회귀 위험 | `resolveSwing(rhythm, variant)` 호출부에서 variant가 perVariant 키에 없으면 default 폴백 (이미 그렇게 구현됨). 기존 jazz 카드들의 variant는 `walk` / `walk_approach` 등이라 영향 없음. 회귀 테스트 1건 추가 |

---

## 10. YAGNI / 후속 분리

이번 스펙에 *포함하지 않는* 것:

- 신규 카테고리 추가 (country, R&B, latin 외, reggae 등)
- jazz brush 복원 (Sprint 2-8 후속 별도)
- random comping fills (Sprint 9 후보)
- piano voice (jazz comping)
- voice별 EQ / humanize
- 카드 즐겨찾기 / 사용자 정의 카드 저장 (Phase 5+ 인증 도입 후)
- chord-overlay에 슬래시 베이스 표시 (audio만 우선)

---

## 11. 변경 영향 요약

| 영역 | 변경 |
|---|---|
| 카탈로그 | 22 → 29 |
| 카테고리 | 9 (변경 없음) |
| 카드 분포 | jazz 1→2, minor 1→2, funk 1→2, bossa 1→2, folk 2→3, rock 2→4 (blues / pop / modal 변경 없음) |
| 패턴 라이브러리 | +7 variant / +18 슬롯 / +6 selectSlot 분기 |
| swing | jazz perVariant 1건 신규 |
| 코드 파서 | 슬래시 지원 (+30줄) |
| voice 확장 | guitar voicingMode + drums tom/crash lookup |
| DB 스키마 | 변경 없음 (마이그레이션 0) |
| localStorage 스키마 | 변경 없음 (v12 유지) |
| 테스트 | +60 단위 / +1 컴포넌트 / +6 오디오 spy / +6 E2E / +1 API |

---

## 12. 작업 순서 (Plan 단계 입력)

1. **PR-A** parser-slash-chord (인프라, 병렬)
2. **PR-B** voice-extensions (인프라, 병렬, sample dump 사전 검증 포함)
3. **PR-C ~ H** 카드 6 PR (PR-A·B 머지 후 병렬 — worktree 권장)
4. **PR-I** 통합 검증 + main 머지 (단일 squash PR)

각 PR은 자체 단위·컴포넌트·오디오 spy 테스트 포함. E2E는 PR-I 통합 단계에서 일괄 추가.
