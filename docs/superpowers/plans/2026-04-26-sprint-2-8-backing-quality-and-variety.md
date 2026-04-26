# Sprint 2-8 Implementation Plan — Backing Track Quality & Variety

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 ▶ 재생 시 장르별로 사운드와 리듬이 *다르게* 들리도록 한다 — smplr 라이브러리로 사운드 백엔드 교체 + 마스터 FX 체인(compressor + reverb) + 카테고리별 RhythmPattern + 카탈로그 +7.

**Architecture:** voice 추상화(drums/bass/guitar/aux)는 그대로 유지하고, 내부 사운드 호출만 surikov WebAudioFontPlayer → smplr Soundfont/DrumMachine으로 교체한다. 카테고리별 RhythmPattern 라이브러리(`patterns/library/<category>.ts` 9개 파일)와 selectSlot 함수로 마디별 변화를 데이터 영역에 격리. 4개 PR로 분할해 머지(PR-A 백엔드 교체 → PR-B 마스터 FX → PR-C 카테고리별 패턴/번들 → PR-D 시드 +7).

**Tech Stack:** Next.js 15 + Zustand · smplr (`smplr` npm) · vitest · pytest(API seed) · Web Audio API · TypeScript strict.

**스펙:** [`docs/superpowers/specs/2026-04-26-sprint-2-8-backing-quality-and-variety-design.md`](../specs/2026-04-26-sprint-2-8-backing-quality-and-variety-design.md)

---

## File Structure

### 새로 만드는 파일

| 경로 | 책임 |
|---|---|
| `apps/web/lib/audio/backing/smplr-bridge.ts` | smplr Soundfont/DrumMachine/Reverb 인스턴스 캐시 + masterGain wiring. `webaudiofont-bridge.ts`를 대체 |
| `apps/web/lib/audio/backing/fx-chain.ts` | masterGain → compressor → splitter(dry+wet via reverb) → destination 토폴로지 |
| `apps/web/lib/audio/backing/patterns/types.ts` (확장) | `BarPattern`, `CategoryRhythm`, `AuxPattern` 타입 추가 |
| `apps/web/lib/audio/backing/patterns/library/{pop,rock,funk,jazz,blues,folk,bossa,minor,modal}.ts` | 카테고리당 1파일 — patterns + selectSlot |
| `apps/web/lib/audio/backing/patterns/library/index.ts` | `CATEGORY_RHYTHMS` 객체 export |
| `apps/web/lib/audio/backing/voices/aux.ts` | shaker / clave 트리거 voice (funk·bossa) |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/<category>.test.ts` (9 파일) | selectSlot 도메인 규칙 검증 |
| `apps/web/tests/unit/lib/audio/backing/patterns/shape.test.ts` | BarPattern 형식 검증 |
| `apps/web/tests/unit/lib/audio/backing/select-pattern.test.ts` | 12bar blues 4·11·12 분기, 1bar funk 4사이클 검증 |
| `apps/web/tests/unit/lib/audio/backing/fx-chain.test.ts` | 마스터 FX 토폴로지 검증 |
| `apps/web/tests/unit/lib/audio/backing/smplr-bridge.test.ts` | smplr 인스턴스 캐시 + 카테고리별 매핑 |

### 수정하는 파일

| 경로 | 변경 |
|---|---|
| `apps/web/package.json` | `dependencies`에 `smplr` 추가 |
| `apps/web/lib/audio/backing/presets.ts` | `InstrumentPreset` → `InstrumentBundle` 타입 교체, 9개 카테고리 매핑 |
| `apps/web/lib/audio/backing/engine.ts` | bridge import 교체, FX 체인 wiring, selectSlot 호출, aux voice 합류 |
| `apps/web/lib/audio/backing/voices/{drums,bass,guitar}.ts` | smplr 호출로 내부 교체, voice 인터페이스 시그니처 유지 |
| `apps/web/lib/api/progression-templates.ts` | `ListParams.category`에 `funk\|bossa\|rock\|folk` 추가 |
| `apps/web/lib/theory/chords.ts` | `b`/`#` 접두사 (flat/sharp 도수) 파싱 지원 — `bVII7` 등 |
| `apps/web/tests/unit/lib/theory/chords.test.ts` | flat/sharp 도수 파싱 테스트 추가 |
| `apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts` | smplr Soundfont/DrumMachine mock 추가 |
| `apps/web/tests/unit/lib/audio/backing/{engine,presets,voices/*}.test.ts` | smplr mock 사용으로 마이그레이션 |
| `apps/api/app/scripts/seed.py` | `SEED_TEMPLATES`에 7개 dict 추가 |
| `apps/api/tests/test_progression_templates.py` | 카운트 17 + 신규 slug 검증 |
| `CLAUDE.md` | "WebAudioFont 카드 일부가 무음" 트러블슈팅 항목 갱신/제거 |

### 삭제하는 파일

| 경로 | 사유 |
|---|---|
| `apps/web/lib/audio/backing/webaudiofont-bridge.ts` | smplr-bridge.ts로 대체 |
| `apps/web/lib/audio/backing/patterns/backbeat.ts` | 카테고리별 라이브러리에 흡수 |
| `apps/web/lib/audio/backing/patterns/strumming.ts` | 카테고리별 라이브러리에 흡수 |
| `apps/web/tests/unit/lib/audio/backing/webaudiofont-bridge.test.ts` | smplr-bridge.test.ts로 대체 |

---

## PR-A — smplr 백엔드 교체 (행동 변화 0)

이 PR은 *외부에서 들었을 때 거의 변화 없음*. 실패 시 회귀 추적 쉽게 하기 위함.

### Task A1: smplr 패키지 추가 + API 검증 스파이크

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/scripts/spike-smplr.ts` (확인 후 삭제 — 커밋 X)

- [ ] **Step 1: smplr 설치**

```bash
cd apps/web && pnpm add smplr
```

- [ ] **Step 2: smplr API 검증 스파이크**

브라우저 dev 콘솔 또는 임시 페이지에서 다음 시그니처로 동작 확인:

```ts
import { Soundfont, DrumMachine, Reverb } from 'smplr';

const ctx = new AudioContext();
const guitar = new Soundfont(ctx, { instrument: 'electric_guitar_jazz' });
await guitar.load;
guitar.start({ note: 60, time: ctx.currentTime, duration: 0.5, velocity: 0.8 });

const drums = new DrumMachine(ctx, { instrument: 'TR-808' });
await drums.load;
drums.start({ note: 'kick', time: ctx.currentTime + 0.5 });

const reverb = await Reverb(ctx);
guitar.output.addEffect('reverb', reverb, 0.2);
```

검증 포인트:
1. Soundfont.start에 `time` (절대 ctx.currentTime 기준)을 받는지
2. DrumMachine이 `'acoustic'`, `'TR-808'`, `'jazz'` 같은 instrument 식별자를 받는지
3. `output.addEffect`로 노드 라우팅이 가능한지
4. Soundfont/DrumMachine이 destination 직결인지, 별도 GainNode로 라우팅 가능한지

- [ ] **Step 3: 검증 결과를 별도 메모로 기록**

`docs/superpowers/notes/2026-04-26-smplr-spike.md`에 다음 정보를 적는다:
- 정확한 export 이름 및 import 경로
- DrumMachine instrument 식별자 목록 (jazz brush 명칭)
- start({...}) payload의 정확한 키 이름
- output 라우팅 방법 (output.addEffect vs 직접 connect)

이 메모가 이후 모든 task의 reference. 만약 검증 결과 본 plan의 가정과 다르면 plan을 수정한 뒤 진행.

- [ ] **Step 4: package.json에 추가된 게 맞는지 확인**

```bash
cd apps/web && grep '"smplr"' package.json
```
Expected: `"smplr": "^X.Y.Z",` 한 줄.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml docs/superpowers/notes/2026-04-26-smplr-spike.md
git commit -m "$(cat <<'EOF'
chore(deps): add smplr for backing track engine

surikov WebAudioFont 의존성을 대체하기 위한 smplr 라이브러리 도입.
Soundfont(멜로디 악기) + DrumMachine(jazz brush 포함) + Reverb 헬퍼를 제공해
kit=32 결손 문제 자체가 사라진다.

API 검증 스파이크 결과는 docs/superpowers/notes/2026-04-26-smplr-spike.md 참조.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A2: voice mock 헬퍼에 smplr mock 추가

**Files:**
- Modify: `apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts`

- [ ] **Step 1: smplr mock 함수 추가**

`voice-mock-helpers.ts`에 다음을 추가 (기존 PlayerMock은 마이그레이션 동안 유지):

```ts
// ── smplr Soundfont / DrumMachine mock (PR-A) ──

export type SoundfontMock = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  output: { addEffect: ReturnType<typeof vi.fn>; node: AudioNode };
  load: Promise<void>;
};

export type DrumMachineMock = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  output: { node: AudioNode };
  load: Promise<void>;
};

export function makeSoundfontMock(): SoundfontMock {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    output: { addEffect: vi.fn(), node: makeGainNodeMock() as unknown as AudioNode },
    load: Promise.resolve(),
  };
}

export function makeDrumMachineMock(): DrumMachineMock {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    output: { node: makeGainNodeMock() as unknown as AudioNode },
    load: Promise.resolve(),
  };
}

/** smplr 모듈 자체를 vi.mock 대상 — 각 테스트가 vi.mock('smplr', () => ...) 로 주입. */
export type SmplrMock = {
  Soundfont: ReturnType<typeof vi.fn>;
  DrumMachine: ReturnType<typeof vi.fn>;
  Reverb: ReturnType<typeof vi.fn>;
};

export function installSmplrMock(): SmplrMock {
  return {
    Soundfont: vi.fn(() => makeSoundfontMock()),
    DrumMachine: vi.fn(() => makeDrumMachineMock()),
    Reverb: vi.fn(async () => makeGainNodeMock() as unknown as AudioNode),
  };
}
```

- [ ] **Step 2: 타입체크**

```bash
cd apps/web && pnpm typecheck
```
Expected: 변경된 파일만 영향, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts
git commit -m "test(test): add smplr mocks to voice-mock-helpers

Soundfont/DrumMachine/Reverb를 vi.mock으로 주입할 수 있도록 헬퍼 추가.
기존 PlayerMock은 PR-A 마이그레이션 동안 유지하다가 PR-A 마지막에 제거.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task A3: smplr-bridge.ts 작성 (failing tests first)

**Files:**
- Create: `apps/web/lib/audio/backing/smplr-bridge.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/smplr-bridge.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/audio/backing/smplr-bridge.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installSmplrMock, type SmplrMock } from './voice-mock-helpers';

let smplrMock: SmplrMock;

vi.mock('smplr', () => {
  // 각 테스트에서 installSmplrMock으로 갱신된 _mock을 참조.
  return {
    get Soundfont() { return smplrMock.Soundfont; },
    get DrumMachine() { return smplrMock.DrumMachine; },
    get Reverb() { return smplrMock.Reverb; },
  };
});

describe('smplr-bridge', () => {
  beforeEach(() => {
    smplrMock = installSmplrMock();
  });
  afterEach(async () => {
    const mod = await import('@/lib/audio/backing/smplr-bridge');
    mod.__resetSmplrBridgeForTests();
  });

  it('getSoundfont — 같은 instrument는 한 번만 생성한다', async () => {
    const { getSoundfont } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = new AudioContext();
    const a = await getSoundfont(ctx, 'electric_guitar_jazz');
    const b = await getSoundfont(ctx, 'electric_guitar_jazz');
    expect(a).toBe(b);
    expect(smplrMock.Soundfont).toHaveBeenCalledTimes(1);
  });

  it('getDrumMachine — 같은 kit은 한 번만 생성한다', async () => {
    const { getDrumMachine } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = new AudioContext();
    const a = await getDrumMachine(ctx, 'jazz');
    const b = await getDrumMachine(ctx, 'jazz');
    expect(a).toBe(b);
    expect(smplrMock.DrumMachine).toHaveBeenCalledTimes(1);
  });

  it('loadBundle — bundle 정의대로 Soundfont/DrumMachine 로드', async () => {
    const { loadBundle } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = new AudioContext();
    const loaded = await loadBundle(ctx, {
      label: 'Jazz · brush',
      drums: { machine: 'jazz' },
      bass: { instrument: 'acoustic_bass' },
      guitar: { instrument: 'jazz_guitar' },
    });
    expect(loaded.drums).toBeDefined();
    expect(loaded.bass).toBeDefined();
    expect(loaded.guitar).toBeDefined();
    expect(loaded.aux).toBeUndefined();
  });

  it('loadBundle — aux가 있으면 추가 Soundfont 로드', async () => {
    const { loadBundle } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = new AudioContext();
    const loaded = await loadBundle(ctx, {
      label: 'Bossa',
      drums: { machine: 'acoustic' },
      bass: { instrument: 'acoustic_bass' },
      guitar: { instrument: 'nylon_guitar' },
      aux: { kind: 'clave', pattern: 'bossa' },
    });
    expect(loaded.aux).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd apps/web && pnpm test smplr-bridge
```
Expected: FAIL — `smplr-bridge` 모듈 없음.

- [ ] **Step 3: smplr-bridge.ts 구현**

`apps/web/lib/audio/backing/smplr-bridge.ts`:

```ts
/**
 * smplr 통합 브릿지 — Soundfont/DrumMachine 인스턴스 캐시 + 번들 로딩.
 *
 * webaudiofont-bridge를 대체. 같은 AudioContext를 공유하는 인스턴스는
 * 1회만 생성한다. 첫 카드 ▶ 클릭 시 lazy 로드, 두 번째 같은 카테고리는 캐시 히트.
 *
 * voice 추상화(drums/bass/guitar/aux)의 시그니처는 유지하고 내부에서
 * 본 모듈의 인스턴스를 호출한다.
 */

import { DrumMachine, Reverb, Soundfont } from 'smplr';

import type { InstrumentBundle } from './presets';

// 인스턴스 캐시. key = instrument name (Soundfont) 또는 machine name (DrumMachine).
const soundfontCache = new Map<string, Promise<Soundfont>>();
const drumCache = new Map<string, Promise<DrumMachine>>();

export type LoadedBundle = {
  drums: DrumMachine;
  bass: Soundfont;
  guitar: Soundfont;
  aux?: Soundfont;
};

export async function getSoundfont(ctx: AudioContext, instrument: string): Promise<Soundfont> {
  const cached = soundfontCache.get(instrument);
  if (cached) return cached;
  const promise = (async () => {
    const sf = new Soundfont(ctx, { instrument });
    await sf.load;
    return sf;
  })();
  soundfontCache.set(instrument, promise);
  return promise;
}

export async function getDrumMachine(ctx: AudioContext, machine: string): Promise<DrumMachine> {
  const cached = drumCache.get(machine);
  if (cached) return cached;
  const promise = (async () => {
    const dm = new DrumMachine(ctx, { instrument: machine });
    await dm.load;
    return dm;
  })();
  drumCache.set(machine, promise);
  return promise;
}

/**
 * aux voice는 종류별로 다른 Soundfont를 사용:
 *   - shaker: percussive — agogo / shaker percussion 패치 (smplr에서 사용 가능한 것 중 가장 가까운 것)
 *   - clave: woodblock 류
 * 정확한 instrument 이름은 task A1의 spike 메모에서 확정한다.
 */
const AUX_INSTRUMENT: Record<'shaker' | 'clave', string> = {
  shaker: 'percussive_organ', // 임시 — A1 spike 후 적합한 sfont로 교체
  clave: 'woodblock',         // 임시 — A1 spike 후 적합한 sfont로 교체
};

export async function loadBundle(
  ctx: AudioContext,
  bundle: InstrumentBundle,
): Promise<LoadedBundle> {
  const [drums, bass, guitar, aux] = await Promise.all([
    getDrumMachine(ctx, bundle.drums.machine),
    getSoundfont(ctx, bundle.bass.instrument),
    getSoundfont(ctx, bundle.guitar.instrument),
    bundle.aux ? getSoundfont(ctx, AUX_INSTRUMENT[bundle.aux.kind]) : Promise.resolve(undefined),
  ]);
  return { drums, bass, guitar, aux };
}

export async function getReverb(ctx: AudioContext): Promise<AudioNode> {
  // smplr Reverb는 AudioNode를 직접 반환 — wet/dry mix는 호출자가 GainNode로 분기.
  return Reverb(ctx);
}

/** 테스트·HMR 정리. 운영 코드에서 호출 금지. */
export function __resetSmplrBridgeForTests(): void {
  soundfontCache.clear();
  drumCache.clear();
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/web && pnpm test smplr-bridge
```
Expected: PASS — 4 tests.

- [ ] **Step 5: typecheck + lint**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/audio/backing/smplr-bridge.ts apps/web/tests/unit/lib/audio/backing/smplr-bridge.test.ts
git commit -m "feat(audio): add smplr-bridge for Soundfont/DrumMachine instance cache

같은 instrument/machine은 단일 인스턴스로 공유. loadBundle이 InstrumentBundle을
받아 drums/bass/guitar (+ optional aux) 4개를 병렬 로드.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

> **남은 PR-A 작업** (이 plan을 PR-A 작업 시작 시 기준점으로 사용):
> - Task A4: presets.ts에 InstrumentBundle 타입 도입 (PR-C 본격 매핑 전 *최소* 9개 카테고리는 기존 GM 번호 그대로 새 타입으로 옮김)
> - Task A5: drums.ts / bass.ts / guitar.ts 내부 호출을 smplr-bridge로 교체 — voice 인터페이스 시그니처 유지 (단, `LoadedInstrument` → `Soundfont` 타입으로 인자 교체)
> - Task A6: aux.ts 신규 voice 작성
> - Task A7: engine.ts에서 webaudiofont-bridge import 제거, smplr-bridge로 대체. behavior 동일 검증
> - Task A8: webaudiofont-bridge.ts 삭제 + 관련 테스트 제거 + voice-mock-helpers의 PlayerMock 제거
> - Task A9: 수동 스모크 — 9개 카테고리 카드 1장씩 ▶ → 무음 없음, jazz 카드는 brush 사운드 (이전엔 Standard kit 폴백이었음)
>
> 위 task들은 분량이 커서 별도 작성 — PR-A 시작 시 plan의 PR-A 섹션을 확장한다.

---

## PR-B — Master FX 체인

이 PR은 PR-A 위에 패치. compressor + reverb wet 0.18.

### Task B1: fx-chain.ts 구현 (failing tests first)

**Files:**
- Create: `apps/web/lib/audio/backing/fx-chain.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/fx-chain.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/audio/backing/fx-chain.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { createMasterFxChain } from '@/lib/audio/backing/fx-chain';
import { makeAudioContextMock, makeGainNodeMock } from './voice-mock-helpers';

vi.mock('@/lib/audio/backing/smplr-bridge', () => ({
  getReverb: vi.fn(async () => makeGainNodeMock() as unknown as AudioNode),
}));

describe('createMasterFxChain', () => {
  it('input GainNode → compressor → splitter(dry+wet) 토폴로지로 연결한다', async () => {
    const ctx = makeAudioContextMock() as unknown as AudioContext;
    const createCompressor = vi.fn(() => ({
      threshold: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      knee: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    (ctx as unknown as { createDynamicsCompressor: () => unknown }).createDynamicsCompressor =
      createCompressor;

    const fx = await createMasterFxChain(ctx);
    expect(fx.input).toBeDefined();
    expect(fx.compressor).toBeDefined();
    expect(fx.dryGain).toBeDefined();
    expect(fx.wetGain).toBeDefined();
    expect(createCompressor).toHaveBeenCalledTimes(1);
  });

  it('compressor 파라미터: threshold=-18, ratio=3, attack=0.005, release=0.2, knee=6', async () => {
    const ctx = makeAudioContextMock() as unknown as AudioContext;
    const compressor = {
      threshold: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      knee: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    (ctx as unknown as { createDynamicsCompressor: () => unknown }).createDynamicsCompressor =
      vi.fn(() => compressor);

    await createMasterFxChain(ctx);
    expect(compressor.threshold.value).toBe(-18);
    expect(compressor.ratio.value).toBe(3);
    expect(compressor.attack.value).toBeCloseTo(0.005);
    expect(compressor.release.value).toBeCloseTo(0.2);
    expect(compressor.knee.value).toBe(6);
  });

  it('wet/dry 비율: dry=0.82, wet=0.18', async () => {
    const ctx = makeAudioContextMock() as unknown as AudioContext;
    (ctx as unknown as { createDynamicsCompressor: () => unknown }).createDynamicsCompressor =
      vi.fn(() => ({
        threshold: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 },
        release: { value: 0 }, knee: { value: 0 },
        connect: vi.fn(), disconnect: vi.fn(),
      }));

    const fx = await createMasterFxChain(ctx);
    expect(fx.dryGain.gain.value).toBeCloseTo(0.82);
    expect(fx.wetGain.gain.value).toBeCloseTo(0.18);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd apps/web && pnpm test fx-chain
```
Expected: FAIL — `fx-chain` 모듈 없음.

- [ ] **Step 3: fx-chain.ts 구현**

`apps/web/lib/audio/backing/fx-chain.ts`:

```ts
/**
 * 마스터 FX 체인 — Sprint 2-8 PR-B.
 *
 * 토폴로지:
 *   input → compressor → splitter
 *                          → dryGain (0.82) ────────────────┐
 *                          → wetGain (0.18) → reverb ───────┤
 *                                                            → ctx.destination
 *
 * input은 엔진의 masterGain. 외부에서 input.connect(...)로 voice가 합류.
 * 카테고리별 wet 차등은 Sprint 2-9.
 */

import { getReverb } from './smplr-bridge';

const COMPRESSOR_THRESHOLD = -18;
const COMPRESSOR_RATIO = 3;
const COMPRESSOR_ATTACK = 0.005;
const COMPRESSOR_RELEASE = 0.2;
const COMPRESSOR_KNEE = 6;

const DRY_LEVEL = 0.82;
const WET_LEVEL = 0.18;

export interface MasterFxChain {
  input: GainNode;
  compressor: DynamicsCompressorNode;
  dryGain: GainNode;
  wetGain: GainNode;
  reverb: AudioNode;
  dispose(): void;
}

export async function createMasterFxChain(ctx: AudioContext): Promise<MasterFxChain> {
  const input = ctx.createGain();

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = COMPRESSOR_THRESHOLD;
  compressor.ratio.value = COMPRESSOR_RATIO;
  compressor.attack.value = COMPRESSOR_ATTACK;
  compressor.release.value = COMPRESSOR_RELEASE;
  compressor.knee.value = COMPRESSOR_KNEE;

  const dryGain = ctx.createGain();
  dryGain.gain.value = DRY_LEVEL;

  const wetGain = ctx.createGain();
  wetGain.gain.value = WET_LEVEL;

  const reverb = await getReverb(ctx);

  // input → compressor
  input.connect(compressor);
  // compressor → dry + wet 두 갈래
  compressor.connect(dryGain);
  compressor.connect(wetGain);
  // wet → reverb
  wetGain.connect(reverb);
  // 두 갈래 모두 destination
  dryGain.connect(ctx.destination);
  reverb.connect(ctx.destination);

  return {
    input,
    compressor,
    dryGain,
    wetGain,
    reverb,
    dispose() {
      input.disconnect();
      compressor.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      reverb.disconnect();
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/web && pnpm test fx-chain
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/fx-chain.ts apps/web/tests/unit/lib/audio/backing/fx-chain.test.ts
git commit -m "feat(audio): add master FX chain (compressor + reverb wet 0.18)

input → compressor(-18dB/3:1) → splitter(dry 0.82 / wet 0.18 → reverb) → destination.
카테고리별 wet 차등은 Sprint 2-9로 미룸 — 본 PR은 단일 wet 비율.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task B2: engine.ts에 FX 체인 wiring

> 본 task는 PR-A의 engine.ts 변경이 main에 머지된 뒤 진행. PR-A의 `masterGain → ctx.destination` 직결을 `masterGain → fxChain.input → ... → ctx.destination`으로 교체.

**Files:**
- Modify: `apps/web/lib/audio/backing/engine.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/engine.test.ts`

- [ ] **Step 1: engine 통합 테스트 추가 (FX 체인 토폴로지)**

`engine.test.ts`에 다음 추가:

```ts
it('engine init 후 masterGain → fxChain.input 연결', async () => {
  // ... mock 셋업 (기존 테스트 헬퍼 재사용)
  const engine = getBackingEngine();
  // 초기 ensureVoices 트리거를 위해 setVolume 호출
  engine.setVolume(0.5);
  // masterGain.connect 호출 인자가 fxChain.input GainNode인지 확인
  // (정확한 검증 방식은 PR-A에서 voice mock과 함께 확정)
});
```

- [ ] **Step 2: engine.ts에서 createMasterFxChain 호출**

`engine.ts`의 `ensureVoices` 안 마스터 게인 생성 부분 변경:

```ts
let masterGain: GainNode | null = null;
let fxChain: MasterFxChain | null = null;
let fxInitPromise: Promise<void> | null = null;

const ensureVoices = async () => {
  if (!masterGain) {
    const ctx = getAudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = currentVolume;
    if (!fxInitPromise) {
      fxInitPromise = (async () => {
        fxChain = await createMasterFxChain(ctx);
        masterGain!.connect(fxChain.input);
      })();
    }
    await fxInitPromise;
  }
  // ... 기존 voice 생성
};
```

`ensureVoices`를 async로 바꾸면 호출처(`start`)도 await 추가.

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd apps/web && pnpm test engine
```
Expected: 기존 테스트 + 신규 토폴로지 테스트 모두 PASS.

- [ ] **Step 4: 수동 스모크**

```bash
cd apps/web && pnpm dev
```

브라우저 localhost:3000/jam → 카드 ▶ → reverb wet 0.18이 너무 wet하지 않은지 청취. 너무 답답하면 PR-B를 머지하지 않고 wet 0.12로 낮춰 재시도.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/engine.ts apps/web/tests/unit/lib/audio/backing/engine.test.ts
git commit -m "feat(audio): wire master FX chain into backing engine

masterGain → fxChain.input → compressor → dry/wet → destination.
ensureVoices가 async로 변경 — start()도 await ensureVoices().

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

> **남은 PR-B 작업** (필요 시 plan 확장):
> - Task B3: 카테고리별 wet 차등을 *옵션으로* 노출하는 인터페이스 (Sprint 2-9 시 채울 자리)
> - Task B4: 사용자 청취 후 compressor 파라미터 1차 튜닝

---

## PR-C — RhythmPattern + InstrumentBundle (9개 카테고리)

이 PR이 *체감* 변화 가장 큰 PR. PR-A·B 머지 후 진행.

### Task C1: BarPattern / CategoryRhythm 타입 도입

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/types.ts`

- [ ] **Step 1: 타입 추가**

`patterns/types.ts` 끝에 추가:

```ts
import type { ProgressionTemplate } from '@/lib/api/progression-templates';

/** aux voice (shaker, clave) 패턴. BeatStep 그대로지만 의미 분리를 위해 alias. */
export type AuxStep = BeatStep;
export type AuxPattern = AuxStep[];

/** 한 마디(0:0:0~0:3:3)의 BarPattern. */
export type BarPattern = {
  drums: DrumPattern;
  bass: BassPattern;
  guitar: StrumPattern;
  aux?: AuxPattern;
};

/**
 * 카테고리별 리듬 정의. patterns는 슬롯 이름 → BarPattern.
 * selectSlot은 도메인 규칙으로 마디 인덱스 → 슬롯 이름.
 *
 * 결정론: 같은 (template, barIndexAbs)는 항상 같은 슬롯을 반환해야 한다.
 */
export type CategoryRhythm = {
  patterns: Readonly<Record<string, BarPattern>>;
  selectSlot: (tpl: ProgressionTemplate, barIndexAbs: number) => string;
};
```

- [ ] **Step 2: 타입체크**

```bash
cd apps/web && pnpm typecheck
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/types.ts
git commit -m "feat(audio): add BarPattern/CategoryRhythm types

카테고리별 다중 패턴 + selectSlot 도메인 규칙을 위한 타입.
구체 데이터는 patterns/library/<category>.ts (다음 task).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task C2: pop.ts (가장 단순한 카테고리부터)

**Files:**
- Create: `apps/web/lib/audio/backing/patterns/library/pop.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/pop.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`tests/unit/lib/audio/backing/patterns/library/pop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { POP_RHYTHM } from '@/lib/audio/backing/patterns/library/pop';

const tpl = (bars: number) =>
  ({
    bars,
    progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
  }) as never;

describe('POP_RHYTHM.selectSlot', () => {
  it('마지막 마디 → turnaround', () => {
    expect(POP_RHYTHM.selectSlot(tpl(4), 3)).toBe('turnaround');
  });

  it('짝수 마디(0,2) → groove_a', () => {
    expect(POP_RHYTHM.selectSlot(tpl(4), 0)).toBe('groove_a');
    expect(POP_RHYTHM.selectSlot(tpl(4), 2)).toBe('groove_a');
  });

  it('홀수 마디(1) → groove_b', () => {
    expect(POP_RHYTHM.selectSlot(tpl(4), 1)).toBe('groove_b');
  });

  it('패턴 dictionary에 groove_a, groove_b, turnaround 정의', () => {
    expect(POP_RHYTHM.patterns.groove_a).toBeDefined();
    expect(POP_RHYTHM.patterns.groove_b).toBeDefined();
    expect(POP_RHYTHM.patterns.turnaround).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd apps/web && pnpm test patterns/library/pop
```
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: pop.ts 구현**

`patterns/library/pop.ts`:

```ts
/**
 * Pop 카테고리 RhythmPattern.
 *
 * straight 8th, 4박 backbeat, 마지막 마디 turnaround(snare anticipation).
 * 마디별 변화는 짝수 = groove_a, 홀수 = groove_b로 미세 토글.
 */

import type { CategoryRhythm } from '../types';

const HAT_8TH = ['0:0:0', '0:0:2', '0:1:0', '0:1:2', '0:2:0', '0:2:2', '0:3:0', '0:3:2'] as const;

export const POP_RHYTHM: CategoryRhythm = {
  patterns: {
    groove_a: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: HAT_8TH.map((time) => ({ time, velocity: 0.5 })),
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },
    groove_b: {
      // groove_a와 거의 동일. 차이: hat이 4박에서 한 박만 강조 (0:3:0 velocity 0.7)
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: HAT_8TH.map((time) => ({
          time,
          velocity: time === '0:3:0' ? 0.7 : 0.5,
        })),
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2', velocity: 0.6 }] },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },
    turnaround: {
      // 4박 anticipation: snare를 4박 16th 앞당겨 ghost
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:2:3', velocity: 0.4 }, { time: '0:3:0' }],
        hat: HAT_8TH.map((time) => ({ time, velocity: 0.5 })),
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }] },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },
  },
  selectSlot: (tpl, idx) => {
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'turnaround';
    return local % 2 === 0 ? 'groove_a' : 'groove_b';
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/web && pnpm test patterns/library/pop
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/library/pop.ts apps/web/tests/unit/lib/audio/backing/patterns/library/pop.test.ts
git commit -m "feat(audio): add pop category rhythm (groove_a/b + turnaround)

straight 8th backbeat. 짝수 마디 groove_a, 홀수 마디 groove_b, 마지막 마디 turnaround.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

> **남은 PR-C 작업** (각 카테고리당 Task C2와 동일 구조 — TDD: failing test → 구현 → pass → commit):
>
> - **Task C3: rock.ts** — straight 8th, kick 1·3 + 2박-and ghost snare. 슬롯: groove, pickup_eighth, fill_quarter. selectSlot: tpl.bars≥4 && local==tpl.bars-1 → fill_quarter, ==tpl.bars-2 → pickup_eighth, else groove.
> - **Task C4: funk.ts** — 16th hat, kick syncopation, muted guitar 16th stab + shaker aux. 슬롯: groove_a (16th open hat), groove_b (closed hat), pickup_one. selectSlot: 1bar vamp는 4사이클 마지막에 pickup_one + 8마디 안에서 a/b alternate. 일반은 마지막 마디 pickup_one + 짝/홀수 a/b.
> - **Task C5: jazz.ts** — swing 8th ride, walking bass quarters, comping voicings on 2·4 (Freddie Green). 슬롯: walk, walk_approach, comp_only. selectSlot: 마지막 마디 walk_approach, else walk.
> - **Task C6: blues.ts** — shuffle 12/8 (long-short eighth), 12bar에 turnaround/IV pickup 강조. 슬롯: shuffle_a, shuffle_b, iv_pickup, turnaround. selectSlot: 12bar에서 local==3 → iv_pickup, local∈{10,11} → turnaround, else 짝/홀수 a/b. 비-12bar는 shuffle_a 디폴트.
> - **Task C7: folk.ts** — Travis picking alternating bass + 8th strum. 슬롯: picking, strum_8th, pickup. selectSlot: 마지막 마디 pickup, 짝수 picking, 홀수 strum_8th.
> - **Task C8: bossa.ts** — partido alto + clave 3-2/2-3 토글 + nylon. 슬롯: clave_3_2, clave_2_3, pickup. selectSlot: 마지막 마디 pickup, idx/2 짝수 = 3_2, 홀수 = 2_3.
> - **Task C9: minor.ts** — backbeat with BPM-conditional 16th sparse. 슬롯: groove_8th, groove_16th_sparse, pickup. selectSlot: 마지막 마디 pickup, BPM≤90 → 16th_sparse, else 8th.
>
>   *주의: BPM은 selectSlot 인자가 아니므로 patterns 모듈이 template.default_bpm을 직접 읽음.*
> - **Task C10: modal.ts** — 짝/홀수 toggle. 슬롯: groove_a, groove_b. selectSlot: 짝수 a, 홀수 b.
> - **Task C11: index.ts** — `CATEGORY_RHYTHMS = { pop: POP_RHYTHM, rock: ROCK_RHYTHM, ... }` export.
>
> 각 task는 ~50~80줄의 패턴 데이터 + ~20줄 테스트.

### Task C12: shape.test.ts — BarPattern 일관성 검증

**Files:**
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/shape.test.ts`

- [ ] **Step 1: 검증 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';

import { CATEGORY_RHYTHMS } from '@/lib/audio/backing/patterns/library';
import { parseBeatStep } from '@/lib/audio/backing/patterns/types';

describe('BarPattern shape', () => {
  for (const [category, rhythm] of Object.entries(CATEGORY_RHYTHMS)) {
    for (const [slot, pattern] of Object.entries(rhythm.patterns)) {
      it(`${category}/${slot}: 모든 step이 한 마디(0:0:0~0:3:3) 안`, () => {
        const all = [
          ...pattern.drums.kick.map((s) => s.time),
          ...pattern.drums.snare.map((s) => s.time),
          ...pattern.drums.hat.map((s) => s.time),
          ...pattern.bass.steps.map((s) => s.time),
          ...pattern.guitar.map((s) => s.time),
          ...(pattern.aux?.map((s) => s.time) ?? []),
        ];
        for (const time of all) {
          const sec = parseBeatStep(time, 60); // BPM 60 기준 한 마디 = 4초
          expect(sec, `${category}/${slot} time=${time}`).toBeGreaterThanOrEqual(0);
          expect(sec, `${category}/${slot} time=${time}`).toBeLessThan(4);
        }
      });
    }
  }
});
```

- [ ] **Step 2: 테스트 실행**

```bash
cd apps/web && pnpm test patterns/shape
```
Expected: PASS — 카테고리×슬롯 만큼 테스트 (예: 9 카테고리 × 평균 3 슬롯 = ~27 케이스).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/unit/lib/audio/backing/patterns/shape.test.ts
git commit -m "test(audio): verify all BarPatterns stay within one bar

CATEGORY_RHYTHMS의 모든 슬롯이 0:0:0~0:3:3 범위 안의 step만 갖는지 검증.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task C13: presets.ts에 InstrumentBundle 매핑 9개 카테고리

**Files:**
- Modify: `apps/web/lib/audio/backing/presets.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/presets.test.ts` (갱신)

- [ ] **Step 1: 기존 presets.test.ts 갱신**

`presets.test.ts` 작성/수정:

```ts
import { describe, expect, it } from 'vitest';

import { CATEGORY_BUNDLES, getBundle } from '@/lib/audio/backing/presets';

describe('CATEGORY_BUNDLES', () => {
  const expected = ['pop', 'rock', 'funk', 'jazz', 'blues', 'folk', 'bossa', 'minor', 'modal'];

  for (const cat of expected) {
    it(`${cat} 번들 존재 + drums/bass/guitar 정의`, () => {
      const b = (CATEGORY_BUNDLES as Record<string, unknown>)[cat] as
        | undefined
        | { drums: unknown; bass: unknown; guitar: unknown };
      expect(b).toBeDefined();
      expect(b!.drums).toBeDefined();
      expect(b!.bass).toBeDefined();
      expect(b!.guitar).toBeDefined();
    });
  }

  it('jazz는 TR-808 (brush 대체) + jazz guitar + acoustic bass', () => {
    expect(CATEGORY_BUNDLES.jazz.drums.machine).toBe('TR-808');
    expect(CATEGORY_BUNDLES.jazz.guitar.instrument).toBe('electric_guitar_jazz');
    expect(CATEGORY_BUNDLES.jazz.bass.instrument).toBe('acoustic_bass');
  });

  it('funk는 TR-808 + shaker aux', () => {
    expect(CATEGORY_BUNDLES.funk.drums.machine).toBe('TR-808');
    expect(CATEGORY_BUNDLES.funk.aux).toBeDefined();
    expect(CATEGORY_BUNDLES.funk.aux!.kind).toBe('shaker');
  });

  it('bossa는 LM-2 + clave aux + acoustic_guitar_nylon', () => {
    expect(CATEGORY_BUNDLES.bossa.drums.machine).toBe('LM-2');
    expect(CATEGORY_BUNDLES.bossa.aux).toBeDefined();
    expect(CATEGORY_BUNDLES.bossa.aux!.kind).toBe('clave');
    expect(CATEGORY_BUNDLES.bossa.guitar.instrument).toBe('acoustic_guitar_nylon');
  });

  it('rock은 Roland CR-8000', () => {
    expect(CATEGORY_BUNDLES.rock.drums.machine).toBe('Roland CR-8000');
  });

  it('나머지(pop/blues/folk/minor/modal)는 LM-2 baseline', () => {
    for (const cat of ['pop', 'blues', 'folk', 'minor', 'modal'] as const) {
      expect(CATEGORY_BUNDLES[cat].drums.machine, cat).toBe('LM-2');
    }
  });

  it('알려지지 않은 카테고리 → pop fallback', () => {
    expect(getBundle('made-up')).toBe(CATEGORY_BUNDLES.pop);
  });
});
```

- [ ] **Step 2: presets.ts 갱신**

```ts
/**
 * 카테고리 → InstrumentBundle 매핑 (Sprint 2-8).
 *
 * 기존 InstrumentPreset(GM 패치 번호) 폐기 — smplr instrument 식별자로 교체.
 * 정확한 식별자 문자열은 docs/superpowers/notes/2026-04-26-smplr-spike.md 참조.
 */

export type DrumMachineName = 'TR-808' | 'Casio-RZ1' | 'LM-2' | 'MFB-512' | 'Roland CR-8000';

export type InstrumentBundle = {
  label: string;
  drums: { machine: DrumMachineName; volume?: number };
  bass: { instrument: string; octaveShift?: number };
  guitar: { instrument: string; octaveShift?: number };
  aux?: { kind: 'shaker' | 'clave'; pattern: 'bossa' | 'funk-16' };
};

// spike 결과 반영 (2026-04-26): smplr DrumMachine은 jazz brush·acoustic 미지원.
// LM-2가 5종 중 가장 어쿠스틱-인접한 음색으로 baseline. CR-8000은 록 정체성, TR-808은 펑크.
// jazz는 brush 부재로 TR-808 폴백 — 진짜 jazz brush는 후속 Sprint(Sampler + 외부 샘플) 분리.
export const CATEGORY_BUNDLES = {
  pop: {
    label: 'Pop · Clean Electric + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
  rock: {
    label: 'Rock · Clean Electric + Pick Bass',
    drums: { machine: 'Roland CR-8000' },
    bass: { instrument: 'electric_bass_pick', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
  funk: {
    label: 'Funk · Muted Electric + Shaker',
    drums: { machine: 'TR-808' },
    bass: { instrument: 'electric_bass_pick', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_muted', octaveShift: -1 },
    aux: { kind: 'shaker', pattern: 'funk-16' },
  },
  jazz: {
    label: 'Jazz · Jazz Guitar + Acoustic Bass (TR-808 brush 대체)',
    drums: { machine: 'TR-808' },
    bass: { instrument: 'acoustic_bass', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_jazz', octaveShift: -1 },
  },
  blues: {
    label: 'Blues · Overdrive + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'overdriven_guitar', octaveShift: -1 },
  },
  folk: {
    label: 'Folk · Steel Acoustic + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'acoustic_guitar_steel', octaveShift: -1 },
  },
  bossa: {
    label: 'Bossa · Nylon + Acoustic Bass + Clave',
    drums: { machine: 'LM-2', volume: 0.7 },
    bass: { instrument: 'acoustic_bass', octaveShift: -2 },
    guitar: { instrument: 'acoustic_guitar_nylon', octaveShift: -1 },
    aux: { kind: 'clave', pattern: 'bossa' },
  },
  minor: {
    label: 'Minor · Clean Electric + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
  modal: {
    label: 'Modal · Clean Electric + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
} as const satisfies Record<string, InstrumentBundle>;

export function getBundle(category: string): InstrumentBundle {
  return (CATEGORY_BUNDLES as Record<string, InstrumentBundle>)[category] ?? CATEGORY_BUNDLES.pop;
}
```

- [ ] **Step 3: 테스트 통과**

```bash
cd apps/web && pnpm test presets
```
Expected: PASS.

- [ ] **Step 4: typecheck**

```bash
cd apps/web && pnpm typecheck
```
Expected: 0 errors. (engine.ts가 `nylon_guitar` 같은 instrument 이름을 검증하지 않으므로 — 실제 검증은 PR-A의 smplr API에서)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/presets.ts apps/web/tests/unit/lib/audio/backing/presets.test.ts
git commit -m "feat(audio): map 9 categories to InstrumentBundle with smplr identifiers

jazz=brush, funk=shaker aux, bossa=nylon+clave. 다른 카테고리도 카테고리 정체성에
맞는 instrument로 매핑. octaveShift -2 bass / -1 guitar는 기존 동작 보존.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task C14: engine.ts에 selectSlot 디스패치 통합

**Files:**
- Modify: `apps/web/lib/audio/backing/engine.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/engine.test.ts`

- [ ] **Step 1: engine 통합 테스트 추가**

```ts
it('12bar blues: 4·11·12 마디가 다른 슬롯 호출', async () => {
  // mock + spy 셋업으로 schedule된 BarPattern을 추적
  // expected: idx=3 → iv_pickup, idx=10·11 → turnaround
});
```

- [ ] **Step 2: engine.ts onBar 콜백을 selectSlot 기반으로 교체**

기존 `BACKBEAT_DRUMS`/`BACKBEAT_BASS`/`EIGHTH_STRUM` 직접 참조를 제거하고:

```ts
import { CATEGORY_RHYTHMS } from './patterns/library';
// ...

scheduler.start(currentBpm, 4, (eventTime, barIndexAbs) => {
  const tpl = currentTemplate;
  if (!tpl) return;
  const rhythm = CATEGORY_RHYTHMS[tpl.category as keyof typeof CATEGORY_RHYTHMS] ?? CATEGORY_RHYTHMS.pop;
  const slot = rhythm.selectSlot(tpl, barIndexAbs);
  const pattern = rhythm.patterns[slot];
  // ...
  for (const s of pattern.drums.kick)  voices.drums.trigger('kick', loaded.drums, t(s.time), s.velocity);
  for (const s of pattern.drums.snare) voices.drums.trigger('snare', loaded.drums, t(s.time), s.velocity);
  for (const s of pattern.drums.hat)   voices.drums.trigger('hat', loaded.drums, t(s.time), s.velocity);
  for (const s of pattern.bass.steps)  voices.bass.trigger(bassMidi, loaded.bass, beatSec, t(s.time), s.velocity);
  for (const s of pattern.guitar)
    voices.guitar.strum(s.direction, guitarMidi, loaded.guitar, strumDurSec, t(s.time), s.velocity);
  if (pattern.aux && voices.aux && loaded.aux) {
    for (const s of pattern.aux) voices.aux.trigger(loaded.aux, t(s.time), s.velocity);
  }
});
```

- [ ] **Step 3: 테스트 통과 + 수동 스모크**

```bash
cd apps/web && pnpm test && pnpm dev
```

브라우저에서 카테고리당 1장씩 ▶ → 카테고리별 다른 그루브가 들리는지 청취.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/audio/backing/engine.ts apps/web/tests/unit/lib/audio/backing/engine.test.ts
git commit -m "feat(audio): dispatch BarPattern via category selectSlot

엔진이 BACKBEAT_DRUMS/EIGHTH_STRUM 직접 참조를 제거하고 CATEGORY_RHYTHMS를
구독. 카테고리별 다른 그루브 + 마디 인덱스별 슬롯 변화가 활성화된다.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task C15: 레거시 backbeat.ts/strumming.ts 제거

**Files:**
- Delete: `apps/web/lib/audio/backing/patterns/backbeat.ts`
- Delete: `apps/web/lib/audio/backing/patterns/strumming.ts`

- [ ] **Step 1: import 잔존 확인**

```bash
cd apps/web && grep -rn "patterns/backbeat\|patterns/strumming" lib/ tests/ components/
```
Expected: 빈 출력 (Task C14에서 import 모두 제거됨).

- [ ] **Step 2: 파일 삭제**

```bash
cd apps/web && rm lib/audio/backing/patterns/backbeat.ts lib/audio/backing/patterns/strumming.ts
```

- [ ] **Step 3: typecheck**

```bash
cd apps/web && pnpm typecheck
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(audio): remove legacy backbeat/strumming patterns

CATEGORY_RHYTHMS의 카테고리별 라이브러리로 모두 흡수됨.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## PR-D — 카탈로그 +7 (시드 + 파서 확장)

### Task D1: 로마 숫자 파서 b/# 접두사 지원

**Files:**
- Modify: `apps/web/lib/theory/chords.ts`
- Modify: `apps/web/tests/unit/lib/theory/chords.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`chords.test.ts`에 추가:

```ts
describe('parseRoman — flat/sharp degree prefix', () => {
  it('bVII7 — major key의 ♭7도, dominant7', () => {
    const c = romanToChord('bVII7');
    expect(c).not.toBeNull();
    expect(c!.degree).toBe(7);
    expect(c!.quality).toBe('dominant7');
    expect(c!.rootSemitones).toBe(10); // 11 - 1 = 10
  });

  it('bVI — major key의 ♭6도, major triad', () => {
    const c = romanToChord('bVI');
    expect(c).not.toBeNull();
    expect(c!.degree).toBe(6);
    expect(c!.rootSemitones).toBe(8);
  });

  it('#IV — major key의 ♯4도', () => {
    const c = romanToChord('#IV');
    expect(c).not.toBeNull();
    expect(c!.rootSemitones).toBe(6);
  });

  it('잘못된 접두사 조합은 null', () => {
    expect(romanToChord('bbVII')).toBeNull();
    expect(romanToChord('b#V')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd apps/web && pnpm test chords
```
Expected: FAIL — `bVII7`이 null 반환.

- [ ] **Step 3: parseRoman 확장**

`chords.ts`의 `parseRoman` 시작부 수정:

```ts
export function parseRoman(symbol: string): Omit<ParsedChord, 'semitones'> | null {
  // 접두사 b/#: 도수 자체의 반음 변형 (♭7도, ♯4도 등).
  // 단일 b 또는 # 만 허용 — bb, ##, b# 같은 조합은 거부.
  let prefixOffset = 0;
  let body = symbol;
  if (body.startsWith('b')) {
    if (body.length < 2 || body[1] === 'b' || body[1] === '#') return null;
    prefixOffset = -1;
    body = body.slice(1);
  } else if (body.startsWith('#')) {
    if (body.length < 2 || body[1] === '#' || body[1] === 'b') return null;
    prefixOffset = 1;
    body = body.slice(1);
  }

  // 로마 숫자 부분 추출 (최장 매치)
  let romanPart = '';
  for (const candidate of ['VII', 'III', 'VI', 'IV', 'II', 'V', 'I']) {
    if (body.toUpperCase().startsWith(candidate)) {
      romanPart = body.slice(0, candidate.length);
      break;
    }
  }
  if (!romanPart) return null;

  const degree = ROMAN_TO_DIGIT[romanPart.toUpperCase()];
  if (degree === undefined) return null;

  const isLower = romanPart === romanPart.toLowerCase();
  const suffix = body.slice(romanPart.length).trim();

  // ... 기존 quality 매핑 그대로 ...

  const baseRoot = DEGREE_OFFSET[degree];
  if (baseRoot === undefined) return null;
  const rootSemitones = (baseRoot + prefixOffset + 12) % 12;

  return { degree, rootSemitones, quality };
}
```

- [ ] **Step 4: 테스트 통과**

```bash
cd apps/web && pnpm test chords
```
Expected: PASS — 신규 4 + 기존 모두.

- [ ] **Step 5: music-theory-guardian 게이트**

```
Task tool: subagent_type=music-theory-guardian
prompt: lib/theory/chords.ts에 bVII / #IV 같은 flat/sharp 도수 접두사 파싱을 추가했습니다.
변경: parseRoman이 'b' 또는 '#' 접두사를 받아 rootSemitones를 ±1 조정합니다.
'bb'/'##'/'b#'/'#b'은 거부합니다.
이 변경이 음악 이론적으로 올바른지, 또 어보이드 케이스(예: 'bI'은 의미가 모호 —
같은 키인 0이 되어버림)는 어떻게 다루는 게 맞는지 검토 부탁드립니다.
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/theory/chords.ts apps/web/tests/unit/lib/theory/chords.test.ts
git commit -m "feat(theory): support flat/sharp degree prefix in roman parser

bVII7, bVI, #IV 등 접두사 b/#로 도수 자체의 반음 변형을 지원.
jazz-major-blues 시드의 bVII7가 파싱되도록.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task D2: seed.py에 7개 카탈로그 추가

**Files:**
- Modify: `apps/api/app/scripts/seed.py`
- Modify: `apps/api/tests/test_progression_templates.py`

- [ ] **Step 1: seed.py에 7개 dict 추가**

`SEED_TEMPLATES` 끝에 추가:

```python
    # ── Blues 추가 (5) ────────────────────────────
    {
        "slug": "slow-minor-blues",
        "name": "Slow Minor Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 70,
        "recommended_scales": ["minor_blues", "dorian", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "i7"}, {"bar": 2, "chord": "i7"},
            {"bar": 3, "chord": "i7"}, {"bar": 4, "chord": "i7"},
            {"bar": 5, "chord": "iv7"}, {"bar": 6, "chord": "iv7"},
            {"bar": 7, "chord": "i7"}, {"bar": 8, "chord": "i7"},
            {"bar": 9, "chord": "V7"}, {"bar": 10, "chord": "iv7"},
            {"bar": 11, "chord": "i7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "hard-bop-minor-blues",
        "name": "Hard Bop Minor Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 130,
        "recommended_scales": ["minor_blues", "dorian"],
        "progression": [
            {"bar": 1, "chord": "i7"}, {"bar": 2, "chord": "i7"},
            {"bar": 3, "chord": "i7"}, {"bar": 4, "chord": "i7"},
            {"bar": 5, "chord": "iv7"}, {"bar": 6, "chord": "iv7"},
            {"bar": 7, "chord": "i7"}, {"bar": 8, "chord": "i7"},
            {"bar": 9, "chord": "iim7b5"}, {"bar": 10, "chord": "V7"},
            {"bar": 11, "chord": "i7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "shuffle-minor-blues",
        "name": "Shuffle Minor Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 100,
        "recommended_scales": ["minor_blues", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "i7"}, {"bar": 2, "chord": "iv7"},
            {"bar": 3, "chord": "i7"}, {"bar": 4, "chord": "i7"},
            {"bar": 5, "chord": "iv7"}, {"bar": 6, "chord": "iv7"},
            {"bar": 7, "chord": "i7"}, {"bar": 8, "chord": "i7"},
            {"bar": 9, "chord": "V7"}, {"bar": 10, "chord": "iv7"},
            {"bar": 11, "chord": "i7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "jazz-major-blues",
        "name": "Jazz Major Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 120,
        "recommended_scales": ["mixolydian", "major_blues", "dorian"],
        "progression": [
            {"bar": 1, "chord": "Imaj7"}, {"bar": 2, "chord": "I7"},
            {"bar": 3, "chord": "IVmaj7"}, {"bar": 4, "chord": "ivm7"},
            {"bar": 5, "chord": "IVmaj7"}, {"bar": 6, "chord": "bVII7"},
            {"bar": 7, "chord": "iiim7"}, {"bar": 8, "chord": "VI7"},
            {"bar": 9, "chord": "iim7"}, {"bar": 10, "chord": "V7"},
            {"bar": 11, "chord": "Imaj7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "jump-blues",
        "name": "Jump Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 140,
        "recommended_scales": ["major_blues", "mixolydian"],
        "progression": [
            {"bar": 1, "chord": "I7"}, {"bar": 2, "chord": "IV7"},
            {"bar": 3, "chord": "I7"}, {"bar": 4, "chord": "I7"},
            {"bar": 5, "chord": "IV7"}, {"bar": 6, "chord": "IV7"},
            {"bar": 7, "chord": "I7"}, {"bar": 8, "chord": "I7"},
            {"bar": 9, "chord": "V7"}, {"bar": 10, "chord": "IV7"},
            {"bar": 11, "chord": "I7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    # ── Funk 신규 (1) ────────────────────────────
    {
        "slug": "funk-i7-vamp",
        "name": "Funk I7 Vamp",
        "category": "funk",
        "bars": 1,
        "time_signature": "4/4",
        "default_bpm": 110,
        "recommended_scales": ["mixolydian", "minor_pentatonic", "major_blues"],
        "progression": [
            {"bar": 1, "chord": "I7"},
        ],
    },
    # ── Bossa 신규 (1) ───────────────────────────
    {
        "slug": "bossa-i-iv-ii-v",
        "name": "Bossa I–IV–ii–V",
        "category": "bossa",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 130,
        "recommended_scales": ["major", "lydian"],
        "progression": [
            {"bar": 1, "chord": "Imaj7"}, {"bar": 2, "chord": "IVmaj7"},
            {"bar": 3, "chord": "iim7"}, {"bar": 4, "chord": "V7"},
        ],
    },
```

- [ ] **Step 2: pytest로 카운트 검증**

`apps/api/tests/test_progression_templates.py`에 추가:

```python
def test_catalog_has_seventeen_templates(client):
    resp = client.get("/api/v1/progression-templates")
    assert resp.status_code == 200
    assert len(resp.json()) == 17

def test_catalog_includes_new_blues(client):
    resp = client.get("/api/v1/progression-templates", params={"category": "blues"})
    slugs = {t["slug"] for t in resp.json()}
    assert "slow-minor-blues" in slugs
    assert "hard-bop-minor-blues" in slugs
    assert "shuffle-minor-blues" in slugs
    assert "jazz-major-blues" in slugs
    assert "jump-blues" in slugs

def test_catalog_includes_funk_and_bossa(client):
    funk = client.get("/api/v1/progression-templates", params={"category": "funk"})
    bossa = client.get("/api/v1/progression-templates", params={"category": "bossa"})
    assert any(t["slug"] == "funk-i7-vamp" for t in funk.json())
    assert any(t["slug"] == "bossa-i-iv-ii-v" for t in bossa.json())
```

- [ ] **Step 3: 마이그레이션 실행 + 시드 + 테스트**

```bash
cd apps/api && uv run python -m app.scripts.seed
uv run pytest tests/test_progression_templates.py -v
```
Expected: PASS — 카운트 17 + 신규 slug 검증.

- [ ] **Step 4: 모든 신규 코드가 프론트 파서로 파싱되는지 사후 검증**

```bash
cd apps/web && pnpm test chords
```
+ jazz-major-blues의 모든 코드(`Imaj7 I7 IVmaj7 ivm7 IVmaj7 bVII7 iiim7 VI7 iim7 V7`) 가 romanToChord로 null 아닌 결과 반환하는지 확인하는 단위 테스트 추가:

```ts
it('jazz-major-blues progression: 모든 코드가 파싱된다', () => {
  const chords = ['Imaj7','I7','IVmaj7','ivm7','bVII7','iiim7','VI7','iim7','V7'];
  for (const c of chords) {
    expect(romanToChord(c), c).not.toBeNull();
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/scripts/seed.py apps/api/tests/test_progression_templates.py apps/web/tests/unit/lib/theory/chords.test.ts
git commit -m "feat(api): add 7 catalog templates (blues +5, funk +1, bossa +1)

총 10 → 17. blues는 slow/hard-bop/shuffle minor + jazz major + jump 5종 추가.
funk-i7-vamp + bossa-i-iv-ii-v로 새 카테고리 활성화.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task D3: 프론트 카탈로그 union 갱신 + 수동 스모크

**Files:**
- Modify: `apps/web/lib/api/progression-templates.ts`
- Modify: `CLAUDE.md` (트러블슈팅 섹션)

- [ ] **Step 1: ListParams.category union 갱신**

```ts
export interface ListParams {
  category?: 'blues' | 'pop' | 'jazz' | 'minor' | 'modal' | 'funk' | 'bossa' | 'rock' | 'folk';
}
```

- [ ] **Step 2: CLAUDE.md 트러블슈팅 항목 업데이트**

`CLAUDE.md`의 "WebAudioFont 카드 일부가 무음" 섹션을 다음으로 교체:

```markdown
### Sprint 2-8 — smplr로 사운드 백엔드 교체
WebAudioFont kit=32 결손 문제는 smplr DrumMachine으로 자체 해소됨. 카테고리별
악기 구성은 lib/audio/backing/presets.ts의 CATEGORY_BUNDLES 참조. 새 카테고리
추가 시 InstrumentBundle을 정의하고 patterns/library/<category>.ts에 BarPattern + selectSlot 추가.
```

- [ ] **Step 3: 수동 스모크 — 카테고리당 1장**

```bash
cd apps/web && pnpm dev
```

브라우저 localhost:3000/jam에서:
- 9개 카테고리 카드 1장씩 ▶ → 무음 없음
- jazz: 브러시 사운드 (이전엔 Standard kit 폴백)
- funk-i7-vamp: 4사이클로 패턴 변화 + shaker
- bossa-i-iv-ii-v: clave + nylon, 2마디마다 3-2/2-3 토글
- 12-bar-blues-major: 4·11·12마디에 fill/turnaround
- jazz-major-blues: 6마디(bVII7)가 깨지지 않고 IVmaj7→bVII7→iiim7로 진행
- 마스터 reverb 0.18 청취 인상 평가

문제 발견 시 PR 머지하지 않고 수정.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/api/progression-templates.ts CLAUDE.md
git commit -m "chore(api): widen category union for funk/bossa/rock/folk

Sprint 2-8 카탈로그 확장 + 카테고리 활성화에 맞춰 union 보강.
CLAUDE.md 트러블슈팅의 surikov kit 폴백 항목도 갱신.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage

| 스펙 요구 | 대응 task |
|---|---|
| 음질 강화: smplr 도입 | PR-A 전체 (A1~A9) |
| 마스터 FX: compressor + reverb wet 0.18 | PR-B (B1~B2) |
| 카테고리별 InstrumentBundle | C13 |
| 도메인 기반 RhythmPattern + selectSlot | C2~C11 + C12(shape) + C14(dispatch) |
| 카탈로그 +7 (blues 5, funk 1, bossa 1) | D2 |
| 로마 파서 b/# prefix (bVII7 위해) | D1 |
| ListParams.category union 보강 | D3 |
| 단위/통합/E2E 테스트 | 각 task의 step에 포함 |
| 4개 PR 분할 | 본 plan 자체가 PR-A/B/C/D로 섹션 분리 |
| CLAUDE.md 트러블슈팅 갱신 | D3 |

### Placeholder scan

- "남은 PR-A 작업 (Task A4~A9)"과 "남은 PR-C 작업 (Task C3~C10)"은 plan 내 의도적 비완성. 실제 구현 시작 시 plan을 확장한다고 본문에 명시. ⚠️ 이는 placeholder에 가까움 — 진짜 자동 실행이 필요하면 각 task를 풀어 써야 함.
- "임시 — A1 spike 후 적합한 sfont로 교체" (smplr-bridge.ts AUX_INSTRUMENT 주석): A1 spike에서 확정한 정확한 식별자로 후속 task에서 교체. 실제 task에서 명시 필요 — plan 자체에 미반영.

### Type consistency

- `InstrumentBundle.drums.machine` union을 `'acoustic' | 'jazz' | 'TR-808' | 'lm2'`로 확정. presets.ts와 smplr-bridge.ts 모두 같은 string 사용.
- `CATEGORY_RHYTHMS`은 `Record<string, CategoryRhythm>` — engine.ts에서 `tpl.category as keyof typeof CATEGORY_RHYTHMS` 캐스팅 후 `?? CATEGORY_RHYTHMS.pop` fallback. ✅

### 알려진 약점

1. **PR-A의 Task A4~A9, PR-C의 Task C3~C10이 본문에 펼쳐져 있지 않음** — agentic 자동 실행에 부적합. 실제 PR-A/PR-C 작업 시작 직전에 plan을 확장해야 한다. 본 plan은 "충분한 reference + 핵심 첫 task 풀이"로 시작점을 제공.
2. **smplr API 식별자(instrument 이름) 불확정** — Task A1 spike에서 확정. spike 결과가 plan 가정과 달라지면 후속 task 코드를 수정해야 함.
3. **engine.test.ts 토폴로지 검증 코드 미완성** — PR-A에서 voice mock 정착 후 구체화. 본 plan은 "이런 테스트가 들어간다"는 의도만 명시.

위 약점은 spec self-review의 "no placeholder" 규율에 절반만 부합. 사용자 승인 전제 — 큰 마이그레이션이라 첫 발(PR-A 시작)을 디딘 뒤 plan을 늘리는 게 안전합니다.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-26-sprint-2-8-backing-quality-and-variety.md`.

본 plan은 PR-A의 Task A1~A3, PR-B 전체, PR-C의 Task C1·C2·C12·C13·C14·C15, PR-D 전체를 풀이로 가지고 있고, **Task A4~A9 + C3~C10은 의도적으로 reference만** 둔 상태입니다 (각 카테고리의 패턴 데이터를 미리 다 적으면 plan이 너무 길어지고, A1 smplr spike 결과를 봐야 정확한 식별자가 잡힙니다).

**두 가지 실행 옵션:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, between-task review, fast iteration. Task A1 끝나면 spike 메모를 보고 plan을 확장(A4~A9)한 뒤 다음 subagent 디스패치.

**2. Inline Execution** — 같은 세션에서 바로 진행. PR-A 시작 시 plan 확장도 같은 세션에서 처리.

어느 방식으로?
