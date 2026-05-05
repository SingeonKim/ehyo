# Light Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 헤더 토글 버튼으로 라이트/다크 테마를 1클릭 전환하고 사용자 선택을 영속화한다.

**Architecture:** 기존 `ui.theme` 필드(이미 store v12에 정의됨)에 `setTheme`/`toggleTheme` 액션을 추가하고, `<html data-theme="light">` 속성을 통해 `globals.css`의 `@theme` 다크 토큰을 라이트 팔레트로 재정의한다. 컴포넌트 코드는 손대지 않는다. FOUC 방지를 위해 `next/script` `beforeInteractive`로 hydration 이전에 `data-theme`을 박는다.

**Tech Stack:** Next.js 15 App Router, Zustand 4 + immer, Tailwind v4 `@theme`, lucide-react(이미 설치), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-05-light-theme-toggle-design.md`

**알려진 스펙 보정 (이 plan에서 적용):**
- 스펙 §3.3에 BeatLED `box-shadow` 약화 항목이 있으나, 코드 확인 결과 BeatLED는 `box-shadow`를 사용하지 않음(border + bg-color만). 이 항목은 본 plan에서 제거.
- chord-overlay light keyframe 분기는 그대로 적용.

---

## File Structure

신설 (2):
- `apps/web/components/ui/ThemeSync.tsx` — `ui.theme` → `documentElement.dataset.theme` 동기화 사이드이펙트 컴포넌트(자체 마크업 없음).
- `apps/web/components/ui/ThemeToggle.tsx` — sun/moon 아이콘 토글 버튼.

수정 (5):
- `apps/web/lib/store/app-store.ts` — `setTheme` / `toggleTheme` 액션 추가.
- `apps/web/app/globals.css` — `html[data-theme="light"]` 토큰 재정의 + body 트랜지션 + chord-overlay light keyframe + `html { color-scheme: dark }` 정적 제거.
- `apps/web/app/layout.tsx` — FOUC 방지 inline 스크립트(`next/script` `beforeInteractive`) + `<ThemeSync />` 마운트.
- `apps/web/app/(practice)/layout.tsx` — 헤더 navigation에 `<ThemeToggle />` 마운트.
- `apps/web/app/page.tsx` — 랜딩 헤더에 `<ThemeToggle />` 마운트.

신규 테스트 (3):
- `apps/web/tests/unit/lib/store/theme-actions.test.ts` — `setTheme`/`toggleTheme` 액션 검증.
- `apps/web/tests/component/ThemeToggle.test.tsx` — 렌더·클릭·아이콘 분기.
- `apps/web/tests/e2e/theme-toggle.spec.ts` — 토글 → persist → FOUC 검증.

---

## Task 1: store에 `setTheme` / `toggleTheme` 액션 추가

**Files:**
- Test: `apps/web/tests/unit/lib/store/theme-actions.test.ts` (create)
- Modify: `apps/web/lib/store/app-store.ts`

이 액션이 store에 없는 상태에서 ThemeToggle을 만들 수 없으니 가장 먼저 작업.

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/store/theme-actions.test.ts` 신설:

```ts
/**
 * setTheme / toggleTheme 액션 단위 테스트.
 * persist 미들웨어를 거치지 않고 store 액션만 직접 검증.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '@/lib/store/app-store';

describe('UI theme actions', () => {
  beforeEach(() => {
    // 각 테스트마다 store를 초기 상태로 리셋
    useAppStore.setState((s) => {
      s.ui.theme = 'dark';
    });
  });

  it('초기값은 dark', () => {
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });

  it('setTheme(\"light\") 호출 시 ui.theme === \"light\"', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().ui.theme).toBe('light');
  });

  it('setTheme(\"dark\") 호출 시 ui.theme === \"dark\"', () => {
    useAppStore.getState().setTheme('light');
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });

  it('toggleTheme() 한 번: dark → light', () => {
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().ui.theme).toBe('light');
  });

  it('toggleTheme() 두 번: dark → light → dark', () => {
    useAppStore.getState().toggleTheme();
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @my-music-app/web test tests/unit/lib/store/theme-actions.test.ts
```

Expected: FAIL — `setTheme is not a function` / `toggleTheme is not a function`.

- [ ] **Step 3: AppState 인터페이스에 액션 시그니처 추가**

`apps/web/lib/store/app-store.ts` — `AppState` 인터페이스 (라인 ~129) 에서 UI 액션을 추가할 영역을 찾아 다음을 삽입(이미 `setChordDisplayMode`가 있는 UI 섹션 근처):

```ts
  // UI 액션 (테마 토글 + 코드 표기)
  setTheme: (next: 'dark' | 'light') => void;
  toggleTheme: () => void;
```

- [ ] **Step 4: 액션 구현 추가**

같은 파일의 `create<AppState>()(persist(immer(...)))` 안, 기존 `setChordDisplayMode` 구현 근처에 추가:

```ts
      setTheme: (next) =>
        set((s) => {
          // ThemeSync가 ui.theme를 구독해 documentElement.dataset.theme를 갱신.
          s.ui.theme = next;
        }),
      toggleTheme: () =>
        set((s) => {
          s.ui.theme = s.ui.theme === 'dark' ? 'light' : 'dark';
        }),
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @my-music-app/web test tests/unit/lib/store/theme-actions.test.ts
```

Expected: PASS — 5 passed.

- [ ] **Step 6: typecheck**

```bash
pnpm --filter @my-music-app/web typecheck
```

Expected: 컴파일 에러 없음.

- [ ] **Step 7: commit**

```bash
git add apps/web/tests/unit/lib/store/theme-actions.test.ts apps/web/lib/store/app-store.ts
git commit -m "$(cat <<'EOF'
feat(store): add setTheme/toggleTheme actions for ui.theme

ui.theme 필드는 v12부터 store에 존재했지만 설정 액션이 없어 dead state였다.
setTheme/toggleTheme을 추가해 ThemeToggle UI에서 호출할 수 있게 한다.

마이그레이션 불필요 — 기존 사용자는 DEFAULT_UI merge로 'dark' 보존.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: globals.css에 라이트 팔레트 토큰 + body 트랜지션 추가

**Files:**
- Modify: `apps/web/app/globals.css`

토큰만 추가 — 이 단계 이후에도 `data-theme`이 박히기 전이라 시각 변화 없음(아직 실행 경로에 진입 안 함).

- [ ] **Step 1: `html[data-theme="light"]` 블록 추가**

`apps/web/app/globals.css`의 `@theme { ... }` 블록 **바로 뒤**에 다음을 삽입(라인 86 직후):

```css
/* ──────────────────────────────────────
 * 라이트 모드 토큰 재정의
 * data-theme="light"가 <html>에 박히면 동일 변수명을 새 값으로 덮어씀.
 * 컴포넌트는 같은 토큰 클래스(bg-bg-base 등)를 그대로 쓰므로 자동 반영.
 * 캐릭터: "악보지/편집지" — 크림지 배경 + 짙은 갈색 잉크 + 어두운 황동 accent.
 * ────────────────────────────────────── */
html[data-theme="light"] {
  /* Background — 크림지 톤 */
  --color-bg-base:     #F4ECD8;
  --color-bg-elevated: #ECE2C6;
  --color-bg-raised:   #E2D6B4;

  /* Ink — 잉크 같은 짙은 갈색(순흑 회피로 종이 인쇄 느낌) */
  --color-ink-primary:   #2A1E14;
  --color-ink-secondary: #5C4A36;
  --color-ink-muted:     #8A7659;

  /* Accents — hue 유지, 명도만 어둡게(크림 위 가독성 확보) */
  --color-accent-brass:  #8B6F2E;
  --color-accent-copper: #8E4F1D;
  --color-accent-signal: #C03B36;

  /* Fretboard tier — root/tone/chord 동일 hue, 명도 보정 */
  --color-scale-root:  #C03B36;
  --color-scale-tone:  #8B6F2E;
  --color-scale-chord: #2C7BB8;

  /* Highlight 5색 — Important degrees 칩 */
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

- [ ] **Step 2: `html { color-scheme: dark }` 정적 값 제거 + body 트랜지션 추가**

같은 파일에서 다음 블록을 찾아:

```css
html {
  /* 수치 tabular 정렬 기본값 — BPM·도수 표기에서 숫자 흔들림 방지 */
  font-feature-settings: "tnum" 1, "cv02" 1, "cv11" 1;
  color-scheme: dark;
}
```

`color-scheme: dark;` 라인을 **삭제**(ThemeSync 컴포넌트가 동적으로 토글). 다른 라인은 유지:

```css
html {
  font-feature-settings: "tnum" 1, "cv02" 1, "cv11" 1;
}
```

이어 `body { ... }` 블록 끝에 트랜지션을 추가:

```css
body {
  background: var(--color-bg-base);
  color: var(--color-ink-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  /* 테마 토글 시 색이 부드럽게 페이드. SVG·LED 등은 자체 transition으로 즉시 반영. */
  transition: background-color 200ms ease, color 200ms ease;
}
```

- [ ] **Step 3: chord-overlay 라이트 모드 keyframe 분기 추가**

`@keyframes chord-overlay-pulse` 블록 바로 뒤에 추가:

```css
/* 라이트 모드에선 cream 배경 위 0.6 opacity가 빠져 보여 0.78까지 상향. */
@keyframes chord-overlay-pulse-light {
  0%   { opacity: 0; }
  20%  { opacity: 0.95; }
  100% { opacity: 0.78; }
}

html[data-theme="light"] .chord-overlay {
  animation-name: chord-overlay-pulse-light;
}
```

- [ ] **Step 4: 빌드/타입체크로 CSS 파싱 검증**

```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```

Expected: 둘 다 통과. CSS는 빌드 타임에 Tailwind v4가 처리하므로 문법 오류 시 빌드 실패.

- [ ] **Step 5: dev 서버 띄워서 시각 회귀 확인**

```bash
pnpm --filter @my-music-app/web dev
```

브라우저에서 http://localhost:3000 열기 — `data-theme`이 아직 박히지 않으므로 다크 그대로. 시각 변화 없으면 정상(이 단계는 토큰 정의만).

- [ ] **Step 6: commit**

```bash
git add apps/web/app/globals.css
git commit -m "$(cat <<'EOF'
style(ui): add light theme tokens + body color transition

악보지 캐릭터(cream + dark brass)의 라이트 팔레트를 html[data-theme="light"]
selector에 정의. @theme의 다크 기본값을 동일 변수명으로 덮어써 컴포넌트
코드 수정 없이 전환된다.

color-scheme 정적 dark 제거 — ThemeSync가 동적으로 토글한다.
chord-overlay는 cream 위 opacity 빠짐 보정을 위해 라이트 전용 keyframe.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ThemeSync 컴포넌트 신설

**Files:**
- Create: `apps/web/components/ui/ThemeSync.tsx`

`ui` 디렉토리 자체가 없으니 첫 파일이 디렉토리도 만든다.

- [ ] **Step 1: 파일 생성**

`apps/web/components/ui/ThemeSync.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

import { useAppStore } from '@/lib/store/app-store';

/*
 * 사이드이펙트 전용 컴포넌트 — store의 ui.theme 변화를 documentElement에 반영.
 * 자체 마크업은 없다. RootLayout에 1회만 마운트하면 앱 전역 테마가 따라온다.
 *
 * SSR/Hydration: 첫 클라이언트 렌더에서 useEffect가 실행되어 dataset.theme를
 * 박는다. FOUC 방지를 위해 RootLayout의 inline 스크립트(beforeInteractive)가
 * hydration *이전에* 같은 속성을 미리 설정해 두므로 깜빡임 없음.
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

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @my-music-app/web typecheck
```

Expected: PASS.

- [ ] **Step 3: commit**

```bash
git add apps/web/components/ui/ThemeSync.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add ThemeSync side-effect component

store의 ui.theme를 documentElement.dataset.theme + style.colorScheme에
반영. RootLayout에 1회 마운트해 앱 전역 테마를 store와 동기화한다.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: RootLayout에 FOUC 스크립트 + ThemeSync 마운트

**Files:**
- Modify: `apps/web/app/layout.tsx`

여기서 처음으로 `data-theme`이 실제로 박혀 라이트 모드가 *동작*한다. localStorage에 라이트가 저장된 상태로 새로고침해도 깜빡 없음.

- [ ] **Step 1: `next/script` import 추가**

`apps/web/app/layout.tsx` 상단 import 영역에 추가:

```tsx
import Script from 'next/script';
```

- [ ] **Step 2: ThemeSync import 추가**

같은 import 영역:

```tsx
import { ThemeSync } from '@/components/ui/ThemeSync';
```

- [ ] **Step 3: FOUC 스크립트 상수 정의**

파일 상단(import 직후, 컴포넌트 선언 앞)에 다음 상수를 추가:

```tsx
/*
 * FOUC 방지 — hydration 이전에 localStorage의 라이트 선택을 읽어
 * documentElement에 data-theme/colorScheme를 박는다.
 *
 * SYNC WITH: app-store persist key('my-music-app:v1') + ui.theme 위치.
 * 키나 위치를 바꿀 때 이 스크립트도 같이 갱신.
 */
const THEME_FOUC_SCRIPT = `(function(){try{var raw=localStorage.getItem('my-music-app:v1');if(!raw)return;var t=JSON.parse(raw).state.ui.theme;if(t==='light'){document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';}}catch(e){}})()`;
```

- [ ] **Step 4: `<Script>` + `<ThemeSync />` JSX에 삽입**

`RootLayout` 컴포넌트의 return을 다음으로 교체:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jetbrainsMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg-base text-ink-primary">
        <Script id="theme-fouc" strategy="beforeInteractive">
          {THEME_FOUC_SCRIPT}
        </Script>
        <ThemeSync />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: typecheck + 빌드 가벼운 검증**

```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```

Expected: 둘 다 통과.

- [ ] **Step 6: dev 서버 + DevTools에서 수동 검증**

```bash
pnpm --filter @my-music-app/web dev
```

브라우저에서 http://localhost:3000:

1. DevTools Console에 `localStorage.setItem('my-music-app:v1', JSON.stringify({state:{ui:{theme:'light'}},version:12}))` 실행 후 새로고침.
2. 새로고침 직후 첫 페인트가 라이트(크림 배경)인지 확인. 다크 → 라이트로 깜빡이면 FOUC 스크립트가 동작 안 한 것.
3. DevTools Console에 `localStorage.removeItem('my-music-app:v1')` 후 다시 새로고침 → 다크로 복귀 확인.

- [ ] **Step 7: commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "$(cat <<'EOF'
feat(ui): wire ThemeSync + FOUC prevention script in RootLayout

beforeInteractive 전략으로 hydration 이전에 localStorage의 ui.theme를
읽어 documentElement에 data-theme를 박는다. ThemeSync는 hydration 이후
store 변화를 같은 속성에 동기화 — 두 단계가 함께 라이트 모드의 깜빡임
없는 첫 페인트를 보장한다.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: ThemeToggle 컴포넌트 신설 (TDD)

**Files:**
- Test: `apps/web/tests/component/ThemeToggle.test.tsx` (create)
- Create: `apps/web/components/ui/ThemeToggle.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/component/ThemeToggle.test.tsx`:

```tsx
/**
 * ThemeToggle 컴포넌트 — 렌더 / 클릭 / 아이콘 분기 테스트.
 * useHasHydrated의 비동기 동작은 act + rerender로 처리.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAppStore } from '@/lib/store/app-store';

describe('ThemeToggle', () => {
  beforeEach(() => {
    useAppStore.setState((s) => {
      s.ui.theme = 'dark';
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('렌더 시 다크 상태에서는 "라이트 모드로 전환" aria-label', async () => {
    render(<ThemeToggle />);
    // useHasHydrated가 useEffect로 true를 세팅해 다음 렌더에 라벨이 정착.
    const button = await screen.findByRole('button', { name: '라이트 모드로 전환' });
    expect(button).toBeInTheDocument();
  });

  it('라이트 상태에서는 "다크 모드로 전환" aria-label', async () => {
    useAppStore.setState((s) => {
      s.ui.theme = 'light';
    });
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: '다크 모드로 전환' });
    expect(button).toBeInTheDocument();
  });

  it('클릭 시 toggleTheme이 호출되어 ui.theme이 토글된다', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = await screen.findByRole('button');

    await user.click(button);
    expect(useAppStore.getState().ui.theme).toBe('light');

    await user.click(button);
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @my-music-app/web test tests/component/ThemeToggle.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/ThemeToggle'`.

- [ ] **Step 3: 컴포넌트 구현**

`apps/web/components/ui/ThemeToggle.tsx`:

```tsx
'use client';

import { Moon, Sun } from 'lucide-react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';

/*
 * 헤더 우측에 마운트되는 32x32 아이콘 버튼.
 *
 * 컨벤션: 현재가 아닌 *전환 후* 상태를 보여준다.
 *   - 다크 모드 활성 → ☀ Sun 아이콘 ("누르면 라이트로 간다")
 *   - 라이트 모드 활성 → ☾ Moon 아이콘
 *
 * SSR mismatch 회피: useHasHydrated가 false인 첫 렌더에선 sun으로 고정.
 * 다크가 기본값이라 첫 렌더 = 다크 가정 = sun으로 일치.
 */
export function ThemeToggle() {
  const hydrated = useHasHydrated();
  const theme = useAppStore((s) => s.ui.theme);
  const toggle = useAppStore((s) => s.toggleTheme);

  const isLight = hydrated && theme === 'light';
  const Icon = isLight ? Moon : Sun;
  const nextLabel = isLight ? '다크 모드' : '라이트 모드';

  return (
    <button
      type="button"
      onClick={() => toggle()}
      aria-label={`${nextLabel}로 전환`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-ink-muted/20 text-ink-secondary transition-colors hover:border-accent-brass hover:text-accent-brass"
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @my-music-app/web test tests/component/ThemeToggle.test.tsx
```

Expected: PASS — 3 passed.

- [ ] **Step 5: typecheck + lint**

```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```

Expected: 통과.

- [ ] **Step 6: commit**

```bash
git add apps/web/components/ui/ThemeToggle.tsx apps/web/tests/component/ThemeToggle.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add ThemeToggle button with sun/moon icon swap

헤더 우측에 마운트할 32x32 아이콘 버튼. *전환 후* 상태를 아이콘으로 표시하는
컨벤션(다크면 sun, 라이트면 moon). useHasHydrated 가드로 SSR mismatch 회피.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 헤더에 ThemeToggle 마운트 — practice 레이아웃 + 랜딩

**Files:**
- Modify: `apps/web/app/(practice)/layout.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: practice 레이아웃에 import + 마운트**

`apps/web/app/(practice)/layout.tsx` 상단 import 영역에 추가:

```tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle';
```

`<MetronomeDock />` 직전(즉 `<MetronomeDock />` 좌측에 배치)에 토글 삽입. `<nav>` 안의 마지막 `</ul>` 이후, `<MetronomeDock />` 앞:

```tsx
          <ul className="ml-auto flex gap-6 font-mono text-xs uppercase tracking-wider">
            ...
          </ul>
          <ThemeToggle />
          <MetronomeDock />
```

- [ ] **Step 2: 랜딩 페이지에 import + 마운트**

`apps/web/app/page.tsx` 상단:

```tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle';
```

랜딩의 헤더 `<p>v1.0.0</p>` 앞에 토글 삽입. 헤더가 두 자식(좌측 ehyo · 에휴, 우측 v1.0.0)인 `flex items-baseline justify-between` 구조이므로 우측 그룹을 `<div className="flex items-center gap-3">`로 감싸 토글 + 버전을 묶는다:

기존:
```tsx
      <header className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          ehyo · 에휴
        </p>
        <p className="font-mono text-xs tabular-nums text-ink-muted">v1.0.0</p>
      </header>
```

교체:
```tsx
      <header className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          ehyo · 에휴
        </p>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <p className="font-mono text-xs tabular-nums text-ink-muted">v1.0.0</p>
        </div>
      </header>
```

- [ ] **Step 3: typecheck + lint**

```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```

Expected: 통과.

- [ ] **Step 4: dev 서버에서 수동 시각 검증**

```bash
pnpm --filter @my-music-app/web dev
```

브라우저로 확인:
1. `/` (랜딩) — 우측 상단에 sun 아이콘 토글, 클릭 시 라이트로 전환되며 페이지 전체 색상 페이드.
2. `/metronome`, `/fretboard`, `/jam` — 헤더 우측(MetronomeDock 좌측)에 토글, 모든 라우트에서 동일 상태.
3. 토글 후 다른 라우트로 이동해도 라이트 유지.
4. 새로고침 시 라이트 유지(FOUC 없음).

- [ ] **Step 5: commit**

```bash
git add apps/web/app/\(practice\)/layout.tsx apps/web/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(ui): mount ThemeToggle in landing + practice headers

practice 레이아웃은 MetronomeDock 좌측에, 랜딩은 v1.0.0 좌측에 배치.
sticky 헤더라 어떤 라우트에서도 1클릭 접근.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: E2E 회귀 테스트 — 토글 → persist → FOUC

**Files:**
- Test: `apps/web/tests/e2e/theme-toggle.spec.ts` (create)

- [ ] **Step 1: spec 파일 작성**

`apps/web/tests/e2e/theme-toggle.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

/*
 * Light theme toggle E2E.
 *
 * 검증:
 *   1) 첫 방문(localStorage 비어있음): 다크가 기본
 *   2) 토글 클릭 → data-theme="light", body 배경이 라이트 hex
 *   3) 새로고침: 라이트 보존 + 첫 페인트부터 라이트(FOUC 가드)
 *   4) 다시 토글: 다크 복귀, localStorage state.ui.theme === 'dark'
 */

const LIGHT_BG_HEX = '#F4ECD8';
const DARK_BG_HEX = '#0E0B08';

// rgb() 문자열을 hex로 변환해 비교
function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g);
  if (!match) return rgb;
  const [r, g, b] = match.map((x) => parseInt(x, 10));
  return (
    '#' +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

test.describe('테마 토글', () => {
  test('첫 방문은 다크', async ({ page }) => {
    await page.goto('/');
    const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    // FOUC 스크립트는 light일 때만 박으므로, 다크는 dataset.theme이 비어있을 수 있다.
    expect(dataTheme === undefined || dataTheme === 'dark').toBe(true);

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgbToHex(bg)).toBe(DARK_BG_HEX);
  });

  test('토글 클릭 → 라이트 전환 + persist', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '라이트 모드로 전환' }).click();

    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe('light');

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgbToHex(bg)).toBe(LIGHT_BG_HEX);

    const persisted = await page.evaluate(() => localStorage.getItem('my-music-app:v1'));
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted as string);
    expect(parsed.state.ui.theme).toBe('light');
  });

  test('새로고침 후에도 라이트 유지 + 첫 페인트 라이트(FOUC 가드)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '라이트 모드로 전환' }).click();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('light');

    await page.reload();
    // 새로고침 직후 — domcontentloaded 시점부터 dataset.theme이 light여야 FOUC 없음.
    const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(dataTheme).toBe('light');

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgbToHex(bg)).toBe(LIGHT_BG_HEX);
  });

  test('두 번 토글 → 다크 복귀', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: /모드로 전환/ });
    await button.click();
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe('light');

    await button.click();
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe('dark');

    const persisted = await page.evaluate(() => localStorage.getItem('my-music-app:v1'));
    const parsed = JSON.parse(persisted as string);
    expect(parsed.state.ui.theme).toBe('dark');
  });
});
```

- [ ] **Step 2: Docker로 E2E 실행**

```bash
docker compose -f docker-compose.test.yml --profile e2e up --exit-code-from playwright --abort-on-container-exit
```

Expected: 4 passed.

만약 `expect.poll` 시그니처 차이로 lint 실패하면 `await page.waitForFunction(...)` 패턴으로 교체.

- [ ] **Step 3: commit**

```bash
git add apps/web/tests/e2e/theme-toggle.spec.ts
git commit -m "$(cat <<'EOF'
test(test): e2e coverage for light theme toggle + FOUC

토글 → persist → 새로고침 후 첫 페인트가 라이트 hex와 일치하는지 검증해
FOUC 회귀를 가드. 두 번 토글로 다크 복귀까지 확인.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 전체 검증 + aesthetic-reviewer 게이트

**Files:**
- 변경 없음 (검증 단계)

- [ ] **Step 1: 전 영역 lint/typecheck/test**

```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
pnpm --filter @my-music-app/web test
```

Expected: 모두 통과.

- [ ] **Step 2: aesthetic-reviewer 호출**

`Agent` 도구로 `aesthetic-reviewer` subagent를 호출. 입력:

> "라이트 테마가 추가됐다. `apps/web/app/globals.css`의 `html[data-theme="light"]` 블록 + body transition + chord-overlay-pulse-light keyframe을 검토해줘. dev 서버를 띄워(`pnpm --filter @my-music-app/web dev`) 라이트 모드 상태로 `/`, `/metronome`, `/fretboard`, `/jam`을 살펴보고 *Analog instrument panel × Editorial magazine* 정체성이 유지되는지 평가. 보라 그라데이션·민트 네온·라운디드 카드 남발·Inter/Roboto 폴백 누락 여부 확인. hue 카테고리는 고정(brass=황동, signal=빨강, blue=하늘색), 명도/채도만 조정 가능."

피드백 반영 시 globals.css의 hex만 수정하고 같은 lint/typecheck로 회귀 검증.

- [ ] **Step 3: 라이트 모드 14장 스크린샷 캡처(선택)**

스펙 §9 Visual 섹션의 후속 작업. 이번 plan에서는 인프라까지가 스코프이므로 별도 PR로 분리.

- [ ] **Step 4: 최종 push 결정**

사용자 승인 후 push:
```bash
git push
```

- [ ] **Step 5: 작업 종료**

`docs/superpowers/plans/2026-05-05-light-theme-toggle.md`의 모든 step이 체크된 상태.

---

## Self-Review Notes

- **Spec coverage**: 스펙 §3(토큰)·§4(store)·§5(적용)·§6(토글)·§7(영향 검수)·§9(테스트)·§10(검증) 모두 Task 1~8에 매핑됨. §11(리스크)는 각 Task의 Step에 분산 반영(useHasHydrated 가드, FOUC try/catch, lucide-react 기본 사용 등). §12(후속)는 Task 8 Step 3로 라이트 스크린샷만 옵션 처리.
- **스펙 보정 1건**: BeatLED `box-shadow` 약화는 코드 미사용으로 제거(plan 헤더에 명시).
- **타입/시그니처 일관성**: `setTheme` 시그니처가 Task 1·5에서 동일(`(next: 'dark' | 'light') => void`), `toggleTheme`도 무인자 토글로 일관.
- **Placeholder 0건**: 모든 step에 실제 코드/명령어 포함.
