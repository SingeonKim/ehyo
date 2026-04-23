# tests/ — 테스트 디렉토리 안내

## 디렉토리 구조

```
tests/
├── README.md              # 이 파일
├── setup.ts               # 모든 Vitest 테스트 전처리 (polyfill, jest-dom 확장)
├── audio-helpers.ts       # 오디오 타이밍 테스트용 Spy/Mock 유틸
│
├── unit/                  # Vitest 단위 테스트
│   ├── example.test.ts    # 플레이스홀더 (Phase 1 시작 시 교체)
│   ├── lib/
│   │   ├── theory/        # 음악 이론 순수 함수 — 커버리지 목표 100%
│   │   ├── audio/         # 메트로놈 스케줄러 — 커버리지 목표 90%
│   │   └── store/         # Zustand 스토어 액션 — 커버리지 목표 100%
│
├── component/             # Testing Library 컴포넌트 테스트 — 커버리지 목표 70%
│
└── e2e/                   # Playwright E2E 테스트
    └── smoke.spec.ts      # 스모크: 루트 페이지 h1 존재 확인
```

## 커버리지 목표

| 레이어 | 목표 | 비고 |
|---|---|---|
| `lib/theory/**` | 100% | 순수 함수, 핑계 없음 |
| `lib/audio/**` | 90% | Spy 기반 타이밍 테스트 |
| `lib/store/**` | 100% | 액션 단위 전수 테스트 |
| `components/**` | 70% | Testing Library, 사용자 관점 |
| E2E 시나리오 | 핵심 3개 고정 | Phase 5 후 4개로 확장 |

## 로컬 실행 커맨드

```bash
# 단위 + 컴포넌트 테스트 (watch 모드)
pnpm test

# 단일 실행 (CI와 동일)
pnpm test --run

# 커버리지 리포트 포함
pnpm test --run --coverage

# E2E (로컬 dev 서버 자동 기동)
pnpm test:e2e

# E2E — 특정 브라우저만
pnpm test:e2e --project=chromium-desktop
```

## 필요한 devDependencies

다음 패키지를 `package.json`의 `devDependencies`에 추가해야 한다.  
package.json은 별도 작업에서 관리하므로 여기에는 목록만 기재한다.

```
vitest
@vitejs/plugin-react
@vitest/coverage-v8
jsdom
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
@playwright/test
```

### 각 패키지의 역할

| 패키지 | 역할 |
|---|---|
| `vitest` | 테스트 러너 (Jest 호환 API, ESM 네이티브) |
| `@vitejs/plugin-react` | vitest.config에서 JSX 변환 제공 |
| `@vitest/coverage-v8` | Node 내장 v8 커버리지 엔진 |
| `jsdom` | 브라우저 DOM 시뮬레이션 환경 |
| `@testing-library/react` | 컴포넌트 렌더링 및 쿼리 유틸 |
| `@testing-library/jest-dom` | `toBeInTheDocument()` 등 DOM matcher 확장 |
| `@testing-library/user-event` | 실제 사용자 인터랙션(클릭, 타이핑) 시뮬레이션 |
| `@playwright/test` | E2E 브라우저 자동화 |

## 오디오 타이밍 테스트 패턴

실제 오디오 출력은 테스트하지 않는다.  
`tests/audio-helpers.ts`의 `createSchedulerSpy()`와 `createMockAudioContext()`를 스케줄러에 주입해 **예약된 시각 배열**을 검증한다.

```typescript
const spy = createSchedulerSpy();
const mockCtx = createMockAudioContext();
const scheduler = new MetronomeScheduler({ audioContext: mockCtx, spy });

scheduler.start({ bpm: 120, timeSignature: { numerator: 4, denominator: 4 } });
mockCtx.advanceTime(10); // 10초

// 120 BPM = 2박/초, 10초 = 20박 (첫 박은 accent)
expect(spy.scheduledEvents).toHaveLength(20);
expect(spy.scheduledEvents[0]).toMatchObject({ type: 'accent' });
expect(spy.scheduledEvents[1].time - spy.scheduledEvents[0].time).toBeCloseTo(0.5, 3);
```

## 주의 사항

- `setTimeout`을 테스트에서 real timer로 사용하지 않는다 — 항상 `vi.useFakeTimers()`
- 스크린샷 비교는 Docker(linux) 안에서만 생성·비교한다 — 로컬 macOS 직접 비교 금지
- `test.skip`으로 임시 통과시키지 않는다 — 실패 테스트는 이슈로 올리고 `xfail` 정책 적용
