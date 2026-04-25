# Sprint 2-7 — Smart Highlighting (Chord Tension + 색채음 매트릭스) Design

**Date:** 2026-04-26
**Status:** Spec — pending implementation plan
**Predecessors:** Sprint 2-6 (Jam skeleton + chord overlay split)
**Domain:** theory + fretboard + (minor) store + (minor) audio bridge

---

## 0. 한 줄

배킹 코드가 재생 중일 때, **현재 마디 코드 + 베이스 스케일 + 장르** 세 입력으로 "지금 누르면 적절한 음" 집합을 계산해 지판에 시각화한다. 스케일 밖이지만 코드/장르적으로 적절한 음(예: 재즈 V7의 alt 텐션, 블루스 블루노트)도 ghost marker + faded ring 으로 노출.

## 1. 배경 / 문제

Sprint 2-6에서 chord overlay 레이어(빨강 root ring + 파랑 tone ring)를 분리했으나, 이 ring은 **`getFretboardNotes`가 반환한 스케일 음 위치 위에서만** 등장한다.

문제:

- 키 `C major` + 스케일 `C major` + 현재 코드 `A7`(VI7 borrowed) 일 때 코드 톤 C♯이 스케일 밖 → 지판에 **아예 표시되지 않음** → 사용자는 코드 톤이 어디 있는지 알 수 없음.
- Jazz V7 위 alt 텐션(♭9·♯9·♯11·♭13), 블루스 블루노트(♭3·♭5·♭7) 등 **장르 특유의 색채음**도 동일 이유로 누락.

요구:

> 단순 chord-tone뿐 아니라, **배킹 트랙 장르 + 베이스 스케일 + 코드 품질·함수**를 종합해 적절한 음을 표시. 스케일 밖이라도 표시되어야 함.

## 2. 비목표 (Non-goals)

- **어보이드(Avoid) 노트 표시 — 도입하지 않음.** 스타일 의존(블루스 P4 vs 재즈 P4) 이 강하고, "쓰지 마" 가이드는 학습자에게 도그마처럼 작동할 수 있음.
- 음악 이론 학습용 "코드 톤 1·3·5·7" 라벨링 — 별도 기능. Sprint 2-7 범위 외.
- BPM/템포 동조 애니메이션 변경 — Sprint 2-7 범위 외.

## 3. 시각·동작 시나리오

키 `C major` / 스케일 `C major` / 카테고리 `jazz`, 현재 코드 `G7`:

| pitch class | 스케일 내 | 코드 톤 | 색채음 | 시각 |
|---|---|---|---|---|
| G | ✓ | ✓ (root) | — | scale Important(orange) + chord-root pulse(빨강, 2px) |
| B | ✓ | ✓ | — | scale Regular + chord-tone pulse(파랑, 2px) |
| D | ✓ | ✓ | — | 동일 |
| F | ✓ | ✓ | — | 동일 |
| A | ✓ | — | ✓ (9th) | scale Regular + color-tone faded(파랑, 1.5px, 0.45 op) |
| E | ✓ | — | ✓ (13th) | 동일 |
| A♭ | — | — | ✓ (♭9) | **ghost marker(0.35 op)** + color-tone faded ring |
| B♭ | — | — | ✓ (♯9) | 동일 |
| D♭ | — | — | ✓ (♯11) | 동일 |
| E♭ | — | — | ✓ (♭13) | 동일 |

코드가 다음 마디로 바뀌면 위 분류 전체 재계산.

## 4. 아키텍처

### 4.1 데이터 모델

```ts
// lib/theory/chord-voicing.ts (확장)

export interface AppropriateNotes {
  /** 코드 root pitch class. 파싱 실패 시 null. */
  chordRoot: PitchClass | null;
  /** 코드 톤 (root 제외). 파싱 실패 시 빈 Set. */
  chordTones: ReadonlySet<PitchClass>;
  /** 색채음 — Part A·B·C 합집합에서 chordRoot/chordTones 제외. */
  colorTones: ReadonlySet<PitchClass>;
}

// 진입점
export function getAppropriateNotes(
  chordSymbol: string,
  keyRoot: PitchClass,
  scale: ScaleKey,
  category: ProgressionCategory,
): AppropriateNotes;
```

`ChordOverlay`/`getChordOverlay`는 **rename + 시그니처 확장**으로 대체 (제거). 호출자 1곳(`FretboardSurface`).

### 4.2 3-레이어 룰 매트릭스

```
colorTones = chord_extensions[quality]        ← Part A (음악 이론 표준)
           ∪ genre_overrides[category](chord) ← Part B (장르·코드 컨벤션)
           ∪ genre_universal[category](key)   ← Part C (코드 무관 키 색채음)
           - {chordRoot} - chordTones
```

#### Part A — 코드 품질별 텐션 (root 기준 반음)

`lib/theory/chord-extensions.ts` (NEW)

| ChordQuality | 텐션 (반음) | 의미 |
|---|---|---|
| major | 2 | 9 |
| minor | 2, 5 | 9, 11 |
| diminished | 2, 5 | 9, 11 |
| augmented | 2, 6 | 9, ♯11 |
| major7 | 2, 6, 9 | 9, ♯11, 13 (P4 어보이드 → 제외) |
| minor7 | 2, 5, 9 | 9, 11, 13 |
| dominant7 | 2, 6, 9 | 9, ♯11, 13 (alt는 Part B) |
| diminished7 | 2, 5, 8 | 9, 11, ♭13 (대칭) |
| half_diminished7 | 5, 8 | 11, ♭13 |
| minor_major7 | 2, 5, 9 | 9, 11, 13 |

#### Part B — 장르 × 코드 추가 룰

`lib/theory/genre-rules.ts` (NEW) — `perChord` 필드.

| 카테고리 | dominant7 추가 | major(7) 추가 | minor(7) 추가 |
|---|---|---|---|
| jazz | ♭9·♯9·♯11·♭13 (1, 3, 6, 8) | (없음) | (없음) |
| bossa | ♭9·♯11 (1, 6) | (없음) | (없음) |
| blues | ♭3 (3) | ♭3·♭7 (3, 10) | (없음) |
| rock | ♭3 (3) | ♭3·♭7 (3, 10) | (없음) |
| funk | ♭3 (3) | ♭3·♭7 (3, 10) | (다이아토닉, 없음) |
| pop | (없음) | 9만 (이미 Part A) | (없음) |
| folk | (없음, 코드톤만) | (없음, 코드톤만) | (없음) |
| minor | ♭9 (V7 alt, 1) | (없음) | (없음) |
| modal | (없음) | (없음) | (없음) |

##### Bossa V7 — natural 9 vs ♭9 동시 표시 (의도)

bossa는 Part B에 ♭9·♯11(`[1, 6]`)을, Part A는 natural 9·♯11·13(`[2, 6, 9]`)을 갖는다. 둘이 union되어 bossa V7에서 **♭9와 9가 동시에 colorTones에 등장**한다.

이는 의도된 동작 — Jobim 화성의 특징 중 하나가 V7 위에서 멜로디가 ♭9와 natural 9 사이를 넘나드는 모호성이다(예: "Desafinado", "Insensatez"의 V 마디). 사용자가 즉흥 시 둘 중 어느 음을 선택해도 양식적으로 정당하므로 둘 다 색채음으로 표시한다.

향후 "스타일 strict 모드" 토글이 들어오면 Part A를 replace하는 override 룰을 도입할 수 있으나, Sprint 2-7 범위 외.

#### Part C — 키 단위 universal 색채음

`lib/theory/genre-rules.ts` — `universal` 필드 (키 root 기준 반음).

| 카테고리 | universal |
|---|---|
| blues | 3, 6, 10 (♭3·♭5·♭7) |
| rock | 3, 10 (♭3·♭7) |
| funk | 3 (♭3) |
| jazz, bossa, pop, folk, minor, modal | (없음) |

### 4.3 처리 순서 (orchestrator)

```ts
function getAppropriateNotes(chord, key, scale, category) {
  const parsed = romanToChord(chord);
  if (!parsed) return { chordRoot: null, chordTones: empty, colorTones: empty };

  const chordRoot = applyKey(parsed.rootSemitones, key);
  const chordTones = parsed.semitones.slice(1).map(applyKey);

  const baseExt = CHORD_EXTENSIONS[parsed.quality]
    .map(s => applyKey((parsed.rootSemitones + s) % 12, key));
  const genrePerChord = GENRE_RULES[category].perChord[parsed.quality] ?? [];
  const genreExt = genrePerChord
    .map(s => applyKey((parsed.rootSemitones + s) % 12, key));
  const universal = GENRE_RULES[category].universal
    .map(s => applyKey(s, key));

  const colorTones = new Set([...baseExt, ...genreExt, ...universal]);
  chordTones.forEach(p => colorTones.delete(p));
  colorTones.delete(chordRoot);

  return {
    chordRoot,
    chordTones: new Set(chordTones),
    colorTones,
  };
}
```

### 4.4 ProgressionCategory 타입 통일

현재 `category` 타입이 불일치: `presets.ts`는 9종 키, `progression-templates.ts` 타입은 5종 union, `generated.ts`는 `string`. 본 스프린트에서 **`lib/theory/genre-rules.ts`에 canonical `ProgressionCategory` 9-value union을 정의**하고 다른 모듈은 이걸 import. 시드 데이터의 unknown 카테고리는 `pop`으로 폴백 (이미 `getPreset`이 같은 패턴 사용).

```ts
export type ProgressionCategory =
  | 'pop' | 'rock' | 'funk' | 'jazz' | 'blues'
  | 'folk' | 'bossa' | 'minor' | 'modal';
```

### 4.5 파일 변경 요약

```
NEW   lib/theory/chord-extensions.ts
NEW   lib/theory/genre-rules.ts
EDIT  lib/theory/chord-voicing.ts        (getAppropriateNotes 추가, getChordOverlay rename)
EDIT  lib/theory/fretboard.ts            (getGhostFretboardPositions 추가)
EDIT  lib/store/app-store.ts             (backingPlayingCategory 필드 + persist v11)
EDIT  components/fretboard/Fretboard.tsx (color-tone tier + ghost marker SVG group)
EDIT  components/fretboard/FretboardSurface.tsx (getAppropriateNotes 호출)
EDIT  app/globals.css                    (--color-fretboard-ghost 토큰)
EDIT  components/jam/ProgressionPlayButton.tsx (setBackingPlayingTemplate 호출)
EDIT  components/jam/ProgressionCatalogClient.tsx (slug→template lookup)
```

## 5. 시각 사양

### 5.1 레이어 순서 (z-order, 아래 → 위)

1. Fretboard grid (배경)
2. Scale notes (Root/Important/Regular tiers) — 기존
3. **Out-of-scale ghost markers** — outline-only, 0.35 opacity (NEW)
4. **Color-tone rings** — 같은 파랑, 0.45 opacity, 정지 (NEW)
5. Chord-tone rings — 파랑, full opacity, pulse — 기존
6. Chord-root rings — 빨강, full opacity, pulse — 기존

### 5.2 Stroke·Opacity·Animation

| 레이어 | Stroke 색 | Stroke-width | Opacity | Animation |
|---|---|---|---|---|
| chord-root | `--color-chord-overlay-root` | 2px | 1.0 | `chord-overlay-pulse` (기존) |
| chord-tone | `--color-chord-overlay-tone` | 2px | 1.0 | `chord-overlay-pulse` (기존) |
| **color-tone** | `--color-chord-overlay-tone` | 1.5px | 0.45 | 정지 |
| **ghost marker** | `var(--color-fretboard-ghost)` | 1px | 0.35 | (없음) |

### 5.3 Ghost Marker 사양

- 모양: outline-only 원 (fill 없음)
- 크기: Regular tier와 동일 (`0.19 × fretWidth`)
- 색: `var(--color-fretboard-ghost)` = `--color-ink-muted`
- 위치: out-of-scale pitch class만 (`getGhostFretboardPositions` 헬퍼 산출)
- 라벨: `labelMode` 따라 표시. 단 텍스트 opacity는 0.5

### 5.4 새 CSS 토큰

```css
/* app/globals.css @theme */
--color-fretboard-ghost: var(--color-ink-muted);
```

`--color-chord-overlay-color`는 별도 도입하지 않음. `--color-chord-overlay-tone`을 그대로 쓰고 SVG `opacity` 속성으로 차이.

### 5.5 시각 노이즈 튜닝 자리

Jazz dominant7 시 alt 텐션 4종이 ghost marker로 동시 등장 → 노이즈 우려.
구현 후 시각 검증에서 ghost opacity 0.35 → 0.25 등으로 더 낮출 수 있음.
**구체 수치는 implementation 단계에서 fretboard-renderer + aesthetic-reviewer가 결산.**

## 6. Store 변경 (v11 마이그레이션)

### 6.1 BackingSliceState 확장

```ts
type BackingSliceState = {
  backingPlayingSlug: string | null;
  backingPlayingCategory: ProgressionCategory | null;  // NEW
  backingCurrentChord: { symbol: string; barIndex: number } | null;
  volume: number;
};

setBackingPlayingTemplate(template: ProgressionTemplate | null): void;
```

기존 `setBackingPlayingSlug`은 `setBackingPlayingTemplate`로 대체 (slug + category 동시 set).

### 6.2 Persist Migration v10 → v11

```ts
if (version < 11) {
  // backing.backingPlayingCategory 추가, 기본값 null
  fb.backing.backingPlayingCategory = null;
}
```

런타임 영향 없음 — `null` 기본값은 stop 상태와 동일. start 시 자동 set.

## 7. 테스트 전략

### 7.1 Unit (`tests/unit/lib/theory/`)

- `chord-extensions.test.ts` (NEW): 10개 ChordQuality × 텐션 배열 정확성
- `genre-rules.test.ts` (NEW): 9개 카테고리 × `perChord`/`universal` 룰 검증
- `chord-voicing.test.ts` (확장):
  - Jazz V7 in C → colorTones에 ♭9·♯9·♯11·♭13 포함, P4 어보이드는 누락
  - Blues I7 in A → universal blues notes ♭3·♭5·♭7 포함
  - modal Dorian I → colorTones 빈 Set
  - 파싱 실패 → 모든 필드 null/empty
  - chordTones와 colorTones 중복 없음 (orchestrator 후처리 검증)
- `fretboard.test.ts` (확장): `getGhostFretboardPositions` 위치 정확성

### 7.2 Component (`tests/component/fretboard.test.tsx`)

- `appropriateNotes.colorTones` 비어있으면 color-tone group 미렌더
- `outOfScalePcs` 비어있으면 ghost marker group 미렌더
- chord-tone vs color-tone stroke-width 차등 (2px vs 1.5px) DOM 검증
- ghost marker 라벨 opacity 0.5 검증

### 7.3 E2E (`tests/e2e/jam-skeleton.spec.ts` 확장)

- backing 재생 시작 → DOM에 `data-overlay-tier="color-tone"` 노드 카운트 > 0
- 카테고리 = jazz → 코드별로 ghost marker 4개 이상 등장 확인 (alt 텐션)
- 코드 변경 → ghost marker 위치 갱신

### 7.4 음악 이론 게이트

`music-theory-guardian` 에이전트:
1. spec 작성 직후 1회 — Part A·B·C 룰 컨센서스 검증
2. implementation 직후 1회 — `chord-extensions.ts`·`genre-rules.ts` 데이터 정합성 검증

## 8. 위험·엣지 케이스

- **대칭 스케일 (whole_tone, diminished_hw/wh)**: 기본 스케일이 대칭이라도 chord-tone·color-tone 계산은 코드 기준이므로 영향 없음. ghost marker만 더 많이 등장할 수 있음.
- **파싱 실패 코드**: 시드에 unknown suffix가 있으면 `null` 반환 → AppropriateNotes 전 필드 비어있음 → 화면 변동 없음 (현재 chord-overlay 동작과 동일).
- **dominant7 alt 4종 + universal 블루노트**가 동시에 떨어지는 카테고리(blues는 dom7에 ♭3 추가, jazz dom7는 alt 4종) → 단일 카테고리에서는 둘 다 활성 안 됨 (jazz와 blues 분리). 안전.
- **카테고리 미정의 (category=null)**: 정지 상태 또는 시드 누락. AppropriateNotes 계산하지 않음 — `FretboardSurface`에서 early return.

## 9. 구현 순서 (writing-plans 단계에서 세분화)

1. `chord-extensions.ts` + 테스트
2. `genre-rules.ts` + 테스트
3. `getAppropriateNotes` orchestrator + 통합 테스트
4. `getGhostFretboardPositions` + 테스트
5. Store v11 마이그레이션 + setBackingPlayingTemplate
6. ProgressionPlayButton/Catalog 호출부 변경
7. Fretboard.tsx — color-tone group + ghost marker SVG
8. globals.css 토큰 추가
9. FretboardSurface 시그니처 갱신
10. E2E 확장
11. music-theory-guardian + aesthetic-reviewer 게이트 통과
12. 시각 튜닝 (opacity·stroke-width 조정 1라운드)

## 10. 미해결 / 후속

- 시각 튜닝 수치(opacity 0.35/0.45, stroke 1.5px)는 **구현 후 실측**. 본 spec의 값은 시작점.
- **개별 색채음 라벨링** (예: "♭9", "♯11") 은 본 스프린트 외. Sprint 2-9 후보.
- **사용자 토글 (스마트 하이라이팅 on/off)** 도입 검토 — 현재는 chord-overlay와 동일 lifecycle (배킹 재생 중 항상 on). 노이즈가 부담되면 후속 스프린트에서 토글 추가.
