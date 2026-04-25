# Sprint 2-5 — Backing ↔ Fretboard 동기화 설계

**Status:** draft
**Date:** 2026-04-25
**Branch:** `feat/sprint-2-5-fretboard-sync`
**Milestone:** M2 (planning.md §1.3) — 배킹 트랙 ↔ 메트로놈/스케일 동기화의 핵심 부분

## 1. 목표와 범위

배킹 트랙 재생 중 현재 코드의 코드톤이 지판에 자동으로 강조되어, 사용자가 "지금 이 박자에서 어떤 음을 누를지" 즉각 파악할 수 있도록 한다. planning.md §2.2 핵심 시나리오 3(블루스 솔로 연습)을 처음으로 완성한다.

### 포함 (in scope)

- **배킹 → 지판 root 자동 동기화**: 배킹 재생 중 fretboard 표시 root = `backingKey`
- **현재 코드톤 시각 강조**: 매 마디 콜백마다 `chordPitchClasses(currentChord, backingKey)`로 코드톤 PC 계산, 지판 노트에 halo overlay
- **재생 중 RootPicker 상태**: disabled + 동기화 표시 ("Synced to Key Selector")
- 카드 옆 "Use recommended scale" 버튼 — 사용자 1-click으로 `template.recommended_scales[0]`을 fretboard scale에 적용
- /jam 페이지 레이아웃은 기존 stacked 구조 유지 (Metronome → Fretboard → Catalog)

### 제외 (out of scope)

- 카테고리별 리듬 패턴 (Sprint 2-6+)
- 추천 스케일 자동 적용 (사용자 명시 click 필요)
- 모드 토글링 on the fly (E Phrygian → E Lydian)
- 배킹 키와 다른 키의 fretboard 표시 옵션 (1-way sync only)
- 사용자가 RootPicker를 강제로 풀고 다른 키 보기 (v2+)
- 마스터 리미터·믹싱

## 2. 설계 결정 핵심

### 2.1 동기화 방향: 배킹 → 지판 (one-way)

- 배킹이 idle/error 상태일 때: fretboard root = `s.fretboard.root` (기존 동작)
- 배킹이 loading/playing 상태일 때: fretboard root = `s.backing.backingKey`
- 사용자가 KeySelector(이미 존재, 카탈로그 영역)로 backingKey를 바꾸면 → backingKey 변경 → fretboard 자동 반영
- 사용자가 fretboard RootPicker를 보더라도 disabled 상태 — "Synced to Key Selector" 인디케이터로 명확화

**왜 양방향이 아닌가**: 양방향은 race condition + UX 모호성. 사용자는 배킹 재생 중 "지판에 다른 키 띄우고 싶다"는 케이스가 거의 없음. v2에서 토글로 추가 가능.

### 2.2 코드톤 시각 강조: halo overlay

기존 노트 tier 시스템(root/orange/green/blue/regular) 유지. 그 위에 별도 레이어로 "현재 코드톤" halo를 SVG 추가 원으로 그림.

**색**: 기존 `--color-scale-chord` 토큰을 사용 (`globals.css`에 이미 `#5EB0E5`로 정의됨, "Phase 5 배킹 트랙 현재 코드 톤 ring 레이어"로 예약된 것). 새 토큰 추가 안 함.

**halo radius**: tier에 무관한 고정값 — `fretWidth × 0.30`. tier별 r×1.6 비례는 root 위 halo가 과도하게 커서 회귀.

**펄스 동기화**: 2초 고정 주기 폐기. 대신 코드 교체 시 React `key={currentChordSymbol}` prop으로 halo SVG group을 re-mount → CSS keyframe이 0%부터 재시작되어 매 마디 시작에 자연스럽게 정렬. duration은 `0.6s ease-out`으로 짧은 attack-decay.

**opacity**: 0.5 → 0.75 (애니메이션 변동 폭). 하한 0.35였던 제안은 WCAG 대비 미달.

**왜 tier를 추가하지 않나**: tier는 정적 스케일 분석. 코드톤은 동적(매 마디 변함). 분리해야 재계산 비용 적고 시각적으로도 "스케일 위에 코드 강조"가 명료.

### 2.3 코드톤 매칭 로직

```typescript
// chord-voicing.ts 또는 새 helper
function chordPitchClassSet(symbol: string, keyRoot: PitchClass): Set<PitchClass> | null;
```

지판 렌더링 시 각 노트의 `pc`를 이 Set에 lookup → boolean. 마디당 한 번 계산, 12 PC 비교는 O(1).

### 2.4 추천 스케일 적용 — 명시 button만

카드별 "Use recommended scale" 버튼:
- `template.recommended_scales[0]`이 있을 때만 노출
- 클릭 시 `setFretboardScale(slug)` 호출 → fretboard scale 변경
- 사용자가 의도하지 않은 자동 변경 금지 (다른 모드를 의도적으로 보고 있을 수 있음)

## 3. 모듈 구조

```
apps/web/
  components/fretboard/
    Fretboard.tsx                  (MODIFY — chordTonePcs?: Set<PitchClass> prop 추가)
    FretboardNote.tsx              (MODIFY — chordTone halo 분기 렌더)
    FretboardClient.tsx            (MODIFY — backing 상태 구독해 root 결정)
    RootPicker.tsx                 (MODIFY — 배킹 재생 중 disabled + indicator)
  components/jam/
    UseRecommendedScaleButton.tsx  (NEW — 카드별 1-click 적용)
    ProgressionCatalogClient.tsx   (MODIFY — 카드에 위 버튼 추가)
  lib/theory/
    chord-voicing.ts               (MODIFY — chordPitchClassSet 헬퍼 추가)
  app/globals.css                  (MODIFY — --color-chord-tone-halo 토큰)
  tests/component/
    Fretboard-chord-tone.test.tsx  (NEW — halo 렌더 검증)
    UseRecommendedScaleButton.test.tsx (NEW)
  tests/unit/lib/theory/
    chord-voicing.test.ts          (MODIFY — chordPitchClassSet 단위테스트 추가)
```

## 4. 컴포넌트 인터페이스

### 4.1 Fretboard

```typescript
export interface FretboardProps {
  notes: readonly NoteMark[];
  openStrings: readonly OpenStringLabel[];
  frets: 22 | 24;
  handedness: Handedness;
  fretSpacing: FretSpacing;
  labelMode: LabelMode;
  showFretNumbers?: boolean;
  className?: string;
  /** 현재 코드톤 PC 집합 — 노트 렌더 시 halo overlay 결정. undefined/empty면 halo 없음. */
  chordTonePcs?: ReadonlySet<number>;
  /** halo re-mount key — 코드 심볼 변경 시 CSS animation 재시작. */
  chordSymbol?: string | null;
}
```

**중요 경계**: `chordTonePcs`(Set) prop은 Fretboard에서만 사용. FretboardNote에는 boolean(`isChordTone`)으로 변환해 전달 → React.memo가 효과적으로 작동(Set 참조 비교 회피).

```typescript
// Fretboard 내부 (의사 코드)
{notes.map((n) => (
  <FretboardNote
    key={n.id}
    {...noteProps(n)}
    isChordTone={chordTonePcs?.has(n.pitchClass) ?? false}
  />
))}
```

halo SVG는 노트 group 외부 별도 layer에 그리고 `<g key={chordSymbol}>`로 감싸 코드 변경 시 re-mount.

### 4.2 FretboardNote — halo 분기

```typescript
interface FretboardNoteProps {
  // 기존 cx, cy, fretWidth, tier, noteName, degree, labelMode, stringNumber, fret
  /** 이 노트의 pitchClass가 코드톤이면 true → halo SVG 추가. */
  isChordTone?: boolean;
}
```

**`React.memo` 적용 필수** — 매 마디 chord tone 변동 시 720+ 노트 중 isChordTone이 바뀐 노트만 리렌더되도록.

`isChordTone === true`일 때 기존 circle 외부에 더 큰 outline-only circle 추가:
- radius = `fretWidth × 0.30` (tier에 무관한 고정값 — root 위 halo 과도화 회귀 차단)
- stroke = `var(--color-scale-chord)` (기존 토큰 재사용)
- stroke-width = 2
- fill = `none`
- 외부 group에 `chord-tone-halo` 클래스 → CSS opacity 0.5↔0.75 keyframe

### 4.3 FretboardClient — 동기화 로직

```typescript
export function FretboardClient() {
  const hydrated = useHasHydrated();
  // 기존 fretboard 상태들
  const fretboardRoot = useAppStore((s) => s.fretboard.root);
  // 배킹 동기화 — symbol만 분리 구독해 같은 chord 반복 시 리렌더 회피
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const backingPlayingSlug = useAppStore((s) => s.backing.backingPlayingSlug);
  const currentChordSymbol = useAppStore(
    (s) => s.backing.backingCurrentChord?.symbol ?? null,
  );

  const isBackingActive = backingPlayingSlug !== null;
  const effectiveRoot = isBackingActive ? backingKey : fretboardRoot;

  // chordTonePcs 계산 (useMemo) — symbol만 deps이므로 안정적인 Set 인스턴스
  const chordTonePcs = useMemo(() => {
    if (!isBackingActive || !currentChordSymbol) return undefined;
    return chordPitchClassSet(currentChordSymbol, backingKey) ?? undefined;
  }, [isBackingActive, currentChordSymbol, backingKey]);

  // ... notes 계산 시 effectiveRoot 사용 ...

  return (
    <>
      <Fretboard
        notes={notes}
        openStrings={openStrings}
        chordTonePcs={chordTonePcs}
        chordSymbol={currentChordSymbol}
        /* ...other props */
      />
      <RootPicker syncedToBacking={isBackingActive} />
    </>
  );
}
```

**키 점프 UX (배킹 정지 시)**: backing playing → idle 전환되면 effectiveRoot가 backingKey → fretboardRoot로 전환된다. 두 값이 다르면 사용자에게 "키가 점프"하는 인상. v1에서는 의도된 동작(사용자 선택 root로 복귀); v2+에서 부드러운 전환 UX 검토.

### 4.4 RootPicker — 동기화 인디케이터

```typescript
export interface RootPickerProps {
  /** 배킹 재생 중일 때 true — disabled + "Synced to Key Selector" 표시. */
  syncedToBacking?: boolean;
}
```

`syncedToBacking === true`이면:
- 모든 12 root 버튼 disabled
- 상단 라벨 영역의 "Root" 텍스트를 "Root · Synced"로 교체 (footer 추가 시 레이아웃 shift)
- active 버튼의 강조(`bg-accent-brass`)도 함께 dimmed — 모든 버튼을 균등하게 비활성으로 보이게(`bg-bg-raised text-ink-muted`). 현재 동기화된 키 정보는 라벨로만 전달.
- 컨테이너 opacity 70% 적용 가능

### 4.5 chordPitchClassSet (theory helper)

```typescript
// lib/theory/chord-voicing.ts
import { chordPitchClasses } from './chords';

/**
 * chordPitchClasses의 결과를 Set으로 래핑 — 지판 렌더 시 O(1) lookup.
 * 파싱 실패 시 null 반환.
 */
export function chordPitchClassSet(symbol: string, keyRoot: PitchClass): Set<number> | null {
  const pcs = chordPitchClasses(symbol, keyRoot);
  if (!pcs) return null;
  return new Set(pcs);
}
```

### 4.6 UseRecommendedScaleButton

`setFretboardScale`은 store에 없음 — 기존 `setScale: (scale: ScaleKey) => void`를 사용. 별도 alias 추가 안 함.

`recommended_scales[0]`이 raw string이고 `ScaleKey`로 캐스팅 안전한지(SCALES에 정의된 키인지) 런타임 검증 필요. 알려지지 않은 키는 무시.

```typescript
// components/jam/UseRecommendedScaleButton.tsx
'use client';

import { useAppStore } from '@/lib/store/app-store';
import { SCALES } from '@/lib/theory/scales';
import type { ScaleKey } from '@/lib/theory/types';

interface Props {
  template: ProgressionTemplate;
}

function isKnownScale(s: string): s is ScaleKey {
  return Object.prototype.hasOwnProperty.call(SCALES, s);
}

export function UseRecommendedScaleButton({ template }: Props) {
  const setScale = useAppStore((s) => s.setScale);
  const recommended = template.recommended_scales[0];
  if (!recommended || !isKnownScale(recommended)) return null;
  return (
    <button
      type="button"
      onClick={() => setScale(recommended)}
      className="border border-ink-muted/20 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-ink-muted transition-colors duration-75 hover:border-accent-brass/40 hover:text-accent-brass"
    >
      Apply scale: {recommended.replace(/_/g, ' ')}
    </button>
  );
}
```

(border-only 텍스트 버튼. `transition-colors duration-75`로 bare `transition` 금지 회피. ProgressionPlayButton idle 패턴과 통일.)

## 5. CSS 토큰 + 애니메이션

### 5.1 globals.css 추가

기존 `--color-scale-chord` 토큰 재사용. 새 토큰 추가 안 함.

```css
/* 코드 톤 halo — chordSymbol key prop 변경 시 group re-mount되어 0%부터 재시작 */
@keyframes chord-tone-pulse {
  0% { opacity: 0; }
  20% { opacity: 0.75; }
  100% { opacity: 0.5; }
}

.chord-tone-halo {
  animation: chord-tone-pulse 0.6s ease-out forwards;
}
```

attack 빠르고(20%까지 0.75 점화) decay 자연스러운(100%까지 0.5로 안착) 곡선. fill 모드 forwards로 0.6s 이후 정적 0.5 유지.

### 5.2 reduced motion

전역 `*::before, *::after` `animation-duration: 0.01ms !important` 규칙이 이미 존재(`globals.css` 93~96줄). 별도 chord-tone-halo 규칙 작성해도 덮어씌워짐.

대신 chord-tone-halo의 정적 fallback을 보장:
- animation `forwards`로 마지막 프레임(opacity 0.5)에 안착 → animation-duration이 0.01ms로 강제되어도 결과적으로 opacity 0.5의 정적 halo가 표시됨
- 별도 처리 불필요

## 6. 데이터 흐름

```
[Backing Engine] -- _setBackingCurrentChord({symbol, barIndex}) --> [Store]
[KeySelector]   -- setBackingKey(pc)                            --> [Store]
[Backing Engine] -- _setBackingPlaying(slug | null)             --> [Store]

[FretboardClient] subscribes to:
  s.backing.backingPlayingSlug   -> isBackingActive
  s.backing.backingKey           -> effectiveRoot when active
  s.backing.backingCurrentChord  -> currentChord.symbol for chordTonePcs
  s.fretboard.root               -> effectiveRoot when idle
  ...

각 마디 콜백 시:
  Engine -> queueMicrotask(setState({chordSymbol, ...}))
  Store -> _setBackingCurrentChord
  Store subscribers (FretboardClient) -> re-render with new chordTonePcs
  Fretboard -> 각 NoteMark에 isChordTone 결정해 FretboardNote 렌더
```

리렌더 빈도: BPM 90 기준 마디당 1회 (~22 bars/min). 지판 SVG 720+ 노트 마커지만, React + memo 최적화로 무시 가능.

## 7. 테스트 전략

### 단위
- `chordPitchClassSet`: parse 가능/실패 케이스 + Set 결과 정합성
- 기존 `chordPitchClasses` 테스트는 그대로

### 컴포넌트
- `Fretboard-chord-tone.test.tsx`:
  - `chordTonePcs={Set([0, 4, 7])}` 전달 시 C/E/G 해당 노트에 halo SVG 추가됨
  - `chordTonePcs={undefined}` 시 halo 없음
  - halo는 outline-only, stroke = chord-tone-halo 토큰
- `UseRecommendedScaleButton.test.tsx`:
  - `recommended_scales` 비었으면 미렌더
  - 클릭 시 `setFretboardScale` 호출
- `FretboardClient`:
  - 기존 fretboard 테스트 + 새 시나리오:
    - `backingPlayingSlug = null` → root = `s.fretboard.root`
    - `backingPlayingSlug = 'x'` → root = `s.backing.backingKey`
    - `backingCurrentChord = { symbol: 'I7', ... }` + backingKey=0 → chordTonePcs = {0,4,7,10}
- `RootPicker`:
  - `syncedToBacking={true}` → 모든 버튼 disabled, indicator 노출

### E2E (선택)
- /jam에서 카드 ▶ → fretboard root가 backingKey로 자동 변경 (DOM 검증)
- "Use recommended scale" 클릭 → fretboard scale prop이 바뀜

## 8. 마이그레이션 / 정리

- 신규 파일은 `aesthetic-reviewer` + `fretboard-renderer` 두 게이트 통과 필수
- `RootPicker` props 변경은 호환 유지 (default `syncedToBacking = false`)
- store는 변경 없음 (backing 슬라이스 그대로 활용)
- persist version 변경 없음

## 9. 리스크 / 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 매 마디 chord tone 재계산이 React 리렌더 폭증 | 60 BPM에서 4초당 1회, 무시 가능 — 다만 Fretboard 노트 720개에 isChordTone prop 변화 → memo 잘 안 되면 전부 리렌더 | FretboardNote에 React.memo. props가 isChordTone, tier, cx, cy, label 정도라 비교 가벼움 |
| 코드톤 halo가 root 큰 원과 시각 충돌 | 가독성 저하 | aesthetic-reviewer 게이트. r * 1.6 outline + 낮은 opacity로 "옷 입힌" 느낌 |
| 사용자가 fretboard 자체 키를 바꾸고 싶은 경우 | UX 답답 | RootPicker disabled 상태로 명확. v2에서 "unlock" 토글 추가 검토 |
| `setFretboardScale` 액션이 store에 없음 | UseRecommendedScaleButton 동작 불가 | Task에서 확인 후 없으면 추가 |
| 코드톤 색이 기존 highlight 토큰과 충돌 | aesthetic 회귀 | `--color-chord-tone-halo` 별도 토큰, 다른 의미와 분리 |

## 10. 작업 분해 (Plan에서 상세화)

1. `chordPitchClassSet` 헬퍼 + 단위테스트
2. globals.css 토큰 + 펄스 애니메이션 클래스
3. Fretboard.tsx + FretboardNote.tsx — halo 렌더 + 컴포넌트 테스트
4. RootPicker.tsx — `syncedToBacking` prop + 인디케이터
5. FretboardClient.tsx — backing 상태 구독해 effectiveRoot/chordTonePcs 계산
6. UseRecommendedScaleButton + ProgressionCatalogClient 통합
7. 통합 테스트 + 수동 검증
8. PR

1·2 병렬. 3은 1·2 의존. 4는 단독. 5는 3·4 의존. 6은 단독. 7은 5·6 통합 후.

## 11. 오픈 이슈

- 오픈 스트링(fret 0)은 OpenStringMarker로 별도 렌더 — 코드톤이어도 halo 미적용 (의도). 사용자 피드백 시 v2에서 OpenStringMarker에도 halo 추가 검토.
- regular tier가 isChordTone일 때 aria-label 노출 정책 — 현재 regular는 aria-hidden. v2에서 코드톤 노트에 한해 노출 검토 (회귀 시 도배 위험).
- 좌/우 손잡이 전환 시 halo 위치 — 기존 mirrorX(cx) 좌표가 그대로 전달되므로 자동 추종. 추가 작업 없음.
