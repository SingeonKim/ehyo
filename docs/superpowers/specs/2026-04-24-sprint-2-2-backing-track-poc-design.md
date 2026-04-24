# Sprint 2-2 — Tone.js 기반 배킹 트랙 재생 PoC

**작성일**: 2026-04-24
**관련 Phase**: Phase 5 Sprint 2-2
**선행 작업**: PR #9 (Sprint 2-1 — roman numeral chord parser, `lib/theory/chords.ts`)

---

## 1. 목적과 범위

### 1.1 목적

Tone.js Transport를 공유 `AudioContext` 위에서 동작시켜, 시드 `progression_templates` 한 개를 BPM·마디 단위로 **블록 코드 루프 재생**할 수 있는 최소 증명 구현을 만든다.

PoC가 증명할 것:

1. `Tone.setContext(getAudioContext())` 바인딩이 메트로놈과의 동일 클록 공유 전제에서 올바르게 동작
2. `Tone.Transport.scheduleRepeat('1m', ...)`으로 마디 단위 progression 진행이 결정론적으로 일어남
3. 현재 코드 심볼이 Zustand 스토어에 실시간 퍼블리시되어 추후 지판 하이라이트(2-4) 훅이 가능함

### 1.2 성공 기준 (Sprint 2-2 Done)

- [ ] `/jam` 카탈로그에서 카드 ▶ 누르면 선택된 Key 기준으로 progression이 BPM에 맞게 루프 재생
- [ ] 다른 카드 ▶ 누르면 이전 재생 자동 중단, 새 카드로 전환
- [ ] ⏹ 또는 같은 카드 ▶ 재클릭으로 중단
- [ ] 재생 중 `useAppStore`를 구독하면 `backingCurrentChord.symbol`이 마디 바뀔 때마다 업데이트됨
- [ ] `pnpm typecheck`·`pnpm lint`·`pnpm test` 클린
- [ ] 수동 브라우저 검증: Chrome에서 소리가 실제로 나고, 메트로놈과 같이 재생해도 AudioContext가 1개

### 1.3 Out of Scope (명시적 제외)

- **지판 하이라이트 동기화** → Sprint 2-4
- **드럼/베이스/키 멀티 트랙 패턴 엔진** → Sprint 2-3
- **샘플 기반 악기**(Tone.Sampler) → Phase 6 사운드 퀄리티 개선 시
- **필터/리버브 톤 셰이핑** → Phase 6
- **Playwright E2E**: 오디오 권한·Transport 결정성을 CI에서 검증하기엔 비용 ↑. 수동 검증 + 단위 테스트의 조합으로 충분
- **4/4 외 박자표**: 시드 데이터가 전부 4/4라 Transport `timeSignature`를 고정
- **AudioContext 재개 거부 UX**: suspend → running 전환 실패 시 `{status: 'error'}`만 세팅, 배너 디자인은 Sprint 3 UX 작업에서

---

## 2. 모듈 구조

```
apps/web/
├── lib/
│   ├── audio/
│   │   ├── context.ts              (기존, 변경 없음)
│   │   ├── tone-bridge.ts          (신규) — Tone ↔ 공유 AudioContext 바인딩 싱글턴
│   │   └── backing-track.ts        (신규) — Backing engine state machine + store 브릿지
│   ├── theory/
│   │   ├── chords.ts               (기존 PR #9)
│   │   └── chord-voicing.ts        (신규) — pitch class[] + octave → MIDI[] (순수)
│   └── store/
│       └── app-store.ts            (수정) — backing 슬라이스 + persist v1→v2 migrate
└── components/
    └── jam/
        ├── ProgressionCatalog.tsx         (기존 Server) — 구조 유지, 자식만 client로 교체
        ├── ProgressionCatalogClient.tsx   (신규 Client) — Key selector 상태 소유
        └── ProgressionPlayButton.tsx      (신규 Client) — 카드 ▶/⏹
```

### 2.1 경계 원칙

- `tone-bridge.ts`가 **유일한 `import 'tone'` 지점**. 나머지 모듈은 브릿지가 재노출하는 얇은 타입만 본다. 트리 셰이킹·번들 측정·모킹 모두 단순.
- `backing-track.ts`는 `tone-bridge.getTone()` 경유로만 Tone에 접근 → 테스트에서 `vi.mock('@/lib/audio/tone-bridge')` 한 방에 교체.
- `chord-voicing.ts`는 Tone 무의존 순수 함수 only → Vitest 100% 타겟.
- `backing-track.ts` 모듈 최상위에서 `engine.subscribe(s => useAppStore.setState(...))` 1회 → UI 컴포넌트는 store만 구독, engine은 `start`/`stop`만 호출.

---

## 3. Engine 상태 머신 (`backing-track.ts`)

### 3.1 Public API

```typescript
type BackingState =
  | { status: 'idle' }
  | { status: 'loading'; template: ProgressionTemplate }
  | { status: 'playing';
      template: ProgressionTemplate;
      keyRoot: PitchClass;
      barIndex: number;       // 0 ~ template.bars - 1
      chordSymbol: string;
    }
  | { status: 'error'; message: string };

interface BackingEngine {
  getState(): BackingState;
  subscribe(listener: (s: BackingState) => void): () => void;
  start(template: ProgressionTemplate, keyRoot: PitchClass): Promise<void>;
  stop(): void;
  dispose(): void;   // 테스트·HMR 정리용
}

export function getBackingEngine(): BackingEngine;   // 싱글턴
```

### 3.2 `start(template, keyRoot)` 흐름

1. 기존 재생 중이면 내부에서 먼저 `stop()` — **단일 재생 원칙**
2. `resumeAudioContext()` — 유저 제스처 이후 전제, `suspended`면 `resume`
3. `bindToneToSharedContext()` — 최초 1회 `Tone.setContext(getAudioContext())`
4. `polySynth`가 없으면 `new Tone.PolySynth().toDestination()` 생성, 있으면 재사용
5. `Tone.Transport.bpm.value = template.default_bpm`
6. `Tone.Transport.timeSignature = [4, 4]` (PoC 고정)
7. 이전 scheduleId 있으면 `Transport.clear(id)` → `scheduleRepeat(callback, '1m')` 1개 등록
8. `Transport.start()`
9. 콜백 동작 (§3.3)

### 3.3 스케줄 콜백 (매 1마디)

```typescript
(time: number) => {
  const idx = barIndex % template.bars;
  const symbol = template.progression[idx].chord;
  const pcs = chordPitchClasses(symbol, keyRoot);     // null이면 스킵
  if (pcs) {
    const midi = voicingToMidi(pcs, DEFAULT_OCTAVE);
    polySynth.triggerAttackRelease(midi.map(midiToFrequency), '1m', time);
  } else {
    console.warn(`[backing-track] unparseable chord: ${symbol} at bar ${idx}`);
  }
  publishState({ status: 'playing', template, keyRoot, barIndex: idx, chordSymbol: symbol });
  barIndex += 1;
}
```

- `time` 인자는 Tone Transport의 정확 시각. `triggerAttackRelease`에 그대로 전달 → 스케줄 드리프트 방지.
- `publishState`는 subscriber 전파 (store 업데이트). React 상태 업데이트는 마이크로태스크로 들어감.

### 3.4 `stop()` 흐름

1. `polySynth.releaseAll()` — 울리던 코드 즉시 릴리즈
2. `Transport.stop()` + `Transport.cancel()` — 예약 전부 제거
3. `publishState({ status: 'idle' })`
4. `AudioContext`는 `suspend()` 하지 않음 — 메트로놈이 공유 중일 수 있음

### 3.5 에러 경로

- `resumeAudioContext()`가 null 반환 (유저 제스처 실패, 오토플레이 차단) → `{status: 'error', message}`
- `chordPitchClasses(symbol, keyRoot)` null → **해당 바만 침묵**, engine은 계속 진행. `console.warn`으로만 남김. `error` 상태로 안 넘어감 — 일부 파싱 실패가 전체 재생을 막으면 UX 나쁨.

### 3.6 `dispose()`

- `stop()` → `polySynth.dispose()` → 내부 참조 null화
- `closeAudioContext()`는 호출 **금지** — 컨텍스트 싱글턴 원칙 준수

---

## 4. 순수 함수 (`chord-voicing.ts`)

### 4.1 API

```typescript
const DEFAULT_OCTAVE = 4;

// pitch class 배열을 MIDI 번호로. 첫 pc를 root로 해석, 이후 pc는 root 위로 stacked voicing.
export function voicingToMidi(
  pitchClasses: PitchClass[],
  rootOctave: number = DEFAULT_OCTAVE
): number[];

// 로마 심볼 → MIDI. 파싱 실패 시 null.
export function chordSymbolToMidi(
  symbol: string,
  keyRoot: PitchClass,
  rootOctave: number = DEFAULT_OCTAVE
): number[] | null;

// MIDI → Hz (Tone.Frequency 대신 자체 구현: 의존성 격리, 순수 함수)
export function midiToFrequency(midi: number): number;
```

### 4.2 Voicing 규칙 (PoC)

- Root는 `rootOctave` 옥타브의 해당 pc (MIDI = `12*(rootOctave+1) + pc`, C4 = 60 관습)
- 이후 pc는 **항상 root MIDI보다 위**. 이전 음보다 작으면 옥타브를 올린다.
- MIDI 규약: C4=60, A4=69 (modern standard, `12*(octave+1) + pc`)
- 예: C major `[0, 4, 7]`, octave 4 → `[60, 64, 67]` (C4, E4, G4)
- 예: A minor `[9, 0, 4]`, octave 4 → `[69, 72, 76]` (root A4=69, C는 다음 옥타브 C5=72, E는 E5=76)
- 예: B diminished `[11, 2, 5]`, octave 4 → `[71, 74, 77]` (root B4=71, D는 D5=74, F는 F5=77)

### 4.3 `midiToFrequency`

```typescript
440 * 2 ** ((midi - 69) / 12)
```

---

## 5. Zustand 슬라이스 (`app-store.ts`)

### 5.1 새 필드

기존 스토어가 `metronome / fretboard / ui` 3개 top-level 슬라이스를 쓰므로 4번째 슬라이스 `backing`을 추가:

```typescript
export interface BackingState {
  // 영속
  backingKey: PitchClass;                    // 선택 Key (default 0 = C)

  // 런타임 (persist 제외)
  backingPlayingSlug: string | null;         // 재생 중인 template.slug
  backingCurrentChord: { symbol: string; barIndex: number } | null;
}

// AppState에 필드 + 액션 추가:
//   backing: BackingState;
//   setBackingKey(k: PitchClass): void;
//   _setBackingPlaying(slug: string | null): void;        // engine subscriber only
//   _setBackingCurrentChord(c: { symbol: string; barIndex: number } | null): void;
```

### 5.2 Persist 규칙

- `backingKey`는 persist **포함** (유저 선택 유지)
- `backingPlayingSlug` / `backingCurrentChord`는 **런타임 상태** → `partialize`로 제외
- 스키마 version을 `5 → 6`으로 올림. `migrate` 체인에 `version < 6` 블록을 추가해서 기존 데이터에 `backing: { backingKey: 0 }` 슬라이스 주입
- `merge` deep-merge 확장: 기존 `metronome / fretboard / ui` 3-way merge 패턴과 동일하게 `backing` 슬라이스 병합 추가

### 5.3 Engine ↔ Store 브릿지

`backing-track.ts` 모듈 최상위에서 1회:

```typescript
getBackingEngine().subscribe((s) => {
  const store = useAppStore.getState();
  if (s.status === 'playing') {
    store._setBackingPlaying(s.template.slug);
    store._setBackingCurrentChord({ symbol: s.chordSymbol, barIndex: s.barIndex });
  } else {
    store._setBackingPlaying(null);
    store._setBackingCurrentChord(null);
  }
});
```

---

## 6. UI 컴포넌트

### 6.1 `ProgressionCatalog.tsx` (Server — 기존)

- 변경: API fetch 후 `<ProgressionCatalogClient templates={templates} />`로 위임
- 에러 배너는 Server에서 그대로

### 6.2 `ProgressionCatalogClient.tsx` (Client 신규)

- 최상단 `<KeySelector value={backingKey} onChange={setBackingKey} />` — 12 키 드롭다운
  - 표기: `isFlatKey(pc)`면 flat(F, Bb, Eb, Ab, Db), 나머지는 sharp 우선
- 카테고리별 그룹화(기존 `groupByCategory` 로직 그대로 이관)
- 각 카드에 `<ProgressionPlayButton template={t} />`
- 재생 중인 카드에 `ring-1 ring-accent-brass`로 시각 강조

### 6.3 `ProgressionPlayButton.tsx` (Client 신규)

```tsx
'use client';

export function ProgressionPlayButton({ template }: { template: ProgressionTemplate }) {
  const isPlaying = useAppStore(s => s.backingPlayingSlug === template.slug);
  const backingKey = useAppStore(s => s.backingKey);
  const currentChord = useAppStore(s => s.backingCurrentChord);

  const onClick = async () => {
    const engine = getBackingEngine();
    if (isPlaying) engine.stop();
    else await engine.start(template, backingKey);
  };

  return (
    <button onClick={onClick} aria-label={isPlaying ? 'Stop' : 'Play'}>
      {isPlaying ? '⏹' : '▶'}
      {isPlaying && currentChord && (
        <span>{currentChord.symbol} · bar {currentChord.barIndex + 1}/{template.bars}</span>
      )}
    </button>
  );
}
```

### 6.4 디자인 토큰 규율

- 토큰 only: `bg-bg-elevated`, `border-ink-muted/20`, `text-accent-brass`, `text-ink-secondary`, `ring-accent-brass`
- 폰트: `font-mono` (JetBrains Mono) for tabular numbers, `font-display` for headings — 기존 규율 준수
- hex 하드코딩 금지, `aesthetic-reviewer` 게이트 통과 필요

---

## 7. 테스트 전략

### 7.1 순수 함수 단위 (`tests/unit/lib/theory/chord-voicing.test.ts`)

- `voicingToMidi([0,4,7], 4)` === `[60,64,67]` (C major: C4, E4, G4)
- `voicingToMidi([9,0,4], 4)` === `[69,72,76]` (A minor stacked: A4, C5, E5)
- `voicingToMidi([11,2,5], 4)` === `[71,74,77]` (B diminished stacked: B4, D5, F5)
- `chordSymbolToMidi('I', 0, 4)` === `[60,64,67]` (C key, I)
- `chordSymbolToMidi('V7', 0, 4)` === `[67,71,74,77]` (G7 in C — stacked G4, B4, D5, F5)
- `chordSymbolToMidi('bVII', 0)` === `null` (파싱 실패 경로)
- `midiToFrequency(69)` === 440
- `midiToFrequency(60)` ≈ 261.63 (within 0.01)

### 7.2 Engine 상태 머신 (`tests/unit/lib/audio/backing-track.test.ts`)

`vi.mock('@/lib/audio/tone-bridge')` 으로 Tone 전체 모킹:

```typescript
const transportMock = {
  bpm: { value: 0 },
  timeSignature: [4, 4],
  scheduleRepeat: vi.fn((cb) => { scheduledCallbacks.push(cb); return 1; }),
  clear: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
};
const polySynthInstance = { toDestination: vi.fn().mockReturnThis(), triggerAttackRelease: vi.fn(), releaseAll: vi.fn(), dispose: vi.fn() };
const toneMock = {
  Transport: transportMock,
  PolySynth: vi.fn(() => polySynthInstance),
  setContext: vi.fn(),
};
```

**케이스**:

1. `start(template, 0)` → `Transport.bpm.value === template.default_bpm`, `scheduleRepeat` 1회, `Transport.start()` 호출
2. 등록된 콜백을 `template.bars + 1`번 수동 트리거 → `triggerAttackRelease`가 bars회 호출, barIndex 0부터 돌고 wrap
3. 각 호출 시 `triggerAttackRelease` 인자(frequencies)가 `chordSymbolToMidi(template.progression[i].chord, 0)`의 `midiToFrequency` 결과와 일치
4. `stop()` → `Transport.cancel`, `Transport.stop`, `polySynth.releaseAll` 호출, state === `idle`
5. `start()` 두 번 연속 → 두 번째에서 내부 stop 먼저 호출 (전 세션 teardown 확인)
6. `bVII` 같은 미지원 심볼 포함 template → 해당 바는 `triggerAttackRelease` 미호출, `console.warn` 호출, 다음 바는 정상 진행
7. subscribe 콜백이 playing 상태 전이마다 호출됨

### 7.3 컴포넌트 스모크 (`tests/component/ProgressionPlayButton.test.tsx`)

`vi.mock('@/lib/audio/backing-track')`로 engine 모킹:

- 버튼 클릭 → `engine.start`가 `(template, backingKey)`로 호출
- store `backingPlayingSlug === template.slug` 세팅 → 라벨이 "⏹"로 전환
- 재클릭 → `engine.stop` 호출

### 7.4 수동 검증 체크리스트 (PoC 성격상 명시)

`docs/sprint-2-2-manual-verification.md` 또는 PR 본문에:

- [ ] Chrome에서 `/jam` 열어 ▶ 누르면 소리 남
- [ ] 재생 중 메트로놈 ▶ 눌러도 AudioContext 1개 유지 (`chrome://webrtc-internals` 또는 `console.log(window.__audio_context_count)` 확인 로직 주입 — PoC 범위 내에서만 임시)
- [ ] 다른 카드 ▶ → 이전 재생 끊기고 새 카드 시작
- [ ] ⏹ 눌러 멈춤
- [ ] Key 셀렉터 변경 후 ▶ → 새 Key 기준으로 재생 (transpose 확인: C major vs A major)

### 7.5 제외

- Playwright E2E: 오디오 권한 불안정
- 실제 오디오 바이트 비교: PoC 목적과 불일치

---

## 8. 커밋 전 체크리스트 (CLAUDE.md 규율)

- [ ] `pnpm lint` 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 전체 통과 (새 테스트 포함)
- [ ] `web-audio-engineer` 에이전트 리뷰 — Tone 바인딩·Transport 사용 패턴
- [ ] `aesthetic-reviewer` 에이전트 리뷰 — UI 토큰 규율
- [ ] `test-strategist` 에이전트 리뷰 — 모킹·커버리지
- [ ] 커밋 메시지 Conventional Commits 준수, scope 분리(audio, theory, store, ui)

---

## 9. 브랜치 & 커밋 전략

- 브랜치: `feat/phase-5-sprint-2-2-backing-track-poc`
- 커밋 쪼개기(추천):
  1. `chore(deps): add tone 15.x`
  2. `feat(theory): add chord-voicing pure helpers`
  3. `feat(audio): add tone-bridge for shared AudioContext binding`
  4. `feat(audio): add backing-track engine state machine`
  5. `feat(store): add backing slice + persist migrate v1→v2`
  6. `feat(jam): add KeySelector + ProgressionPlayButton clients`
  7. `test(audio): add backing-track and chord-voicing coverage`

각 커밋 독립 검증 가능. 순서상 의존성 존재(3 → 4 → 5 → 6) 지만 roll-forward 용이.

---

## 10. 위험 & 대응

| 위험 | 대응 |
|---|---|
| Tone.js 15.x 번들 사이즈 증가 (~150KB gz) | `tone-bridge`에서 필요한 것만 named import, `PolySynth` / `Transport` / `setContext`만 씀. Phase 6에서 번들 측정 후 동적 import 검토 |
| Tone Transport가 이미 다른 곳에서 start 상태 | Transport는 전역 싱글턴. Engine이 `stop()` + `cancel()` 선행 호출로 항상 깨끗한 상태에서 시작 |
| 유저 제스처 없이 `start()` 호출 (프로그래매틱) | `resumeAudioContext()`가 실패하면 `{status: 'error'}` 세팅, UI 클릭 이벤트 핸들러 안에서만 호출하도록 규율 |
| Fast Refresh 시 engine 싱글턴 중복 | 모듈 스코프 `let _engine: BackingEngine \| null = null`, HMR 시 `dispose()` 후 재생성. Sprint 2-2 PoC에서는 새로고침으로 우회 가능 |
| `timeSignature = [4,4]` 고정이 시드 확장 시 문제 | 시드 확장은 2-3 범위, 2-2에서 TODO 주석만 남김 |
