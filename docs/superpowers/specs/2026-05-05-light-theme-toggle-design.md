# Light Theme Toggle — 디자인 스펙

- **작성일**: 2026-05-05
- **상태**: Draft (구현 plan 작성 전 단계)
- **요청 배경**: 앱이 다크 테마 단일 정체성으로 설계돼 있는데, 밝은 환경(낮·외부 디스플레이)에서도 쓰고 싶다는 사용자 요구.
- **스코프 한계**: 이 스펙은 *테마 전환 인프라 + 라이트 팔레트 시안* 한정. 새로운 컴포넌트 디자인이나 라이트 모드 전용 기능 추가는 포함하지 않는다.

---

## 1. 목표와 비목표

### 목표
- 헤더에서 1클릭으로 라이트 ↔ 다크 전환.
- 사용자 선택은 새로고침·재방문 후에도 보존.
- 라이트 모드에서도 *Analog instrument panel × Editorial magazine* 정체성을 유지(brass/copper/signal-red 핵심 accent를 그대로 살리고 배경만 "악보지" 톤으로 반전).
- 컴포넌트 코드 수정 0줄 — 토큰 재정의만으로 전환.
- FOUC(첫 페인트 시 다크 → 라이트 깜빡) 없음.

### 비목표
- 시스템 환경설정(`prefers-color-scheme`) 추적: 사용자 의사결정에 따라 **첫 방문은 항상 다크**, 시스템 무시.
- 키보드 단축키, 페이지별 다른 테마, 부분 다크 모드, 3-state 토글(Auto/Light/Dark): 모두 비목표.
- favicon · OG 이미지 · `viewport.themeColor` 등 브랜드 자산: 의도적으로 다크 고정 유지.

---

## 2. 결정 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 토글 위치 | 헤더 우측 상단(전역) | 1클릭 접근, sticky라 항상 노출 |
| 첫 방문 기본값 | 항상 `'dark'` | 정체성 유지, 시스템 환경설정 무시 |
| 사용자 선택 저장 | 기존 app-store `ui.theme` 재사용 | 단일 진실의 원천, persist 일관성 |
| 팔레트 캐릭터 | "악보지/편집지" 톤 (cream + dark brass) | 다크의 brass/copper/signal-red hue 재사용, 배경만 반전 |
| 적용 메커니즘 | `html[data-theme="light"]` CSS 토큰 재정의 | 컴포넌트 코드 손대지 않음 |
| FOUC 방지 | `<head>` inline 스크립트로 hydration 전 `data-theme` 박음 | persisted 라이트 사용자 새로고침 깜빡 차단 |

---

## 3. 토큰 구조

### 3.1 globals.css 재구성

`@theme` 블록은 **다크 = 기본값**으로 그대로 유지. 그 아래 `html[data-theme="light"]` selector가 동일 변수명을 라이트 값으로 재정의.

```css
@theme {
  /* 기존 다크 토큰 그대로 — bg-base, ink-primary, accent-brass 등 */
}

html[data-theme="light"] {
  /* Background — 크림지 톤 */
  --color-bg-base:     #F4ECD8;
  --color-bg-elevated: #ECE2C6;
  --color-bg-raised:   #E2D6B4;

  /* Ink — 잉크 같은 짙은 갈색(순흑 회피로 종이 인쇄 느낌) */
  --color-ink-primary:   #2A1E14;
  --color-ink-secondary: #5C4A36;
  --color-ink-muted:     #8A7659;

  /* Accents — hue 유지, 명도만 어둡게 */
  --color-accent-brass:  #8B6F2E;
  --color-accent-copper: #8E4F1D;
  --color-accent-signal: #C03B36;

  /* Fretboard tier */
  --color-scale-root:  #C03B36;
  --color-scale-tone:  #8B6F2E;
  --color-scale-chord: #2C7BB8;

  /* Highlight 5색 */
  --color-highlight-orange: #B5742A;
  --color-highlight-green:  #5E8F46;
  --color-highlight-blue:   #2C7BB8;
  --color-highlight-rose:   #9E5A5E;
  --color-highlight-teal:   #4F8079;

  /* State */
  --color-state-ok:   #5E8F46;
  --color-state-warn: #B5742A;
  --color-state-err:  #C03B36;
}
```

> 팔레트 hex 값은 **시안(starting set)**. 구현 후 `aesthetic-reviewer` 게이트에서 미세 조정될 수 있다. 단 *hue 카테고리*(brass=황동, signal=빨강, blue=하늘색)는 변경 금지.

### 3.2 `color-scheme` 동기화

현재 `html { color-scheme: dark; }` 하드코딩. 라이트 모드에선 네이티브 스크롤바·폼 컨트롤이 어둡게 남아 부조화. ThemeSync 컴포넌트가 `documentElement.style.colorScheme`을 동적으로 토글.

### 3.3 컴포넌트 한정 보정

대부분 토큰만으로 끝나지만 *opacity 기반 시각 효과* 두 곳은 light 모드에서 약해진다:

- **`.chord-overlay`** keyframe: 현재 `0% → 0.85 → 100% 0.6 forwards`. light 모드에선 cream 위 0.6 opacity 색이 빠져 보일 수 있어 `html[data-theme="light"] .chord-overlay { animation-name: chord-overlay-pulse-light; }` 로 분기, 라이트 keyframe은 `0 → 0.95 → 0.78`.
- **`BeatLED` glow box-shadow**: 어둠 위 빨강 발광이 핵심인데 light에선 metaphor 약화. light 모드 한정 box-shadow opacity를 0.3 → 0.15로 낮춤. fill 색은 그대로 강조.

이 두 곳 외 컴포넌트는 손대지 않는다.

---

## 4. Store 통합

### 4.1 현재 상태

- `lib/store/app-store.ts` 라인 79: `theme: 'dark' | 'light'` 필드 **이미 존재**.
- `DEFAULT_UI.theme = 'dark'` (라인 239) — 기본값도 적합.
- **No setTheme / toggleTheme action**, **no DOM wiring**, persist 버전은 12.

### 4.2 추가할 것

```ts
// AppState 인터페이스
setTheme: (next: 'dark' | 'light') => void;
toggleTheme: () => void;
```

```ts
// 구현 (chordDisplayMode setter와 동일 패턴)
setTheme: (next) => set((s) => { s.ui.theme = next; }),
toggleTheme: () =>
  set((s) => {
    s.ui.theme = s.ui.theme === 'dark' ? 'light' : 'dark';
  }),
```

### 4.3 마이그레이션

**불필요.** 기존 v12 사용자는 `DEFAULT_UI` merge로 `theme`이 자동 채워져 `'dark'`가 보존된다. partialize · rehydrate 로직 변경 없음. version bump 없음.

---

## 5. 적용 메커니즘

### 5.1 `<html>` 속성 동기화

신설 `components/ui/ThemeSync.tsx` (Client Component):

```tsx
'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';

/**
 * store의 ui.theme를 documentElement에 반영하는 사이드이펙트 컴포넌트.
 * 자체 마크업 없음. RootLayout에 1회 마운트.
 */
export function ThemeSync() {
  const theme = useAppStore((s) => s.ui.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  return null;
}
```

`app/layout.tsx`의 `<body>` 안에 `<ThemeSync />`를 한 번 마운트.

### 5.2 FOUC 방지 inline 스크립트

라이트 사용자가 새로고침 시 — React hydration 전엔 store가 아직 안 읽혀서 다크가 잠깐 보였다가 라이트로 바뀐다. `<head>` 직속 inline 스크립트로 hydration 이전에 처리:

스크립트는 다음 동작을 수행:
1. `localStorage`에서 `'my-music-app:v1'` 키 읽기 (try/catch로 감싸 실패 시 즉시 폴백).
2. JSON 파싱 후 `state.ui.theme` 추출. 없으면 `'dark'` 폴백.
3. `'light'`이면 `documentElement.dataset.theme = 'light'`, `style.colorScheme = 'light'`. 다크면 아무것도 안 함(기본값).

**삽입 방법**: Next.js App Router에서 `RootLayout`의 `<html>` 안, `<body>` 직전에 `next/script`의 `<Script id="theme-fouc" strategy="beforeInteractive">` 컴포넌트로 IIFE 문자열을 children으로 전달. `beforeInteractive` 전략은 hydration 이전·CSS 적용과 동시에 실행돼 깜빡임 없음. 일반 `<script>` 태그를 직접 삽입하는 것은 App Router에서 stripping 동작이 일관되지 않아 회피.

> 이 스크립트는 **localStorage 키와 store 형태에 의존**하므로 persist 키나 `ui.theme` 위치를 바꿀 때 같이 갱신해야 한다. 위치 의존을 줄이기 위해 try/catch로 감싸 실패 시 다크 폴백 + 코드에 `// SYNC WITH: app-store persist key/shape` 주석 명시.

### 5.3 트랜지션

`globals.css`의 `body` 셀렉터에 추가:

```css
body {
  /* 토글 시 깜빡 회피 — 색만 부드럽게 */
  transition: background-color 200ms ease, color 200ms ease;
}
```

지판 SVG · 메트로놈 LED 등은 transition 없이 즉시 반영(중간 색 잔상 회피).

---

## 6. 토글 컴포넌트

### 6.1 위치

- `apps/web/app/(practice)/layout.tsx` 헤더 — `<MetronomeDock />` **좌측**, ul 네비 우측. 도구(dock)와 환경 컨트롤(theme) 시각 분리.
- `apps/web/app/page.tsx` 랜딩 — 우측 `<p>v1.0.0</p>` **좌측**에 추가.

### 6.2 시각

신설 `components/ui/ThemeToggle.tsx`:

```tsx
'use client';
import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';

export function ThemeToggle() {
  const hydrated = useHasHydrated();
  const theme = useAppStore((s) => s.ui.theme);
  const toggle = useAppStore((s) => s.toggleTheme);

  // SSR 시 다크 가정 — hydrated 전엔 sun 아이콘 고정으로 mismatch 회피
  const Icon = hydrated && theme === 'light' ? Moon : Sun;
  const next = theme === 'light' ? '다크 모드' : '라이트 모드';

  return (
    <button
      type="button"
      onClick={() => toggle()}
      aria-label={`${next}로 전환`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-ink-muted/20 text-ink-secondary transition-colors hover:border-accent-brass hover:text-accent-brass"
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
```

- 32×32 정사각, brass-outline.
- *전환 후* 상태를 보여주는 컨벤션 — 다크면 ☀, 라이트면 ☾.
- `useHasHydrated()`로 SSR mismatch 회피(첫 렌더는 항상 sun).
- `lucide-react` 의존성 추가 필요(없으면 inline SVG로 대체 가능, 단 `lucide-react`는 가벼워 권장).

### 6.3 키보드/접근성

- `<button>`이라 Tab/Enter/Space 자동.
- `aria-label`이 동적으로 다음 상태를 안내.
- focus-visible은 globals.css의 brass outline 글로벌 규칙으로 자동 적용.

---

## 7. 영향 받는 컴포넌트 검수

| 컴포넌트 | 위험 수준 | 검수 포인트 |
|---|---|---|
| `Fretboard` 노트 마커 | 중 | scale-tone(brass), highlight-orange가 cream 위에서 명도 충분한지. 시안 hex가 cream 대비 4.5:1 이상이도록 미세 조정 |
| `ChordOverlay` | 중 | opacity 0.6이 cream에서 빠져 보임 — light 모드 keyframe 분기 (0.95/0.78) |
| `BeatLED` | 중 | 발광 metaphor 약화 — box-shadow opacity 0.3 → 0.15 |
| `ImportantDegreesToggle` 5색 chip | 중 | hue 식별 가능한지 aesthetic-reviewer 확인 |
| `ProgressionCatalog` 카테고리 accent | 저 | 토큰만 변경, 자동 반영 |
| `RandomTaunt` 페이드 | 저 | opacity-only, 영향 없음 |
| `MetronomeDock` | 저 | 토큰만 |
| favicon · `apple-icon` · `opengraph-image` · `viewport.themeColor` | — | **변경하지 않음**. 브랜드 자산은 다크 고정 |

`components/`에 hex/rgba 하드코딩 0건 확인 — 토큰 의존 규율은 잘 지켜져 있다.

---

## 8. 파일 변경 목록

신설 (2):
- `apps/web/components/ui/ThemeSync.tsx`
- `apps/web/components/ui/ThemeToggle.tsx`

수정 (5):
- `apps/web/app/globals.css` — `html[data-theme="light"]` 토큰 재정의 + body transition + chord-overlay light keyframe + BeatLED light box-shadow 분기 + 기존 `color-scheme: dark` 제거
- `apps/web/app/layout.tsx` — `<head>` inline FOUC 스크립트 + `<ThemeSync />` 마운트
- `apps/web/app/(practice)/layout.tsx` — 헤더에 `<ThemeToggle />` 마운트
- `apps/web/app/page.tsx` — 랜딩 헤더에 `<ThemeToggle />` 마운트
- `apps/web/lib/store/app-store.ts` — `setTheme` / `toggleTheme` 액션 추가

의존성 (1):
- `lucide-react` 추가(미설치 시) — 또는 inline SVG로 대체

---

## 9. 테스트 전략

### Unit
- `tests/unit/lib/store/app-store.test.ts` — `setTheme('light')` 호출 시 `ui.theme === 'light'`, `toggleTheme()` 두 번 호출 시 원복, 초기값 `'dark'` 검증.

### Component
- `tests/component/ThemeToggle.test.tsx` — 렌더 시 `aria-label` 동적, 클릭 시 `toggleTheme` 호출, 다크/라이트 시 아이콘 분기.

### E2E (Playwright, Docker)
- `tests/e2e/theme-toggle.spec.ts`:
  1. 첫 방문: `<html data-theme>`이 비어있거나 `dark` (다크가 기본).
  2. 토글 클릭: `<html data-theme="light">`, body 배경이 라이트 hex와 일치.
  3. 새로고침: 라이트가 보존되며, *첫 페인트부터* 라이트(FOUC 검증). `evaluate(() => getComputedStyle(document.body).backgroundColor)` 즉시 호출하여 라이트 값 확인.
  4. 토글 두 번: 다크 복귀, localStorage `my-music-app:v1`의 `state.ui.theme`이 `'dark'`.

### Visual
- `aesthetic-reviewer` 1회 통과 — 라이트 팔레트가 *Analog instrument panel × Editorial magazine* 정체성 유지.
- `pnpm screenshots` 14장을 라이트 모드에서도 캡처해서 `docs/introduction/auto-light/`에 저장. 다크와 1:1 비교(추후 README 업데이트는 별도 작업).

---

## 10. 검증 게이트 (커밋 전)

- [ ] `pnpm lint` 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 통과 (신규 unit/component 포함)
- [ ] `pnpm test:e2e` 통과 (Docker)
- [ ] aesthetic-reviewer 1회 통과
- [ ] 라이트 모드 14장 스크린샷 결정론적으로 캡처

---

## 11. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| 라이트 팔레트 시안이 `aesthetic-reviewer` 통과 못 함 | hue 카테고리는 고정, 명도/채도만 조정 가능. 1차 거절 시 reviewer 피드백 반영 후 재검토 |
| FOUC 스크립트가 localStorage 형태 변경에 취약 | try/catch로 감싸 실패 시 다크 폴백. persist 키 · `ui.theme` 위치 변경 시 함께 갱신하라는 주석 명시 |
| 시각 효과(opacity 기반)가 라이트에서 약함 | chord-overlay · BeatLED에 한정 light 분기 적용. 그 외에서 추가 발견되면 후속 패치 |
| `useHasHydrated` 훅이 토글에 적용되지 않으면 SSR mismatch 워닝 | ThemeToggle에 hydrated 가드 명시(섹션 6.2 코드) |
| `lucide-react`가 미설치 | 의존성 1개 추가 또는 inline SVG로 대체(번들 사이즈 영향 미미) |

---

## 12. 후속 작업 (이번 스펙 외)

- README/marketing 14장 라이트 모드 캡처를 본 폴더로 이전.
- 키보드 단축키(예: `Ctrl/Cmd + J`) 도입 검토.
- 시스템 환경설정 추적이 필요해지면 3-state 토글로 확장.
- light 모드용 favicon/OG 이미지 별도 제공.
