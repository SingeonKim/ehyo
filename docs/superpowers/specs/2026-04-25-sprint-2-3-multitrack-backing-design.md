# Sprint 2-3 — Multi-track Backing Engine Design

**Status:** draft
**Date:** 2026-04-25
**Supersedes core of:** `2026-04-24-sprint-2-2-backing-track-poc-design.md` (엔진 구조 전면 리팩터)

## 1. 목표와 범위

Sprint 2-2에서 PolySynth 블록 코드 단일 트랙으로 검증한 배킹 엔진을 **3트랙(drums + bass + keys) 멀티 보이스 엔진**으로 확장한다. 연주 가능한 실제 드럼·베이스·keys 사운드로 "반주"가 느껴지게 하되, 엔진 구조를 `lib/audio/backing/` 아래 voice/pattern/engine 레이어로 분리해 Sprint 2-4의 카테고리별 패턴 확장 여지를 둔다.

### 포함(in scope)

- 순수 합성 드럼 3피스 — Kick(MembraneSynth), Snare(NoiseSynth), Hi-hat(MetalSynth)
- Bass voice — MonoSynth, 현재 코드의 **루트 음만**, 각 마디 1박·3박에 트리거
- Keys voice — PolySynth 블록 코드 (기존 동작 보존), 매 마디 1박에 트리거
- 단일 범용 4/4 백비트 패턴 1개 — 모든 카테고리 공통 적용
- 엔진 상태 머신과 store 브릿지는 기존 계약 유지 (`BackingState`, `backingPlayingSlug`, `backingCurrentChord`, `backingKey`)
- Voice 단위테스트 + 엔진 통합테스트 분리

### 제외(out of scope)

- 카테고리별 패턴 분기 (pop/rock/jazz/blues별 스윙·셔플)
- 샘플 기반 드럼 (Tone.Sampler), 기타 스트러밍
- Walking bass, voicing 변주, 페달 라인
- 믹싱(볼륨·팬·리버브), 마스터 버스 체인
- BPM·박자 런타임 변경 UI
- 모바일 오토플레이 정책 고도화

## 2. 모듈 구조

```
apps/web/lib/audio/backing/
  engine.ts              # Transport 제어, 상태 머신, store 브릿지. (구 backing-track.ts 역할)
  voices/
    drums.ts             # DrumVoice — kick/snare/hat, pattern step 받아 trigger
    bass.ts              # BassVoice — MonoSynth, root only
    keys.ts              # KeysVoice — PolySynth 블록 코드
  patterns/
    backbeat.ts          # BACKBEAT_PATTERN 상수 + 타입
    types.ts             # TrackPattern, DrumPattern, BassPattern, KeysPattern
  index.ts               # 공개 API 재-export (getBackingEngine, __disposeBackingEngineForTests)
```

**리팩터 경로:** 기존 `lib/audio/backing-track.ts`는 삭제하고 `backing/engine.ts`로 이관. 외부 import 경로는 `@/lib/audio/backing`으로 통일 (index.ts에서 기존 export 이름 동일 유지).

**Tone 의존성 경계:** voice 구현체도 `getTone()` 경유로만 Tone 접근. `import 'tone'`은 `tone-bridge.ts`에만.

## 3. Voice 인터페이스

```typescript
// patterns/types.ts
export type BeatStep = {
  /** 마디 내 상대 시각. '0:0:0' = 1박, '0:2:0' = 3박, '0:0:2' = 8분 2번째 */
  time: string;
  /** 음량 0..1, 기본 0.8 */
  velocity?: number;
};

export type DrumPattern = {
  kick: BeatStep[];
  snare: BeatStep[];
  hat: BeatStep[];
};

export type BassPattern = {
  /** 각 step은 "그 시각에 루트 음을 친다"의 의미. 음높이는 engine이 현재 코드 기준으로 결정. */
  steps: BeatStep[];
};

export type KeysPattern = {
  /** 각 step에서 블록 코드를 trigger. duration도 step별. */
  steps: (BeatStep & { duration: string })[];
};

export type TrackPattern = {
  drums: DrumPattern;
  bass: BassPattern;
  keys: KeysPattern;
};

// voices/drums.ts 인터페이스 예시
export interface DrumVoice {
  trigger(step: 'kick' | 'snare' | 'hat', time: number, velocity?: number): void;
  /** 재생 중 envelope을 강제 종료. 노드는 유지(start/stop 사이클에서 재사용). */
  stop(): void;
  /** 노드를 해제. 엔진 dispose 시에만 호출. */
  dispose(): void;
}
export function createDrumVoice(): DrumVoice;

// voices/bass.ts
export interface BassVoice {
  trigger(midiNote: number, duration: string, time: number): void;
  stop(): void;
  dispose(): void;
}
export function createBassVoice(): BassVoice;

// voices/keys.ts — 기존 PolySynth 래핑
export interface KeysVoice {
  trigger(midiNotes: number[], duration: string, time: number): void;
  /** PolySynth.releaseAll 위임 — 잔향 종료. */
  stop(): void;
  dispose(): void;
}
export function createKeysVoice(): KeysVoice;
```

**왜 pattern을 데이터로 분리:** 콜백 내부 하드코딩이면 Sprint 2-4에서 카테고리 분기 추가 시 콜백이 분기 지옥이 된다. 현재 코드 기준 root bass 음 결정 같은 "데이터에 없는 동적 판단"은 엔진에 남긴다.

## 4. 엔진 콜백 흐름

```typescript
// engine.ts (의사 코드)
const pattern = BACKBEAT_PATTERN; // 지금은 상수 하나
const drums = createDrumVoice();
const bass = createBassVoice();
const keys = createKeysVoice();

scheduleId = Tone.Transport.scheduleRepeat((time) => {
  const tpl = currentTemplate;
  if (!tpl) return;
  const idx = barIndex % tpl.bars;
  const step = tpl.progression[idx];
  if (!step) { barIndex += 1; return; }

  const midi = chordSymbolToMidi(step.chord, currentKeyRoot);
  if (!midi) {
    console.warn(...);
    barIndex += 1;
    return;
  }

  // Drums — 상대 시각을 Tone.Time로 변환해 절대 시각 더하기
  for (const s of pattern.drums.kick)
    drums.trigger('kick', time + Tone.Time(s.time).toSeconds(), s.velocity);
  for (const s of pattern.drums.snare)
    drums.trigger('snare', time + Tone.Time(s.time).toSeconds(), s.velocity);
  for (const s of pattern.drums.hat)
    drums.trigger('hat', time + Tone.Time(s.time).toSeconds(), s.velocity);

  // Bass — root = midi[0]을 한 옥타브 낮춤
  const bassMidi = midi[0] - 12;
  for (const s of pattern.bass.steps)
    bass.trigger(bassMidi, '4n', time + Tone.Time(s.time).toSeconds());

  // Keys — 기존과 동일
  for (const s of pattern.keys.steps)
    keys.trigger(midi.map(midiToFrequency), s.duration, time + Tone.Time(s.time).toSeconds());

  setState({ status: 'playing', ..., chordSymbol: step.chord, barIndex: idx });
  barIndex += 1;
}, '1m');
```

**중요한 불변량:**
- `time` 인자는 Transport 콜백이 준 **절대 시각** — 여기에 `Tone.Time(relative).toSeconds()`를 더해서만 스케줄. 메인 스레드 시간(`performance.now` 등) 혼합 금지.
- 파싱 실패 시 **전 트랙 모두 스킵** (드럼만 치고 코드 없는 상태 방지). 테스트에서 드럼·베이스·keys voice 모두 0회 trigger를 명시적으로 어설션.
- `chordSymbolToMidi`가 반환하는 `midi[0]`은 `DEFAULT_OCTAVE = 4`(C4=60) 기준이므로 bass offset `-12`는 결과 MIDI를 C3(48)대로 내린다는 의미. 이 가정이 깨지면 bass·keys 음역대 분리도 깨진다.
- `engine.stop()`은 `Transport.stop/cancel` 외에도 모든 voice의 `stop()`을 호출해 envelope 잔향(MonoSynth release, MetalSynth sustain 등)을 종료한다. `dispose()`는 노드 해제 — 엔진이 완전히 소멸할 때만.

## 5. 기본 백비트 패턴

```typescript
// patterns/backbeat.ts
export const BACKBEAT_PATTERN: TrackPattern = {
  drums: {
    kick:  [{ time: '0:0:0' }, { time: '0:2:0' }],        // 1, 3박
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],        // 2, 4박
    hat:   ['0:0:0','0:0:2','0:1:0','0:1:2','0:2:0','0:2:2','0:3:0','0:3:2']
             .map((t) => ({ time: t, velocity: 0.5 })),    // 8분 8개
  },
  bass: {
    steps: [{ time: '0:0:0' }, { time: '0:2:0' }],        // 1, 3박 루트
  },
  keys: {
    steps: [{ time: '0:0:0', duration: '1m' }],           // 1박에 마디 전체 울림
  },
};
```

## 6. 드럼 합성 설정(초기값, 조율은 구현 중 귀로)

- **Kick** = `new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } })`, trigger: `triggerAttackRelease('C1', '8n', time, velocity)`
- **Snare** = `new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } })`, trigger: `triggerAttackRelease('16n', time, velocity)`
- **Hat** = `new Tone.MetalSynth({ frequency: 250, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 })`, trigger: `triggerAttackRelease('32n', time, velocity)` — `sustain: 0` 명시는 stop() 시 잔향 차단을 위해 필수(MetalSynth 기본 envelope sustain은 1).
- **Bass** = `new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 2, type: 'lowpass' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 } })`
- 모두 `.toDestination()`. 믹싱(Gain·Limiter)은 Sprint 2-4+.

## 7. Store·UI 영향

**영향 없음.** 기존 `backing` 슬라이스(`backingKey`, `backingPlayingSlug`, `backingCurrentChord`)와 `KeySelector`, `ProgressionPlayButton`, `ProgressionCatalog`는 변경 없이 그대로 동작해야 한다. persist version도 유지(현재 v6).

**검증:** 컴포넌트 테스트에서 엔진 공개 API 호출이 동일한지 확인 (`start`, `stop`, `setKey`, `subscribe`).

## 8. 테스트 전략

### 공통 mock 헬퍼 (tests/unit/lib/audio/backing/voice-mock-helpers.ts)

`tone-bridge` mock에 voice 생성에 필요한 constructor 셋을 주입한다. 모든 voice/engine 테스트가 재사용:

```typescript
const makeSynthMock = () => ({
  toDestination: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
  releaseAll: vi.fn(),
  triggerRelease: vi.fn(),
  dispose: vi.fn(),
});
// MembraneSynth, NoiseSynth, MetalSynth, MonoSynth, PolySynth 모두 makeSynthMock 인스턴스를 반환하는 vi.fn()으로 노출.
// Tone.Time 결정론적 mock — '0:beat:sub' 표기 → 임의 단위 숫자 테이블(`{ '0:0:0': 0, '0:1:0': 0.25, '0:2:0': 0.5, '0:0:2': 0.125, ... }`)
// .toSeconds()가 그 값을 반환. transport.bpm.value와 무관하게 결정론적.
```

### Voice 단위테스트 (tests/unit/lib/audio/backing/voices/*.test.ts)

- 헬퍼의 voice용 `tone-bridge` mock 사용.
- 검증:
  - `drum.trigger('kick', 1.5, 0.8)` → kick synth `triggerAttackRelease`가 4번째 인자(time)=1.5로 불렸나
  - `bass.trigger(48, '4n', 1.5)` → MonoSynth `triggerAttackRelease`가 frequency(midiToFrequency(48)) + duration + time으로 불렸나
  - `keys.trigger([60, 64, 67], '1m', 1.5)` → PolySynth `triggerAttackRelease`가 frequencies + duration + time으로 불렸나
  - 각 voice의 `stop()` 호출 → 적절한 release 메서드(`releaseAll`/`triggerRelease`)가 불리고 dispose는 안 불리나
  - 각 voice의 `dispose()` → 내부 synth(들)의 dispose가 모두 불리나

### 엔진 통합테스트 (tests/unit/lib/audio/backing/engine.test.ts)

- voice factory 3개(`createDrumVoice`/`createBassVoice`/`createKeysVoice`)를 `vi.mock('@/lib/audio/backing/voices/...')`로 교체해 `DrumVoice`/`BassVoice`/`KeysVoice` 타입의 spy 객체를 얻는다(타입 캐스팅 명시 — 인터페이스 계약 이탈을 컴파일 타임에 차단).
- `scheduleRepeat` spy에 등록된 콜백을 꺼내 수동 호출 (Sprint 2-2 패턴).
- 검증:
  - 1회 콜백 → drumVoice.trigger 12회(kick 2 + snare 2 + hat 8), bassVoice.trigger 2회, keysVoice.trigger 1회.
  - `time` 인자에 relative 오프셋이 더해져 전달됐나 — 두 번째 kick의 time = 첫 kick의 time + 0.5(테스트 mock의 `0:2:0`에 매핑된 값).
  - **파싱 실패 심볼(bVII 등)일 때 drumVoice/bassVoice/keysVoice 모두 0회 trigger** — 회귀 핵심 어설션.
  - barIndex가 template.bars를 넘어가면 0으로 wrap (기존 회귀 시나리오 이관).
  - setKey 호출 후 콜백 재실행 → 새 keyRoot 기준 midi로 bass·keys trigger. drum.trigger는 keyRoot 변화와 무관해야 한다(추가 어설션).
  - start → stop → start 반복 시 voice의 `dispose`는 0회, `stop`은 1회 호출됐나(명시적 어설션).
  - `__disposeBackingEngineForTests()` 호출 시 3개 voice의 `dispose`가 정확히 1회씩 호출됐나.

### 기존 `backing-track.test.ts`

- 파일은 `engine.test.ts`로 이름 변경 + 경로 이동. import 경로 바뀜 반영.
- 기존 state machine 시나리오는 유지하되, "polySynth trigger 1회" 어설션은 "keysVoice.trigger 1회"로 교체.

## 9. 마이그레이션/호환

- `@/lib/audio/backing-track` import를 쓰는 파일은 `@/lib/audio/backing`으로 일괄 교체.
- 기존 export 이름 유지: `getBackingEngine`, `BackingEngine`, `BackingState`, `__disposeBackingEngineForTests`, `__resetStoreBridgeForTests`.
- 타입 `PolySynthLike`는 keys.ts 내부로 옮김 (외부에 필요 없음).

## 10. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 3트랙 동시 트리거로 클리핑·왜곡 | 각 voice의 envelope/velocity로 선제 제어. 마스터 리미터는 Sprint 2-4 |
| Transport 콜백 내 루프 비용 증가 | 패턴 step 합쳐 14개 수준 — 무시 가능 |
| 기존 테스트 경로 대량 수정 | 한 커밋에서 import 경로 일괄 치환 커밋으로 분리 |
| Tone.Time 계산 결정론성 | **필수** — `tone-bridge` mock에 `Tone.Time(notation).toSeconds()` 결정론적 테이블 mock 추가(§8 헬퍼). 이 헬퍼 없으면 콜백이 런타임 에러로 죽는다 |
| 메트로놈이 Transport에 의존하면 backing stop이 메트로놈 박자에 영향 | 현재 메트로놈은 `AudioContext.currentTime` 직접 사용으로 Transport 무관(`metronome-scheduler.ts` 확인). Sprint 2-3에서 변동 없음. 만약 메트로놈이 Transport로 옮겨가면 그때 통합 테스트 추가 |

## 11. 오픈 이슈 (구현 중 결정)

- Kick/Snare/Hat 볼륨 밸런스 초기값 — 구현 후 수동 청취로 미세조정.
- Bass 옥타브가 정말 `root - 12`면 충분한가, 아니면 `root - 24`가 나은가 — 귀로 판정.
- MembraneSynth Kick `octaves: 6` (Tone 기본 10) — 청취 후 6 vs 10 결정.
- 새로 만든 index.ts 배럴이 tree-shaking에 부정적인지 확인 (Next.js 빌드 size 비교).
