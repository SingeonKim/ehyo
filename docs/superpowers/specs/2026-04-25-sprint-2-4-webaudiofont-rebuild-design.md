# Sprint 2-4 — WebAudioFont 재구축 + BPM 컨트롤 설계

**Status:** draft
**Date:** 2026-04-25
**Branch:** `feat/sprint-2-4-timing-fix`
**Supersedes audio stack of:** Sprint 2-3 (`backing-track.ts` 의 Tone.js 의존을 통째로 제거)

## 1. 목표와 범위

Sprint 2-3의 합성 voice(MembraneSynth/NoiseSynth/MetalSynth/MonoSynth/PolySynth)와 Tone.js Transport 기반 스케줄러를 통째로 교체한다.

**왜 통째 교체인가**: PoC 사용자 검증 결과 (1) 신스 음색이 PoC 티가 너무 강하고, (2) 마디당 4.2~4.3박 느낌의 박자 어긋남이 체감되어, 음원과 스케줄러를 동시에 갈아야 의미 있는 개선이 된다. 부분 교체로는 회귀 추적이 더 어렵다.

### 포함 (in scope)

- **WebAudioFont** 라이브러리 도입 (GM 패치 기반 샘플 음원)
- 자체 lookahead 스케줄러 (`lookahead-scheduler.ts`) — 메트로놈에서 Chris Wilson 패턴 추출 + 공유
- Bar 단위 추상화 (`bar-scheduler.ts`)
- Voice 3종 재작성: Drums (GM 드럼킷) + Bass (GM 베이스) + Guitar (GM 기타, 8분 D/U 스트러밍)
- 카테고리별 InstrumentPreset 매핑(7종 카테고리)
- 패치 lazy 로드 + cache + 로딩 UX (`status: 'loading'` 활용)
- 카드별 BPM 런타임 변경 (슬라이더 UI + store + engine wiring)
- Tone.js 의존 완전 제거

### 제외 (out of scope)

- 카테고리별 리듬 패턴 분기 (스윙·셔플 — Sprint 2-5+)
- 자체 CDN으로 패치 미러링 (현재 surikov/webaudiofontdata GitHub raw 직사용)
- 마스터 리미터·믹싱 체인
- 패치 prefetch (hover 시 등)
- 모바일 오토플레이 정책 고도화

## 2. 모듈 구조

```
apps/web/lib/audio/
  context.ts                       (그대로 — 단일 AudioContext 싱글턴)
  scheduler/
    lookahead-scheduler.ts         (Chris Wilson 패턴, Worker tick 25ms / scheduleAhead 100ms, iOS 150ms)
    bar-scheduler.ts               (lookahead 위 박자 추상화)
  backing/
    engine.ts                      (state machine, BarScheduler + voices + preset 사용)
    index.ts                       (배럴 — 기존 export 이름 유지)
    webaudiofont-bridge.ts         (loader 싱글턴, 패치 캐시, lazy load)
    presets.ts                     (category → InstrumentPreset 매핑)
    patterns/
      types.ts                     (BeatStep + parseBeatStep)
      backbeat.ts                  (drums/bass)
      strumming.ts                 (NEW — 8분 D/U 스트러밍 패턴)
    voices/
      drums.ts                     (WebAudioFont 드럼킷)
      bass.ts                      (베이스 단음)
      guitar.ts                    (NEW — Strum 함수 래핑)
  metronome-scheduler.ts           (lookahead-scheduler 사용하도록 리팩터)
```

**제거되는 파일**:
- `apps/web/lib/audio/tone-bridge.ts`
- `apps/web/lib/audio/backing/voices/keys.ts`
- (Sprint 2-3 보이스 합성 구현은 유지하지 않는다)

**메트로놈 영향**: `metronome-scheduler.ts`가 `lookahead-scheduler`의 코어를 사용하도록 리팩터. 별도 커밋으로 분리해 회귀 추적 단순화. 기존 메트로놈 단위 테스트 100% 통과해야 머지.

## 3. 스케줄러 설계

### 3.1 LookaheadScheduler

```typescript
export interface LookaheadScheduler {
  /** onTick은 audio context 절대 시각을 받는다. start 호출은 user gesture 이후. */
  start(onTick: (eventTime: number) => void): void;
  stop(): void;
  /** 다음 tick부터 새 interval 적용. mid-stream 변경 가능. */
  setIntervalSeconds(seconds: number): void;
}
```

**알고리즘** (메트로놈 기존 코드 기반):
- Worker가 25ms마다 메인 스레드에 tick 메시지
- 메인 스레드는 `[currentTime, currentTime + scheduleAhead]` 윈도우 안의 모든 다음 이벤트를 audioContext clock에 예약
- `scheduleAhead`는 데스크톱 0.1s, iOS 0.15s (`baseLatency`로 감지)
- **Worker는 인스턴스별 독립 생성**(메트로놈·backing이 각자 자체 Worker). 공유 시 한쪽 stop이 다른 쪽 ticker를 멈추는 회귀가 발생. AudioContext만 공유.
- 안전 가드: `if (nextEventTime < currentTime - scheduleAhead) nextEventTime = currentTime + 0.05` — 기존 메트로놈 코드의 `- 0.1` 하드코딩을 `- scheduleAhead` 동적값으로 일반화

### 3.2 BarScheduler

```typescript
export interface BarScheduler {
  start(bpm: number, beatsPerBar: number, onBar: (eventTime: number, barIndex: number) => void): void;
  stop(): void;
  /** 다음 마디부터 새 BPM 적용. */
  setBpm(bpm: number): void;
}
```

**구현**: `LookaheadScheduler` 위 얇은 래퍼. `intervalSeconds = (60 / bpm) * beatsPerBar`로 계산해 lookahead에 넘긴다. 콜백마다 `barIndex` 단조 증가.

**동적 scheduleAhead**: 마디 길이가 길어 기본 scheduleAhead(0.1s)와 가까워지면 백그라운드 복귀·GC 스파이크 시 마디 예약이 누락될 수 있다. BarScheduler는 LookaheadScheduler의 `scheduleAhead`를 마디 길이에 비례해 상향 적용한다:
```
effectiveScheduleAhead = max(baseScheduleAhead, barLengthSec * 0.5)
```
BPM 60 4/4: 마디 4.0s → scheduleAhead 2.0s. BPM 200 4/4: 마디 1.2s → scheduleAhead 0.6s. (기본 0.1s는 사실상 마디 단위에서는 항상 비효율 — 동적 상향이 정답).

**중요 불변량**:
- `eventTime`은 절대 audio 시각 — voice trigger에 그대로 전달
- 메인 스레드 시간(performance.now)과 절대 혼합 금지
- BPM 변경은 다음 마디부터 — 진행 중인 마디는 영향 없음. 슬라이더 spam 방지를 위해 `subscribe` 핸들러 레벨에서 200ms debounce(BpmSlider UI 단)로 충분 — engine 레벨 추가 throttle은 불필요(다음 마디 적용 정책 자체가 자연 throttle)
- onBar 콜백 진입 직후 `const bpm = currentBpm`으로 **로컬 스냅샷 캡처** — 마디 도중 `setBpm`이 들어와도 현재 마디는 일관된 BPM으로 trigger됨

## 4. WebAudioFont Bridge

### 4.1 인터페이스

```typescript
// webaudiofont-bridge.ts

export type LoadedInstrument = {
  /** WebAudioFont의 패치 객체. queueWaveTable / queueStrumDown 등에서 사용. */
  patch: unknown; // 라이브러리 타입 부실 → 자체 .d.ts에서 최소 선언
  url: string;
};

export type LoadedPreset = {
  drums: LoadedInstrument;
  bass: LoadedInstrument;
  guitar: LoadedInstrument;
};

/** preset에 필요한 패치 3개를 병렬 로드. 캐시된 것은 즉시 반환. */
export function loadPreset(preset: InstrumentPreset): Promise<LoadedPreset>;

/** 단일 패치 로드 — 캐시 hit 시 즉시. */
export function ensurePatch(kind: 'drum' | 'melodic', gmNumber: number): Promise<LoadedInstrument>;

/** 테스트·HMR 정리용. */
export function __resetWebAudioFontBridgeForTests(): void;
```

### 4.2 패치 소스 — CDN 직접 사용

- WebAudioFont 패치 데이터는 `https://surikov.github.io/webaudiofontdata/sound/{number}_FluidR3_GM_sf2_file.js` 같은 정적 JS 파일
- npm 패키지 `webaudiofont` 자체에는 패치가 포함되지 않음 (loader만 제공)
- 자체 호스팅 안 함 — 7 카테고리 × 패치 평균 200kB = 1.4MB. 번들에 들어가면 First Load 폭주
- 리스크: GitHub Pages 다운 시 앱 다운. Sprint 2-5+에서 미러링 검토

### 4.3 TypeScript 타입

`apps/web/types/webaudiofont.d.ts`에 최소 선언 자체 작성:

```typescript
declare module 'webaudiofont' {
  export class WebAudioFontPlayer {
    constructor();
    loader: {
      startLoad(audioContext: AudioContext, url: string, variableName: string): void;
      waitLoad(callback: () => void): void;
    };
    queueWaveTable(audioContext: AudioContext, target: AudioNode, preset: unknown, when: number, pitch: number, durationSec: number, volume?: number): unknown;
    queueStrumDown(audioContext: AudioContext, target: AudioNode, preset: unknown, when: number, pitches: number[], durationSec: number, volume?: number, slices?: number): void;
    queueStrumUp(audioContext: AudioContext, target: AudioNode, preset: unknown, when: number, pitches: number[], durationSec: number, volume?: number, slices?: number): void;
    cancelQueue(audioContext: AudioContext): void;
  }
}
```

## 5. 카테고리 프리셋

### 5.1 매핑 테이블

```typescript
// presets.ts
export type InstrumentPreset = {
  drumsKit: number;  // GM drum kit number (Standard=0, Jazz=32, ...)
  bass: number;      // GM patch (Acoustic=32, Finger=33, Pick=34)
  guitar: number;    // GM patch (Nylon=24 ... Distortion=30)
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
```

### 5.2 로딩 흐름

1. `engine.start(template, keyRoot)` 호출 시 `setState({ status: 'loading', template })`
2. `loadPreset(getPreset(template.category))` await
3. 완료 후 `barScheduler.start(...)` → `setState({ status: 'playing' })`
4. 카테고리 패치는 `webaudiofont-bridge`의 `patchCache`에 캐시 — 같은 카테고리 재진입 시 즉시 resolve

**카드 전환 시**: 기존 단일 재생 원칙 그대로. `engine.stop()` → 새 카드의 카테고리 preset 로드(다르면) → 시작.

## 6. Voice 인터페이스

```typescript
// drums.ts
export interface DrumVoice {
  trigger(step: 'kick' | 'snare' | 'hat', preset: LoadedInstrument, time: number, velocity?: number): void;
  dispose(): void;
}

// bass.ts
export interface BassVoice {
  trigger(midi: number, preset: LoadedInstrument, durationSec: number, time: number, velocity?: number): void;
  dispose(): void;
}

// guitar.ts (NEW)
export interface GuitarVoice {
  /**
   * 코드 톤 전체를 시간차로 strum. 내부에서 queueStrumDown/Up 사용.
   * durationSec은 caller(engine)가 BPM 비례로 계산해 넘긴다 — `min(0.4, beatSec * 0.4)`.
   * 이렇게 안 하면 빠른 BPM(200)에서 strum이 박보다 길어지는 회귀.
   */
  strum(direction: 'down' | 'up', midiNotes: number[], preset: LoadedInstrument, durationSec: number, time: number, velocity?: number): void;
  dispose(): void;
}
```

**중요 결정**:
- `stop()` 메서드 없음 — WebAudioFont의 `cancelQueue`는 future 이벤트만 취소하고 **이미 attack 시작된 노트는 release하지 않는다** (라이브러리 동작 확인). 잔향 위험 차단을 위해:
  - 각 voice는 자체 **dry GainNode**를 1개 생성해 `audioContext.destination` 사이에 끼운다(드럼/베이스/기타 각각 1개씩)
  - `engine.hardStop()` 호출 시: ① `cancelQueue` 호출, ② 각 voice의 GainNode를 `linearRampToValueAtTime(0, currentTime + 0.01)`로 10ms fade-out, ③ 100ms 후 GainNode 값 1.0 복구(다음 start에 즉시 재사용 가능)
  - 이 처리로 already-attacked 노트의 release tail이 잘려나감(짧은 click 감수, 잔향 1~2초 감수보다 명확히 우선)
- voice는 stateless — preset을 매 trigger마다 인자로 받음. 카드(카테고리) 전환 시 voice 재생성 안 함.
- `dispose()`는 GainNode disconnect만 수행. 라이브러리 자체 reset은 `__resetWebAudioFontBridgeForTests`가 따로 처리.

**드럼 GM 노트 매핑** (Standard Drum Kit, MIDI Channel 10 기준):
- Kick = MIDI 36 (Bass Drum 1)
- Snare = MIDI 38 (Acoustic Snare)
- Hat = MIDI 42 (Closed Hi-hat)

## 7. 패턴 데이터

### 7.1 BeatStep + parser

```typescript
// patterns/types.ts
export type BeatStep = {
  /** 'bar:beat:sub' — 16분 sub. 한 마디 = 16 sub. 예: '0:1:2' = 2박+8분. */
  time: string;
  velocity?: number;
};

export function parseBeatStep(notation: string, bpm: number, beatsPerBar = 4): number {
  const parts = notation.split(':').map(Number);
  const [bars = 0, beats = 0, subs = 0] = parts;
  const beatSec = 60 / bpm;
  return bars * beatsPerBar * beatSec + beats * beatSec + (subs / 4) * beatSec;
}
```

### 7.2 새 strumming 패턴

```typescript
// patterns/strumming.ts
export type StrumStep = BeatStep & { direction: 'down' | 'up' };
export type StrumPattern = StrumStep[];

/**
 * 표준 어쿠스틱 컴핑 6-strike 패턴.
 * 8분음 8자리 중: D _ D U _ U D U
 * 시각: 0:0:0(D)  0:0:2(_)  0:1:0(D)  0:1:2(U)  0:2:0(_)  0:2:2(U)  0:3:0(D)  0:3:2(U)
 * 1박 다운 + 2박 다운/업 + 3박 업 + 4박 다운/업 = "쿵 짝짝 짝 짝짝"
 */
export const EIGHTH_STRUM: StrumPattern = [
  { time: '0:0:0', direction: 'down' },
  { time: '0:1:0', direction: 'down' },
  { time: '0:1:2', direction: 'up' },
  { time: '0:2:2', direction: 'up' },
  { time: '0:3:0', direction: 'down' },
  { time: '0:3:2', direction: 'up' },
];

// types.ts의 TrackPattern 갱신
export type TrackPattern = {
  drums: DrumPattern;   // Sprint 2-3 그대로
  bass: BassPattern;    // 그대로
  guitar: StrumPattern; // keys → guitar로 교체
};
```

## 8. Engine 콜백 흐름

```typescript
const onBar = (eventTime: number, barIndexAbs: number) => {
  const tpl = currentTemplate;
  if (!tpl) return;

  // ── 1. 오디오 예약 블록 (동기, 우선순위 1) ──
  // 이 블록 안에서는 React/Zustand setState 절대 금지.
  // 4.2박 회귀의 1순위 의심 원인이 audio scheduling callback 안에서
  // setState가 동기 dispatch되면서 발생하는 main thread block 누적.
  const idx = barIndexAbs % tpl.bars;
  const step = tpl.progression[idx];
  if (!step) return;

  const symbol = step.chord;
  const midi = chordSymbolToMidi(symbol, currentKeyRoot);

  // bpm 스냅샷 — 마디 도중 setBpm 들어와도 현재 마디는 일관된 BPM 유지.
  const bpm = currentBpm;
  const beatSec = 60 / bpm;
  const strumDurSec = Math.min(0.4, beatSec * 0.4);

  if (midi) {
    const preset = currentLoadedPreset!;
    const t = (notation: string) => eventTime + parseBeatStep(notation, bpm);

    // Drums
    for (const s of pattern.drums.kick)  drums.trigger('kick',  preset.drums, t(s.time), s.velocity);
    for (const s of pattern.drums.snare) drums.trigger('snare', preset.drums, t(s.time), s.velocity);
    for (const s of pattern.drums.hat)   drums.trigger('hat',   preset.drums, t(s.time), s.velocity);

    // Bass — 루트 한 옥타브 다운, 4분음 길이
    const bassMidi = midi[0]! - 12;
    for (const s of pattern.bass.steps) bass.trigger(bassMidi, preset.bass, beatSec, t(s.time), s.velocity);

    // Guitar — 코드 톤 strum, BPM 비례 duration
    for (const s of pattern.guitar)
      guitar.strum(s.direction, midi, preset.guitar, strumDurSec, t(s.time), s.velocity);
  }

  // ── 2. 상태 갱신 블록 (비동기, 다음 microtask) ──
  // setState가 트리거하는 모든 React 렌더와 store subscriber 호출을
  // 오디오 예약 이후 이벤트 루프 턴으로 미룬다.
  queueMicrotask(() => {
    if (!midi) {
      console.warn(`[backing] unparseable "${symbol}" at bar ${idx}; skipping`);
    }
    setState({ status: 'playing', template: tpl, keyRoot: currentKeyRoot, barIndex: idx, chordSymbol: symbol });
  });
};
```

**불변량**:
- 파싱 실패 시 어떤 voice도 trigger되지 않음 — drums만 치고 코드 없는 회귀 차단 (Sprint 2-3 정책 유지)
- BPM 변경은 store→engine 브릿지가 `barScheduler.setBpm(newBpm)` 호출 → 다음 마디부터 반영. 마디 도중 변경은 onBar 진입 시 `const bpm = currentBpm` 스냅샷으로 격리
- 단일 재생 원칙: `start()`가 내부에서 먼저 `hardStop()`
- **setState는 audio scheduling block과 동일 동기 블록에서 호출 금지** — `queueMicrotask` 또는 `setTimeout(0)`로 분리

**BackingEngine 인터페이스 변경** (Sprint 2-3 대비):
```typescript
export interface BackingEngine {
  // 기존 유지: getState, subscribe, start, setKey, stop, dispose
  // 신규
  setBpm(bpm: number): void;          // override 적용
  resetBpmToDefault(): void;          // template.default_bpm으로 복귀
}
```

## 9. Store · UI

### 9.1 Store 슬라이스 확장

```typescript
// app-store.ts BackingSlice 갱신
backing: {
  backingKey: PitchClass,
  backingPlayingSlug: string | null,
  backingCurrentChord: { symbol: string; barIndex: number } | null,
  /** 카드별 BPM override. 없으면 template.default_bpm 사용. */
  bpmOverrides: Record<string, number>,
}

setBackingBpm(slug: string, bpm: number): void;
_setBackingBpm(...) // 내부 액션
```

**Persist migration + partialize**: v6 → v7.

```typescript
// migrate (cumulative)
if (version < 7) {
  const backing = (s.backing as Record<string, unknown>) ?? {};
  if (!backing.bpmOverrides || typeof backing.bpmOverrides !== 'object') {
    backing.bpmOverrides = {};
  }
  s.backing = backing;
}

// partialize — 기존 backing.backingKey만 저장하던 블록을 확장:
partialize: (state) => ({
  ...기존 슬라이스들,
  backing: {
    backingKey: state.backing.backingKey,
    bpmOverrides: state.backing.bpmOverrides,
  },
})
```

`bpmOverrides`를 partialize에 반드시 포함해야 사용자가 설정한 BPM이 새로고침 후 살아남는다. 누락 시 v6 사용자 데이터 깨짐.

### 9.2 UI

`ProgressionPlayButton`은 그대로(이미 status loading/playing 분기). 추가:
- **BPM 슬라이더 컴포넌트** (`components/jam/BpmSlider.tsx`)
  - 파일 상단에 `'use client'` 명시 — 독립 파일로 추출되므로 client tree 안에 있어도 declaration 필요
  - props: `slug: string`, `defaultBpm: number` (template.default_bpm prop으로 받음)
  - store 자체 구독 패턴(prop drilling 없음): `const bpm = useAppStore(s => s.backing.bpmOverrides[slug] ?? defaultBpm)`
  - **`useHasHydrated()` 가드**: hydration 전에는 `defaultBpm`만 표시(persist-hydrated 후 사용자 값으로 갈아끼는 깜빡임 차단)
  - 범위 60~200, step 1, **200ms debounce**(`setBackingBpm`이 store action). 60 이하·200 초과 입력은 clamp
- `loading` 상태에서 ▶ 버튼이 spinner + "Loading samples..." 표시 (1회만, 이후 캐시)

### 9.3 Engine ↔ Store 브릿지

기존 wiring 유지 + BPM 추가:

```typescript
useAppStore.subscribe((s, prev) => {
  // 기존 — keyRoot 변화
  if (s.backing.backingKey !== prev.backing.backingKey) engine.setKey(s.backing.backingKey);

  // 신규 — 재생 중 카드의 BPM override 변화
  const slug = s.backing.backingPlayingSlug;
  if (!slug) return;

  const newBpm = s.backing.bpmOverrides[slug];
  const oldBpm = prev.backing.bpmOverrides[slug];

  // override가 새로 생기거나 사라지거나 값이 바뀐 경우에만 engine에 전파.
  if (newBpm !== oldBpm) {
    if (newBpm !== undefined) {
      engine.setBpm(newBpm);
    } else {
      // override 제거 — engine 내부 default ref로 복귀
      engine.resetBpmToDefault();
    }
  }
});
```

**중요**:
- `engine.setBpm(undefined)` 호출 절대 금지(NaN 회귀)
- `template.default_bpm`은 store에 없음. engine이 `start(template, ...)` 시점에 `currentDefaultBpm = template.default_bpm`을 ref로 보관. `resetBpmToDefault()`는 이 ref를 사용해 `barScheduler.setBpm(currentDefaultBpm)` 호출
- BpmSlider UI는 `bpmOverrides[slug] ?? defaultBpm`을 직접 표시 — engine ref를 UI가 읽을 필요 없음(template prop으로 default 알 수 있음)

## 10. 테스트 전략

| 레이어 | 종류 | 모킹 |
|---|---|---|
| `lookahead-scheduler.ts` | 단위 | Worker `setInterval` + AudioContext.currentTime mock. 메트로놈 기존 테스트 이관 |
| `bar-scheduler.ts` | 단위 | lookahead 모킹. BPM 변경 → 다음 interval 갱신 검증 |
| `parseBeatStep` | 단위 | 순수 함수 100%. 다양한 표기 + BPM 수식 검증 |
| `webaudiofont-bridge.ts` | 단위 | `webaudiofont` 모듈 vi.mock — `WebAudioFontPlayer` spy. `startLoad`+`waitLoad` 콜백을 즉시 resolve |
| `voices/{drums,bass,guitar}.ts` | 단위 | bridge 모킹 → `LoadedInstrument` spy 인스턴스. trigger 호출 인자 검증 |
| `engine.ts` | 통합 | voice factory + preset loader 모두 vi.mock. 1콜백 시 트리거 횟수 / 시각 오프셋 / 파싱 실패 / BPM 변경 / dispose 등 |
| `ProgressionPlayButton` | 컴포넌트 | engine + store 모킹. loading 상태 spinner, BPM 슬라이더 onChange → store action |
| `BpmSlider` | 컴포넌트 | store 모킹. debounce 검증 |
| 메트로놈 | 회귀 단위 | lookahead-scheduler 추출 후에도 기존 테스트 통과 |

**핵심 회귀 어설션**:
- 파싱 실패 chord에서 drums/bass/guitar 모두 0회 trigger
- BPM 90 → 120 변경 후 **첫 마디는 여전히 90BPM 기준 interval(2.667s)로 예약**, 그 다음 마디부터 120BPM(2.0s) — 다음-마디-적용 정책 검증
- start → stop → start 시 voice factory 1회만 호출(stateless voice 재사용)
- `engine.dispose()` → 3 voice 모두 dispose 1회 + GainNode disconnect 호출
- BarScheduler `eventTime` 단조 증가 + 정확한 interval
- **카드 A(blues, drumsKit=0) → B(jazz, drumsKit=32) 전환** — voice factory 1회만, drums.trigger의 preset 인자가 B의 preset.drums로 변경됨
- **패치 로드 실패** — `loadPreset` reject → engine state 'error' 전환, `start()` 재호출로 retry 가능(idempotent)
- **engine.resetBpmToDefault()** 호출 시 barScheduler가 currentDefaultBpm으로 복귀
- **engine.setBpm(undefined) 호출 금지** — store→engine 브릿지의 가드가 작동, NaN 회귀 차단
- onBar 콜백에서 setState가 동기 호출 안 됨 — `queueMicrotask` 사용 검증(spy로 setState 호출 시점이 onBar 호출 후 microtask flush 시점인지)
- `hardStop()` 시 voice GainNode가 0으로 ramp + 100ms 후 1.0 복귀
- **persist v6 → v7 migration** — 기존 v6 state(`{ backingKey: 0 }`)에 `bpmOverrides: {}` 주입, 다른 슬라이스(fretboard, metronome) 영향 없음

**컴포넌트 테스트 (BpmSlider)**:
- vitest fake timers로 200ms debounce 검증 — 200ms 내 연속 onChange는 마지막 값만 store에 dispatch
- 60~200 범위 clamp
- `useHasHydrated()` false일 때 `defaultBpm` 표시, true 후 store 값 표시

## 11. 마이그레이션 / 정리

**제거**:
- `package.json`에서 `tone`
- `apps/web/lib/audio/tone-bridge.ts`
- `apps/web/lib/audio/backing/voices/keys.ts`
- 기존 voice 합성 구현 + voice-mock-helpers
- 기존 backing engine 테스트 (새로 작성)

**추가**:
- `package.json`에 `webaudiofont`
- `apps/web/types/webaudiofont.d.ts`
- §2 모듈 레이아웃 신규 파일들

**Store**:
- persist v6 → v7 migration

## 12. 리스크 / 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| WebAudioFont 패치 CORS/네트워크 실패 | 카드 재생 불가 | bridge에서 `error` state 노출. UI에 "샘플 로드 실패 — 새로고침" 메시지 |
| 패치 로드 1~2초 첫 ▶ 답답 | UX | 명시적 spinner + 텍스트. 같은 카테고리 재진입 즉시 |
| `webaudiofont` TS 타입 부실 | 개발 속도 | 자체 `.d.ts` 최소 선언 |
| 메트로놈 스케줄러 추출 회귀 | 메트로놈 깨짐 | 추출 PR 분리 커밋 + 메트로놈 테스트 100% + 수동 박자 청취 검증 |
| BPM 슬라이더 잦은 갱신 spam | 살짝 끊김 | 200ms debounce |
| 4.2박 이슈가 교체 후에도 재현 | 동일 증상 | **1순위 가설**: onBar 콜백 안 setState가 main thread 동기 block 누적. §8에서 setState를 `queueMicrotask`로 분리. **2순위**: BarScheduler scheduleAhead가 마디 길이 50% 동적 상향(§3.2). 통합 테스트 사전 차단 + 청취 검증으로 확인 |
| WebAudioFont fetch+eval 방식이 CSP `script-src`에 차단 | 패치 로드 실패 | 현재 `next.config.ts`에 CSP 헤더 없음 — 즉시 문제 없으나 추후 CSP 강화 시 차단됨. `connect-src` 또는 `script-src` 화이트리스트에 `surikov.github.io`, `unsafe-eval` 필요할 수 있음. 구현 시 패치 로딩 코드가 정확히 어떤 fetch 메커니즘을 쓰는지 확인 |
| GitHub raw CDN 가용성 | 앱 다운 | Sprint 2-5+ 자체 미러 (out of scope) |
| onBar 안 setState 동기 dispatch가 audio drift 만듦 | 박자 어긋남 | §8 의사코드대로 `queueMicrotask` 분리 + 테스트로 검증 |
| StrictMode 더블 mount 시 Worker 2개 생성 | scheduler 중복 | `reactStrictMode: false` 정책 그대로. 신규 LookaheadScheduler 싱글턴 가드 검토 |

## 13. 작업 분해 (Plan에서 상세화)

1. `lookahead-scheduler` 추출 + 메트로놈 리팩터 + 테스트
2. `bar-scheduler` 신설 + 테스트
3. `parseBeatStep` + 패턴 데이터 신규 (strumming.ts) + 테스트
4. `webaudiofont-bridge` + `presets` + 테스트
5. Voice 3종 (drums/bass/guitar) + 테스트
6. Engine 통째 재작성 (BarScheduler + voices + preset 사용) + 통합 테스트
7. Tone.js 제거 + 기존 voice/test 파일 삭제
8. Store BPM 슬라이스 + persist v6→v7 migration + 테스트
9. ProgressionPlayButton 로딩 UX + BpmSlider + 카드 통합
10. 수동 청취 + 4.2박 측정 + PR

1·2·3·4 병렬 가능. 5는 4 의존. 6은 1·2·3·4·5 의존. 8·9는 6 이후.

## 14. 오픈 이슈 (구현 중 결정)

- **Jazz Kit hat 음색** — GM 표준상 kick=36/snare=38/hat=42는 모든 kit에서 유효. 다만 jazz는 hat=51(Ride) 또는 46(Open hat)이 음악적으로 더 어울림. DrumPattern에 step별 MIDI override를 두는 안을 5번 Task 구현 중 청취하며 결정.
- BpmSlider debounce 시간 — 200ms vs 100ms 청취 후 결정.
- Loading spinner 디자인 — `aesthetic-reviewer` 위임.
- **CSP 정책** — 현 시점 미설정. 추후 강화 시 WebAudioFont 패치 로드 방식이 차단될 가능성. 구현 중 `webaudiofont-bridge`의 실제 fetch/eval 동작 확인 후 README/CLAUDE.md에 메모.
- ~~`cancelQueue`가 already-attacked 노트 release 여부~~ → 해결: §6의 voice GainNode + linearRamp 방식으로 대응.
