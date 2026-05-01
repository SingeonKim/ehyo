# Tuning · Instrument · Fret 확장 (Design)

> **상태**: Brainstorming 완료, 사용자 승인 후 plan 단계 대기
> **작성일**: 2026-05-01
> **선행**: Sprint 10 후속 (절대 볼륨 통일 + master volume slider 정상화 머지 완료)

## Goal

지판 시각화·배킹 카탈로그 연습 흐름을 **6현 기타 단일 페르소나에서 6현 기타 + 7현 기타 + 4현 베이스 3페르소나**로 확장한다. 음악 이론·카탈로그 데이터·코드 보이싱 도메인은 *건드리지 않고*, 튜닝 카탈로그 + SVG 가변 layout + voice mute UX의 추가만으로 새 페르소나가 동일한 backing 카드 위에서 자기 악기로 연주할 수 있게 한다.

## Architecture

기존 fretboard 렌더링 파이프라인 (`lib/theory/fretboard.ts` × `components/fretboard/Fretboard.tsx`)에서 **`STANDARD_TUNING` 상수 직접 import + `STRING_COUNT = 6` 하드코딩**이라는 두 곳의 6현 가정만 풀어 store 기반 가변 모델로 전환한다. theory layer는 이미 `tuning.length` 기반으로 동작하므로 0줄 변경. SVG 레이아웃은 `STRING_SPACING_PX` 고정 + height 자동 산출 모델을 채택해 4/6/7현이 *자연 비례*로 그려진다.

Voice mute는 backing engine의 voice 트리거 분기에 store 셀렉터 1줄 추가로 적용. 카드별 mute 프리셋은 이번 범위 밖.

## Tech Stack

기존 그대로: Next.js 15, Zustand persist v11 → v12, Tailwind v4, Vitest + Testing Library + Playwright.

---

## Scope

**작업 단위**: 7 tuning preset + 4 voice mute toggle + UI 컨트롤 4개 + persist v12 마이그레이션 + 테스트 확장

**지원 instrument & 튜닝 (Q2 (a) + 베이스 Drop D)**:
- Guitar 6현 — Standard / Drop D / DADGAD / E♭ Half-step (4개)
- Guitar 7현 — Standard (BEADGBE) (1개)
- Bass 4현 — Standard (EADG) / Drop D (DADG) (2개)

**24프렛 토글**: store 필드(`frets: 22 | 24`) 이미 존재 — UI만 신규.

**음악 이론 변경 0줄 (Q3 (a))**: instrument와 무관하게 *현재 코드의 chord tone + color tone*을 ring으로 표시. 베이스 라인 학습 모드는 별도 도메인으로 후속 검토.

**Voice mute (Q4 (a))**: drums / bass / guitar / aux 개별 토글. instrument 무관 일반 기능. 카드 재생 중 토글하면 다음 비트부터 반영.

**비범위 (의도적 제외)**:
- 5현 베이스, 8현 기타
- Open G/D/E, Drop C 등 메탈 변형 튜닝
- 베이스 라인 학습 모드 (root + 5th + walking 가이드)
- 카드별 voice mute 프리셋 자동 적용
- 튜닝별 추천 스케일 차등

---

## §1. 데이터 모델

### `lib/theory/tunings.ts` (신규)

```ts
export type InstrumentKind = 'guitar-6' | 'guitar-7' | 'bass-4';

export type TuningPresetId =
  | 'guitar-6-standard'
  | 'guitar-6-drop-d'
  | 'guitar-6-dadgad'
  | 'guitar-6-eb-half'
  | 'guitar-7-standard'
  | 'bass-4-standard'
  | 'bass-4-drop-d';

export interface TuningPreset {
  id: TuningPresetId;
  instrument: InstrumentKind;
  /** UI 라벨 (예: 'Drop D'). */
  label: string;
  /** index 0 = 최저음, length = 줄 개수. */
  tuning: readonly PitchClass[];
  /** readout용 표시 문자열 (예: 'DADGBE', 'BEADGBE', 'EADG'). */
  displayString: string;
}

export const TUNING_PRESETS: Record<TuningPresetId, TuningPreset> = {
  /* 7개 정의 */
};

/** 같은 instrument의 preset만 추려 dropdown에 노출. 결과 순서는 standard가 항상 첫 원소. */
export function presetsByInstrument(kind: InstrumentKind): TuningPreset[];

/** 각 instrument의 default preset id. setInstrument 자동 전환 시 사용. */
export const DEFAULT_PRESET_BY_INSTRUMENT: Record<InstrumentKind, TuningPresetId> = {
  'guitar-6': 'guitar-6-standard',
  'guitar-7': 'guitar-7-standard',
  'bass-4': 'bass-4-standard',
};
```

`presetsByInstrument` 구현은 *명시적 array 리터럴*로 작성 (Record 순회 순서에 의존하지 않음). 새 preset 추가 시 array 위치를 명시해 dropdown 순서 결정.

### `STANDARD_TUNING` 별칭 유지

```ts
// lib/theory/fretboard.ts
export { STANDARD_TUNING } from './tunings'; // 별칭 re-export
```

`STANDARD_TUNING` import는 30+개 테스트와 `FretboardSurface.tsx`에서 사용 중. 별칭 유지로 회귀 0건 보장. 신규 코드는 store 셀렉터를 통해 동적 tuning을 받는다.

### Store 추가 (v11 → v12)

```ts
interface FretboardSlice {
  // 기존 유지: root, scale, handedness, labelMode, fretSpacing, accidentalMode, highlightsByScale
  frets: 22 | 24;            // 이미 있음, UI만 신규
  tuning: TuningPresetId;    // 신규 — default 'guitar-6-standard'
}

interface BackingSlice {
  // 기존 유지
  voiceMutes: { drums: boolean; bass: boolean; guitar: boolean; aux: boolean };
  // default 모두 false
}
```

### Actions

```ts
setInstrument(kind: InstrumentKind): void;
//   1. 현재 tuning이 새 instrument에 속하면 유지
//   2. 다른 instrument면 DEFAULT_PRESET_BY_INSTRUMENT[kind]로 자동 전환

setTuning(presetId: TuningPresetId): void;
//   단순 갱신. root는 변경하지 않음 (root = 음악 키, tuning = 물리 악기).

setFretCount(frets: 22 | 24): void;

toggleVoiceMute(voice: 'drums' | 'bass' | 'guitar' | 'aux'): void;
```

### 파생 셀렉터

```ts
// useTuning() — store의 TuningPresetId → PitchClass[] 변환을 셀렉터에서 처리
function useTuning(): readonly PitchClass[];
function useInstrument(): InstrumentKind;
```

컴포넌트는 array를 직접 받아 store 형태 변경에 영향 없음.

### 마이그레이션 v11 → v12

```ts
if (version < 12) {
  const fb = (s.fretboard as Record<string, unknown>) ?? {};
  if (typeof fb.tuning !== 'string') {
    fb.tuning = 'guitar-6-standard';
  }
  s.fretboard = fb;

  const backing = (s.backing as Record<string, unknown>) ?? {};
  if (!backing.voiceMutes || typeof backing.voiceMutes !== 'object') {
    backing.voiceMutes = { drums: false, bass: false, guitar: false, aux: false };
  }
  s.backing = backing;
}
```

---

## §2. SVG 레이아웃 변경

### 변경 지점

`components/fretboard/Fretboard.tsx:52`:
```ts
- const STRING_COUNT = 6;
+ // STRING_COUNT 제거. props.stringCount로 가변화.
```

### Props 시그니처

```ts
interface FretboardProps {
  // 기존 props 유지
  stringCount: number;   // 4 / 6 / 7
}
```

`SVG_HEIGHT = stringCount × STRING_SPACING_PX + verticalPadding` 형태로 동적 산출. `STRING_SPACING_PX = 32`(현재 값) 고정 — Q6 (a)에 따라 string 간격 고정 모델.

### `stringY(num)` 매핑

```ts
// num: 1 (최고음, 최상단) ~ stringCount (최저음, 최하단)
function stringY(num: number, stringCount: number): number {
  return (stringCount - num) * STRING_SPACING_PX + nutPadding;
}
```

호출자는 `stringY(o.string, stringCount)`로 stringCount를 함께 전달.

### `FretboardSurface.tsx` 호출자 변경

```ts
- const openStrings = useMemo(
-   () => getOpenStringLabels(STANDARD_TUNING, useFlats),
-   [useFlats],
- );
+ const tuning = useTuning();
+ const openStrings = useMemo(
+   () => getOpenStringLabels(tuning, useFlats),
+   [tuning, useFlats],
+ );

// getFretboardNotes / getGhostFretboardPositions 호출도 STANDARD_TUNING → tuning으로
// <Fretboard /> 호출에 stringCount={tuning.length} 추가
```

### 자동 적응되는 영역 (코드 수정 0줄)

- `ringPositions` — `notes.filter((n) => n.pitchClass === pc)` 패턴은 string 번호 기반이라 stringCount 변경에 자동 대응.
- `INLAY_POSITIONS` (3, 5, 7, 9, 12, 15, 17, 19, 21, 24) — 베이스도 동일 인레이 위치. 24프렛 토글에도 이미 정의되어 있음.
- `handedness === 'left'` SVG 좌우 반전 — stringCount 무관.
- `fretSpacing` 옵션 — fret width만 영향, string spacing 무관.

### 노트 마커 비율 검증

마커 크기 비율 `0.32 / 0.26 / 0.19` (root / important / regular)는 *fretWidth 기준*이라 stringCount 변경 시 수직 끼임 없음. 7현일 때도 동일 비율 유지.

---

## §3. UI 컴포넌트

### 신규 컴포넌트 4개

```
components/fretboard/
  InstrumentSelector.tsx     # segmented: Guitar 6 / Guitar 7 / Bass 4
  TuningPresetSelector.tsx   # dropdown: 선택 instrument의 프리셋
  FretCountToggle.tsx        # 22 ↔ 24

components/jam/
  VoiceMutePanel.tsx         # drums / bass / guitar / aux 4 칩
```

### `FretboardControls.tsx` 패널 추가

```
┌─ Instrument & Tuning ─────────────────────┐
│ [Guitar 6] [Guitar 7] [Bass 4]            │  ← Segmented
│                                           │
│ Tuning  [ Standard           ▾ ]  EADGBE  │  ← Dropdown + readout
│ Frets   [ 22 ] [ 24 ]                     │  ← Toggle
└───────────────────────────────────────────┘
```

instrument는 *지판의 가장 근본적인 의사결정*이므로 RootPicker / ScalePicker / handedness / fretSpacing 위에 배치. 패널 최상단.

### `ProgressionCatalogClient.tsx` 헤더 확장

```
§ Backing Catalog          [Roman/Abs] [Key] [Vol] [Mute: DR BS GT AUX]
```

VoiceMutePanel은 4개의 작은 mono 칩. mute된 voice는 `text-ink-muted` + `line-through`. 항상 노출(collapse 안 함).

### 디자인 토큰

- Segmented active: `bg-bg-elevated text-accent-brass`
- Mute 칩 active(=mute됨): `text-ink-muted line-through`
- Mute 칩 inactive: `text-ink-primary`
- 토큰만 사용 — hex 하드코딩 금지 (`aesthetic-reviewer` 게이트)

### 접근성

- Segmented control: `role="tablist"` + 각 버튼 `role="tab"` + `aria-selected`
- Tuning dropdown: 표준 `<select>` 또는 shadcn select (kbd 네비 보장)
- Mute 칩: `<button aria-pressed={isMuted}>` — 스크린리더 상태 명시

---

## §4. 카탈로그·backing 정합성 (변경 0줄)

### 카탈로그 데이터

코드 진행 카탈로그 22장은 instrument-agnostic. 베이스/7현 사용자도 동일 카드를 선택해 *동일 backing 사운드 위*에서 자기 악기로 연주.

이유: 카탈로그는 음악 진행(Im - IV - V 등)이지 연주 지시가 아님. backing은 6현 기타 + 4 voice 합주 — 사용자는 자기 악기를 그 위에 얹어 연습. 충돌 voice는 mute로 제거.

### chord-voicing 의미

`getAppropriateNotes(symbol, root, category)`는 pitch class 단위. instrument와 무관. 4현 베이스 지판에 동일 매핑되면 베이스 음역에서만 자연스럽게 마커가 보임.

### 7현의 low B

7현 standard `BEADGBE` — index 0 = B (pitch class 11). `getFretboardNotes`가 index 0~6 순회해 스케일 음을 자동으로 low B 줄에도 매핑. ringPositions / ghost markers 자동 적응. 코드 수정 0줄.

### 4현 베이스

4현 standard `EADG` — 6현의 6번~3번 줄. 1·2번 줄 부재로 high register 마커 사라짐. backing의 chord/color tone은 베이스 음역에서 충분히 표현 (root 6번줄, 5th 5번줄, octave 4번줄).

### 추천 스케일·표기법

`UseRecommendedScaleButton` / `chordDisplayMode` — 변경 0줄.

---

## §5. Voice mute 적용 지점

### `lib/audio/backing/engine.ts`

voice 트리거 시 store 셀렉터로 mute 상태 조회. mute=true면 트리거 자체를 *스킵* (velocity 0 트리거가 아니라 호출 자체를 안 함 — smplr stop list 부담 없음).

```ts
// pseudo
function triggerVoice(voice: VoiceKind, step: BeatStep) {
  const muted = getStore().backing.voiceMutes[voice];
  if (muted) return;
  // 기존 트리거 로직
}
```

토글이 *재생 중* 변경되면 다음 비트부터 반영 (BarScheduler가 매 step마다 store 셀렉터 재평가).

### 다른 voice·master volume과의 관계

mute는 voice 트리거 게이트에서 처리되므로 fxChain 토폴로지(compressor → dry/wet+reverb → masterGain) 영향 없음. master volume slider는 그대로.

---

## §6. 테스트 전략

### Unit (Vitest)

- `tests/unit/lib/theory/tunings.test.ts` (신규)
  - 7개 프리셋 모두 `tuning.length`가 instrument kind와 일치
  - `presetsByInstrument(kind)` 필터 정합
  - `displayString` 생성이 tuning array와 정합

- `tests/unit/lib/theory/fretboard.test.ts` (확장)
  - 기존 `STANDARD_TUNING` 케이스 그대로 (별칭 유지로 회귀 0)
  - 신규: 4현·7현 tuning으로 `getFretboardNotes` 호출, 마크 좌표 검증
  - 신규: `pitchAt(BEADGBE, 0, 0)` === 11, `pitchAt(EADG, 0, 5)` === A

- `tests/unit/lib/store/migrations.test.ts` (확장)
  - v11 → v12: `fretboard.tuning = 'guitar-6-standard'`, `backing.voiceMutes` 4개 false
  - 다른 필드 무결성

### Component (Testing Library)

- `tests/component/fretboard.test.tsx` (확장)
  - `stringCount=6/7/4` prop 변경 시 SVG 안 `<line>` 갯수 / 마커 갯수 변동 검증
  - 4현일 때 1·2번 줄 마커 미생성

- `tests/component/instrument-selector.test.tsx` (신규)
  - segmented 클릭 → `setInstrument` 호출 + 첫 preset 자동 전환
  - 같은 instrument 안 tuning 변경 시 instrument 유지

- `tests/component/voice-mute-panel.test.tsx` (신규)
  - 칩 클릭 → `toggleVoiceMute` 호출
  - mute 칩 `aria-pressed="true"` + line-through

### Audio engine (Vitest + scheduler spy)

- `tests/unit/lib/audio/engine.voice-mute.test.ts` (신규)
  - `createSchedulerSpy()`로 트리거 시각/voice 캡처
  - drums voiceMute=true 시 drums 트리거 스케줄러 미등록 (다른 voice 그대로)
  - 재생 중 토글: mute=true → 다음 비트부터 빠짐, mute=false → 다음 비트부터 살아남

### E2E (Playwright)

- `tests/e2e/tuning-instrument.spec.ts` (신규, smoke 1건)
  - 6현 → 7현 instrument 전환 → SVG height 변화 (BoundingBox)
  - tuning preset Drop D 선택 → readout 'DADGBE' 확인
  - 24프렛 토글 → fret 24 marker 노출

### 회귀 게이트

- `pnpm typecheck` 깨지지 않음 (props 시그니처 변경)
- 기존 `STANDARD_TUNING` import 30+개 모두 통과
- v11 → v12 마이그레이션 후 기존 사용자 카드 재생/지판 정상

### 에이전트 호출 매트릭스

| 에이전트 | 담당 |
|---|---|
| `fretboard-renderer` | SVG 비례·노트 마커·레이아웃 검증 |
| `aesthetic-reviewer` | 새 컴포넌트 4개 토큰·폰트 규율 |
| `web-audio-engineer` | voice mute 적용 지점 (engine.ts trigger 분기) |
| `test-strategist` | 새 테스트 카테고리 누락 검사 |
| `nextjs-architect` | persist v12 + store 셀렉터 |
| `music-theory-guardian` | **호출 불요** (음악 이론 변경 0줄) |

병렬 호출 권장: fretboard-renderer + aesthetic-reviewer (UI 도메인 분리), web-audio-engineer + nextjs-architect (audio engine ↔ store 분리).

---

## §7. 위험·대응

| 위험 | 영향 | 대응 |
|---|---|---|
| `STANDARD_TUNING` 별칭 export 누락 | 30+개 테스트 일괄 실패 | 시작 시 `grep STANDARD_TUNING` → 별칭 검증 + 작업 전 `pnpm test` 통과 |
| 7현 SVG 높이 +16% → sticky 영역에서 카탈로그 가려짐 | 사용자 흐름 끊김 | jam 페이지 7현 선택 시 BoundingBox 측정. 임계 초과 시 `clamp` 폴백 (Q6 (c)) |
| voice mute 토글이 재생 중 적용 안 됨 | 사용자 혼란 | engine.voice-mute.test.ts에서 토글 → 다음 비트 반영 명시 |
| persist v11 → v12 마이그레이션 실패 | 기존 사용자 설정 리셋 | `__migrate` export로 unit test, default 폴백 |
| 4현 베이스 첫 카드 재생 시 backing 베이스 voice 자동 mute 안 됨 | "베이스랑 같이 나와요" 첫 인상 | VoiceMutePanel을 카탈로그 헤더 항상 노출. 후속 PR에서 instrument별 자동 mute 검토 |

---

## §8. 후속 마일스톤

1. **5현 베이스** — 사용자 요청 시. preset 1개 추가만.
2. **voice별 EQ / volume slider** — 정밀 mix 컨트롤. CLAUDE.md Sprint 11 후보.
3. **Open 튜닝 모음** — Open G/D/E + Drop C·B (메탈).
4. **베이스 라인 학습 모드** — instrument=bass 시 root/5/octave/passing tone 강조 별도 모드.
5. **카드별 voice mute 프리셋** — bass-feature 카드는 bass voice 살리기 등.

---

## §9. 정합성 게이트 (커밋 전 체크리스트)

- [ ] `pnpm lint` / `pnpm typecheck` 통과
- [ ] `pnpm test` 통과 (확장된 unit + component + audio scheduler spy)
- [ ] `pnpm test:e2e` smoke 통과 (Docker)
- [ ] `fretboard-renderer` + `aesthetic-reviewer` 1회 이상 통과
- [ ] `web-audio-engineer` voice mute 지점 검증
- [ ] `nextjs-architect` v12 마이그레이션 검증
- [ ] `CLAUDE.md` "주요 설계 결정" 섹션에 *튜닝 가변·voice mute* 추가
- [ ] `docs/planning.md` §6.2.5 (지판 모델 & 튜닝) 업데이트 — 다중 instrument 명시
