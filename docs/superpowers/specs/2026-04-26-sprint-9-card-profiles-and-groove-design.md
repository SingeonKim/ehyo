# Sprint 9 Design — Card Profiles & Groove Authenticity

> **Goal:** 카탈로그 17장이 *카테고리 단위 default* 위에 *카드별 변주(variant + 톤 + 옵셔널 instrument override)*를 얹어 각자의 정체성을 갖게 한다. 동시에 패턴 표현력의 한계(셔플 long-short feel을 표현 못 함)를 그루브 표현 모델 도입으로 해소한다.

**Date:** 2026-04-26
**Sprint:** 9 (Phase 4 후속)
**Status:** Approved (사용자 승인)

---

## 1. 개요와 배경

### 현재 상태 (Sprint 2-8 머지 후)

- 백엔드 정적 카탈로그 17장. 9개 카테고리(pop/rock/funk/jazz/blues/folk/bossa/minor/modal) 중 7개에 카드 분포.
- 카테고리당 단일 `CategoryRhythm` (`patterns + selectSlot`). 같은 카테고리의 카드는 모두 같은 슬롯/같은 리듬을 받는다.
- 모든 카테고리·variant가 16분 sub 표기 (`'bar:beat:sub'`)만 사용. swing/triplet 표현 없음.
- 결과: blues `12-bar-blues-major`와 `slow-minor-blues`가 동일한 그루브로 들림. 셔플은 4분주 straight로 평탄화.
- Master FX(compressor + reverb wet 0.18) 단일값. 카드/카테고리별 wet 차등 없음.

### 사용자 요구

1. **A. 카드별 리듬 차등** (Task #65) — 같은 카테고리에서도 카드마다 다른 그루브
2. **B. 음질 디테일** (일부) — 카드별 톤 차등(velocityScale, voiceGain, reverbWet)도 함께
3. **카테고리 default 자체의 도메인 정확성 업그레이드** — blues 셔플은 4분주가 아닌 long-short 12/8 feel이 정통

### 결정 요약 (브레인스토밍 합의)

| 축 | 선택 | 이유 |
|---|---|---|
| Sprint 9 메인 테마 | A(카드별 리듬) + B(톤 디테일 일부) | 사용자 명시적 요구. 카드 정체성은 리듬+톤이 함께 만들어짐 |
| 차등 범위 | 리듬 + 톤 + 옵셔널 instrument override | 같은 카테고리 안에서 instrument 교체는 1~2장만 → 인스턴스 폭발 없음 |
| 데이터 위치 | 프론트 정적 매핑(`card-profiles.ts`) | 백엔드 책임 = 카탈로그 한정 원칙 유지. 마이그레이션·API 회귀 0 |
| 톤 파라미터 범위 | velocityScale + voiceGain + reverbWet | voice/FX 토폴로지 변경 없음. EQ/humanize는 후속 |
| 카드 적용 범위 | 17장 전수 등재(빈 객체 가능) | 가시성·완결성. 비슷한 값을 공유하는 카드 다수 허용 |
| 그루브 표현 | swing 메타데이터(A) + triplet8 unit(C) 하이브리드 | swing은 글로벌 캐릭터, triplet은 step 의도 — 직교. 패턴 재작성 최소화 |
| jazz brush 복원 | Sprint 9 제외 | 음원 자산 작업이라 결이 다름. 별도 sub-task |

---

## 2. 아키텍처 개요

**한 줄 요약:** 카드 프로필 시스템을 도입해 카테고리 default 위에 카드별 override를 얹는다. 변경 범위는 *프론트 audio 레이어*에 한정 — DB·API·Zustand 스토어는 손대지 않는다.

### 데이터 흐름

```
slug → CardProfile lookup (lib/audio/backing/card-profiles.ts)
        ├─ rhythmVariant?  → CategoryRhythm.selectSlot(tpl, idx, variant)
        ├─ toneProfile?    → voice trigger 시 velocity·gain에, fxChain.wetGain에 반영
        └─ instrumentOverrides? → loadBundle() 시 카테고리 default 일부 교체

(별도 차원) variant → CategoryRhythm.swing.perVariant?[variant] ?? swing.default
                  → parseBeatStep(notation, bpm, beatsPerBar, { unit, swing })
```

### 책임 경계

| 모듈 | 책임 |
|---|---|
| `card-profiles.ts` | 카드 슬러그 → CardProfile. 도메인 리서치 메모는 주석으로 |
| `presets.ts` | 카테고리 default ToneProfile + InstrumentBundle. 신규 export `CATEGORY_TONE_DEFAULTS` |
| `profile-merge.ts` | `resolveCardProfile`, `resolveSwing` — 머지·룩업 순수 함수 |
| `engine.ts` | slug 받아 두 레이어 머지 → voice/FX에 적용 |
| 패턴 라이브러리 9개 | `selectSlot` 시그니처 확장(`variant?`), variant 풀은 카테고리 자유 정의, swing 프로필 선언 |
| `patterns/types.ts` | BeatStep `unit?`, `parseBeatStep` 시그니처 확장(`{ unit, swing }`), `CategoryRhythm.swing` |
| voice 4종 | `setVoiceGain(scale)`, `trigger(..., velocityScale)` 추가 |
| 테스트 | Vitest 단위·통합, Playwright 스모크 |

### 의도적으로 안 하는 것

- DB 스키마 변경, API 변경, generated.ts 재생성
- voice별 EQ, humanize, jazz brush 복원
- 신규 카드 추가 (Sprint 10 후보)
- 16분 트리플렛(`triplet16`), swing의 16분 off-beat 적용

---

## 3. 데이터 모델

### 3.1. CardProfile — `apps/web/lib/audio/backing/card-profiles.ts` (신규)

```ts
import type { InstrumentBundle } from './presets';

export type ToneProfile = {
  velocityScale: number;
  voiceGain: { drums: number; bass: number; guitar: number; aux: number };
  reverbWet: number;
};

export type CardProfile = {
  rhythmVariant?: string;
  toneProfile?: Partial<ToneProfile> & {
    voiceGain?: Partial<ToneProfile['voiceGain']>;
  };
  instrumentOverrides?: Partial<InstrumentBundle>;
};

/**
 * 17장 카탈로그 카드 슬러그 → 프로필.
 * 빈 객체 등재 = 카테고리 default 그대로 사용한다는 명시적 선언.
 */
export const CARD_PROFILES: Readonly<Record<string, CardProfile>> = {
  // 17장 (Section 6 카드 매핑 표 참조)
};
```

### 3.2. CATEGORY_TONE_DEFAULTS — `presets.ts` 확장

```ts
export const CATEGORY_TONE_DEFAULTS: Readonly<Record<RhythmCategory, ToneProfile>> = {
  pop:    { velocityScale: 1.0,  voiceGain: { drums: 1.0,  bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.18 },
  rock:   { velocityScale: 1.1,  voiceGain: { drums: 1.05, bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.14 },
  funk:   { velocityScale: 1.05, voiceGain: { drums: 1.0,  bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.12 },
  jazz:   { velocityScale: 0.95, voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.22 },
  blues:  { velocityScale: 1.0,  voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.05, aux: 1.0 }, reverbWet: 0.22 },
  folk:   { velocityScale: 0.95, voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.18 },
  bossa:  { velocityScale: 0.9,  voiceGain: { drums: 0.9,  bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.20 },
  minor:  { velocityScale: 1.0,  voiceGain: { drums: 1.0,  bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.18 },
  modal:  { velocityScale: 1.0,  voiceGain: { drums: 1.0,  bass: 1.0, guitar: 1.0,  aux: 1.0 }, reverbWet: 0.18 },
};
```

### 3.3. profile-merge.ts (신규, 순수 함수)

```ts
export function resolveCardProfile(slug: string, category: RhythmCategory): {
  variant: string | undefined;
  tone: ToneProfile;
  bundle: InstrumentBundle;
} {
  const profile = CARD_PROFILES[slug] ?? {};
  const categoryTone = CATEGORY_TONE_DEFAULTS[category];
  const categoryBundle = CATEGORY_BUNDLES[category];

  return {
    variant: profile.rhythmVariant,
    tone: {
      velocityScale: profile.toneProfile?.velocityScale ?? categoryTone.velocityScale,
      voiceGain: { ...categoryTone.voiceGain, ...(profile.toneProfile?.voiceGain ?? {}) },
      reverbWet: profile.toneProfile?.reverbWet ?? categoryTone.reverbWet,
    },
    bundle: { ...categoryBundle, ...(profile.instrumentOverrides ?? {}) },
  };
}

export function resolveSwing(category: RhythmCategory, variant: string | undefined): number {
  const sw = CATEGORY_RHYTHMS[category].swing;
  if (!sw) return 0.5;
  if (variant && sw.perVariant?.[variant] !== undefined) return sw.perVariant[variant];
  return sw.default;
}
```

- 얕은 머지 + voiceGain만 한 단계 깊은 머지
- 결정론. 같은 input → 같은 output
- slug not found → 빈 프로필 fallback. dev에서 `__assertCardProfilesMatch(catalogSlugs)`로 누락 경고

### 3.4. dev 슬러그 정합성 가드

```ts
export function __assertCardProfilesMatch(catalogSlugs: readonly string[]): void {
  if (process.env.NODE_ENV === 'production') return;
  const profileSlugs = new Set(Object.keys(CARD_PROFILES));
  const missing = catalogSlugs.filter((s) => !profileSlugs.has(s));
  const extra = [...profileSlugs].filter((s) => !catalogSlugs.includes(s));
  if (missing.length || extra.length) {
    console.warn('[CARD_PROFILES] mismatch', { missing, extra });
  }
}
```

빌드 타임 검증 대안도 가능하지만 백엔드 의존이라 보류. unit test에서 generated.ts의 slug 목록과 비교로 충분.

---

## 4. 그루브 표현 (swing + triplet unit)

### 4.1. BeatStep 모델 확장 — `patterns/types.ts`

```ts
export type BeatStep = {
  time: string;                        // 'bar:beat:sub'
  unit?: 'sub16' | 'triplet8';         // default 'sub16' (생략 시 기존 동작)
  velocity?: number;
};
```

- `unit` 생략 = `sub16` = 기존 16분 sub 동작 → 9개 카테고리 default 패턴 회귀 없음
- `triplet8`은 한 박을 3등분: sub 0/1/2 → 0, 1/3, 2/3박 위치
- StrumStep, AuxStep도 BeatStep 상속하므로 자동 전파

### 4.2. parseBeatStep 시그니처

```ts
export function parseBeatStep(
  notation: string,
  bpm: number,
  beatsPerBar = 4,
  opts?: { unit?: 'sub16' | 'triplet8'; swing?: number },
): number {
  const { unit = 'sub16', swing = 0.5 } = opts ?? {};
  const parts = notation.split(':').map(Number);
  const [bars = 0, beats = 0, subs = 0] = parts;

  const beatSec = 60 / bpm;
  let subFrac: number;

  if (unit === 'triplet8') {
    subFrac = subs / 3;            // 0/1/2 → 0, 1/3, 2/3
  } else {
    subFrac = subs / 4;
    if (swing !== 0.5 && subs === 2) {
      subFrac = swing;             // 8분 off-beat을 swing 비율로 밀기
    }
  }

  return bars * beatsPerBar * beatSec + beats * beatSec + subFrac * beatSec;
}
```

기존 dev 가드(`Number.isFinite`, `bpm > 0`) 유지. swing 범위 가드(`0.5 ≤ swing ≤ 0.75`) 추가.

### 4.3. CategoryRhythm.swing — `patterns/types.ts`

```ts
export interface CategoryRhythm {
  patterns: Readonly<Record<string, BarPattern>>;
  swing?: { default: number; perVariant?: Record<string, number> };
  selectSlot: (tpl, barIndexAbs, variant?: string) => string;
}
```

### 4.4. 카테고리별 swing 기본값

| 카테고리 | swing default | 메모 |
|---|---|---|
| pop | 0.50 | straight 8th |
| rock | 0.50 | straight |
| funk | 0.50 | 16th funk straight |
| jazz | 0.66 | 정통 swing |
| blues | 0.66 | 셔플 표준 |
| folk | 0.50 | straight |
| bossa | 0.50 | straight 16th |
| minor | 0.50 | straight |
| modal | 0.50 | straight |

variant override (`perVariant`에 등록할 항목 — default와 다른 것만):
- blues `hard_bop`: 0.62 (lighter swing)
- blues `jump`: 0.55 (driving, 거의 straight)
- blues `slow`/`shuffle12bar`/`straight_shuffle`/`major_swing`은 카테고리 default(0.66) 그대로 사용 → 등록 불필요

### 4.5. 엔진 적용 — `engine.ts`

```ts
const swing = resolveSwing(tpl.category, variant);
// step 트리거 시
const t0 = barStart + parseBeatStep(step.time, bpm, 4, { unit: step.unit, swing });
voice.trigger(t0, ...);
```

`unit`/`swing`은 패턴 데이터와 무관하게 voice 외부에서 결정 → voice 코드 변경 0. parseBeatStep 한 군데만 확장.

---

## 5. 엔진 통합

### 5.1. 카드 시작 시 dispatch — `engine.ts`

```ts
const { variant, tone, bundle } = resolveCardProfile(tpl.slug, tpl.category);
const loaded = await loadBundle(bundle);

fxChain.wetGain.gain.setValueAtTime(tone.reverbWet, ctx.currentTime);
voices.drums.setVoiceGain(tone.voiceGain.drums);
voices.bass.setVoiceGain(tone.voiceGain.bass);
voices.guitar.setVoiceGain(tone.voiceGain.guitar);
voices.aux?.setVoiceGain(tone.voiceGain.aux);

// BarScheduler 루프
const slot = CATEGORY_RHYTHMS[tpl.category].selectSlot(tpl, barIdxAbs, variant);
const pattern = CATEGORY_RHYTHMS[tpl.category].patterns[slot];
voices.drums.trigger(step, tone.velocityScale);
```

### 5.2. Voice 인터페이스 보강

각 voice(`drums.ts`, `bass.ts`, `guitar.ts`, `aux.ts`)에 추가:

```ts
setVoiceGain(scale: number): void;            // gain 노드 setValueAtTime
trigger(step, velocityScale = 1): void;       // 기존 velocity * velocityScale
```

`setVoiceGain`은 voice 내부 GainNode에 `setValueAtTime(scale, ctx.currentTime)` — 카드 전환 시 호출. 마디 중간 변경은 안 함.

### 5.3. FX wetGain 카드별 변경

`fxChain.wetGain.gain.setValueAtTime(tone.reverbWet, ctx.currentTime)`. 추가 노드 없음.

### 5.4. 카드 전환 라이프사이클

1. 이전 카드 hardStop (Sprint 2-8에서 잡은 동작)
2. 새 카드 `resolveCardProfile(slug, category)` → variant + tone + bundle
3. `loadBundle(bundle)` — instrumentOverride 있으면 새 Soundfont 인스턴스 캐시 로드/생성
4. tone 적용(wetGain + voiceGain)
5. BarScheduler 시작 — 매 마디 `selectSlot(tpl, idx, variant)`

### 5.5. 의도적으로 안 하는 것

- velocity 곱셈을 voice 외부에서 미리 계산 — voice 내부 단일 책임
- wetGain ramp(linearRampToValueAtTime) — 카드 전환은 hardStop 끝난 시점이라 즉시 setValueAtTime이면 충분

---

## 6. 17장 카드 프로필 매핑

### 6.1. 카테고리 default 도메인 업그레이드

| 카테고리 | swing default | 패턴 변경 사항 |
|---|---|---|
| **blues** | 0.66 | `groove_a` hat에 sub 2 추가(off-beat 명시) → swing 0.66 적용 시 long-short feel. snare backbeat sub 0 유지 |
| **jazz** | 0.66 | `walk` ride를 4분주 → 8분 sub 0,2 (ride 패턴화). swing 0.66 자동 적용 |
| 그 외 7개 | 0.50 | 변경 없음 — straight 그대로 |

### 6.2. blues 카테고리 (8장) — variant 풀

| slug | variant | swing | unit 사용 | tone delta | instr override |
|---|---|---|---|---|---|
| `12-bar-blues-major` | `shuffle12bar`(default) | 0.66 | sub16 | — | — |
| `12-bar-blues-minor` | `shuffle12bar` | 0.66 | sub16 | reverbWet 0.24 | — |
| `12-bar-blues-quick-change` | `shuffle12bar` | 0.66 | sub16 | — | — |
| `slow-minor-blues` | `slow` | 0.66 | **triplet8 ride 명시** | velocityScale 0.85, drums 0.85, reverbWet 0.30 | guitar→`electric_guitar_clean` |
| `hard-bop-minor-blues` | `hard_bop` | 0.62 | **triplet8 ride 가운데 음 강타** | drums 0.95, reverbWet 0.20 | — |
| `shuffle-minor-blues` | `straight_shuffle` | 0.66 | sub16 (16th hat 추가) | velocityScale 1.05 | — |
| `jazz-major-blues` | `major_swing` | 0.66 | sub16 + walking bass | velocityScale 0.95, reverbWet 0.25 | guitar→`jazz_guitar` |
| `jump-blues` | `jump` | 0.55 | sub16 (driving 8th) | velocityScale 1.15, drums 1.1, reverbWet 0.10 | — |

**variant별 패턴 작성 요지:**
- `shuffle12bar` (기존 보강): hat sub 0+2, snare backbeat, kick 1/3, swing 0.66 자동 적용
- `slow`: drums sparse(kick 1, snare 3), ride **triplet8 unit** — `[{time:'0:0:0', unit:'triplet8'}, {time:'0:0:2', unit:'triplet8'}]` × 4박
- `hard_bop`: ride **triplet8** 모든 음 명시(`0:0:0`, `0:0:1`, `0:0:2`) — 가운데 음 ghost(velocity 0.4), 양 끝 0.8
- `straight_shuffle`: 기존 `groove_b`에 16th hat 추가
- `major_swing`: jazz의 walk + comp을 blues 진행에 맞춤(walk_approach 사용)
- `jump`: kick driving 8th, hat sub 0+2 strong

### 6.3. pop (2장)

| slug | variant | swing | tone delta |
|---|---|---|---|
| `pop-I-V-vi-IV` | default | 0.50 | — |
| `50s-I-vi-IV-V` | `50s_doo_wop` | 0.50 | velocityScale 0.9, reverbWet 0.25 |

`50s_doo_wop` variant: drums half-time feel(snare on 3 only, kick 1+3), guitar 4분주 뮤트.

### 6.4. jazz / minor / funk / bossa (각 1장)

| slug | variant | swing | unit | tone delta | instr |
|---|---|---|---|---|---|
| `jazz-ii-V-I` | default | 0.66 | **triplet8 ride** | velocityScale 0.95, reverbWet 0.22 | — |
| `minor-i-VI-III-VII` | default | 0.50 | sub16 | — | — |
| `funk-i7-vamp` | default | 0.50 | sub16 | velocityScale 1.1, drums 1.05, guitar 1.1, reverbWet 0.12 | — |
| `bossa-i-iv-ii-v` | default | 0.50 | sub16 | velocityScale 0.85, drums 0.85, reverbWet 0.25 | — |

### 6.5. modal (3장)

| slug | variant | swing | tone delta |
|---|---|---|---|
| `dorian-vamp` | `dorian_groove` | 0.50 | drums 1.05, guitar 1.1 |
| `lydian-vamp` | `lydian_dreamy` | 0.50 | velocityScale 0.9, reverbWet 0.30 |
| `mixolydian-vamp` | `mixolydian_driving` | 0.50 | velocityScale 1.05, drums 1.05 |

modal selectSlot 분기:
- `dorian_groove`: 16th hat + funk-influenced
- `lydian_dreamy`: ride bell + soft strums
- `mixolydian_driving`: straight 8th + heavier guitar

### 6.6. 패턴 데이터 변경량

| 작업 | 대상 | 개수 |
|---|---|---|
| 신규 variant 패턴 작성 | blues 6 + pop 1 + modal 3 | **10개** |
| 카테고리 default 보강 | blues `groove_a` hat sub 2 추가, jazz `walk` ride 8분주화 | **2건** |
| triplet8 unit 활용 | blues `slow`/`hard_bop`, jazz default | **3개 패턴 일부 step** |
| instrument override | `slow-minor-blues` (clean), `jazz-major-blues` (jazz_guitar) | **2장** |
| 변경 없음 | funk, minor, bossa, rock, folk 카테고리 default | — |

---

## 7. 테스트 전략

### 7.1. 단위 테스트 (Vitest)

| 대상 | 검증 |
|---|---|
| `parseBeatStep` | unit=sub16 + swing=0.5 회귀 / swing 0.66 시 sub 2가 0.66박 / unit=triplet8 시 sub 0/1/2 → 0, 1/3, 2/3박 / dev 가드 |
| `resolveSwing(category, variant)` | 카테고리 default / variant override / 미정의 fallback |
| `resolveCardProfile(slug, category)` | 빈 프로필 → 카테고리 default / 부분 override → 머지 / voiceGain 한 단계 깊은 머지 / instrumentOverrides 얕은 머지 |
| `CARD_PROFILES` 정합성 | generated.ts 슬러그 17개 vs `Object.keys(CARD_PROFILES)` 일치 |
| 9개 `selectSlot` 결정론 | 카테고리별 (tpl, idx, variant) → slot 매핑 테이블화 |

### 7.2. 패턴 데이터 회귀

`tests/unit/lib/audio/backing/patterns/*.test.ts`에 카테고리별 default 회귀 케이스 추가 — 9개 카테고리 default 슬롯이 swing 적용 후에도 의도대로 변경되는지.

특히:
- pop/funk/modal/folk/minor/bossa: swing=0.5 → 결과 회귀 0
- blues `groove_a` 보강 후: hat이 sub 0과 sub 2를 모두 치며, swing 0.66 적용 시 sub 2가 0.5박 → 0.66박으로 밀림

### 7.3. 통합 테스트 (Vitest, schedulerSpy)

`tests/unit/lib/audio/backing/engine.test.ts` 확장:
- 카드 시작 시 `fxChain.wetGain.gain` 값이 `tone.reverbWet`으로 설정
- 카드 시작 시 voice별 `setVoiceGain(scale)` 호출
- voice trigger 시 velocity가 `pattern.velocity * tone.velocityScale`로 곱
- 카드 전환 시 hardStop 후 새 tone 즉시 반영
- variant가 selectSlot에 정확히 흘러갔는지 (mock으로 검증)

### 7.4. E2E 스모크 (Playwright, Docker)

`tests/e2e/jam-card-profiles.spec.ts` 신규:
- /jam 진입 → blues 카드 5장 순차 클릭 → 각 카드 재생 1초 → 정지
- 정지 시 trailing 음 없는지 (Sprint 2-8 회귀 재방어)
- instrument override 카드 진입 시 오디오 에러 없는지

### 7.5. 의도적으로 안 하는 것

- voice 단위 출력 음원 비교(파형 검증) — 결정론 도구 없음
- swing ratio "느낌" 자동 검증 — 사람 청취 검수
- 17장 모든 카드의 E2E 풀 재생 — 대표 5장만

---

## 8. PR 분할 / 머지 전략

Sprint 2-8과 동일하게 4-PR squash merge. 회귀 위험을 단계로 분산.

| PR | 범위 | 머지 안전성 |
|---|---|---|
| **PR-A: 그루브 표현 인프라** | `BeatStep.unit` 추가, `parseBeatStep` swing/unit 인자, `CategoryRhythm.swing`, `resolveSwing`. swing default는 모두 0.5 유지(도입만, 적용 X) | 기존 동작 회귀 0. 회귀 테스트로 안전 검증 |
| **PR-B: 카드 프로필 시스템** | `card-profiles.ts`(빈 골격 + 17장 빈 객체), `CATEGORY_TONE_DEFAULTS`, `profile-merge.ts`, voice `setVoiceGain`, 엔진 `fxChain.wetGain` 카드별 반영. 카드별 차이 없음 | 모든 카드가 카테고리 default 그대로 → 사운드 변화 0. 인프라만 |
| **PR-C: variant 패턴 데이터** | 신규 variant 10개, 카테고리 default 보강 2건, swing default 카테고리별 활성화(blues/jazz 0.66) | 첫 사운드 변화. blues/jazz가 정통 swing으로 들리기 시작. 다른 카테고리 영향 0 |
| **PR-D: 카드 매핑 + 가드 + E2E** | `CARD_PROFILES` 17장 실제 값, dev 슬러그 정합성 가드, Playwright 스모크 | 카드별 정체성 실제 노출. 사람 청취 검수가 마지막 게이트 |

**PR 간 의존:** A → B → C → D. 각 PR 자체로 빌드/타입체크/테스트 통과해야 머지.

**머지 전 게이트:**
- `pnpm typecheck` / `pnpm lint`
- `pnpm test` 624개 + 신규 단위/통합 통과
- `web-audio-engineer` + `test-strategist` 리뷰 (PR-A/B/C)
- `music-theory-guardian` 추가 게이트 (PR-C)
- PR-D는 사용자 청취 검수가 마지막 게이트

**의도적으로 안 하는 것:**
- 4 PR을 단일 PR로 합침 — 회귀 분리 이점 사라짐
- PR-A에서 카테고리 swing default 미리 활성화 — A를 인프라 only로 유지

---

## 9. 후속 (Sprint 10+ 후보)

- 신규 카드 추가 (Sprint 2-8 D2 패턴 재반복)
- jazz brush 복원 (Sampler + 외부 CC0 샘플 또는 FluidR3_GM MIDI ch10)
- voice별 EQ (low-shelf/high-shelf 2밴드)
- humanize (timing/velocity jitter, 시드 기반 PRNG)
- 16분 트리플렛 unit, swing의 16분 off-beat 적용
- 카테고리별 reverb wet 외 voice별 send 차등
