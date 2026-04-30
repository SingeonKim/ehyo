/**
 * smplr 통합 브릿지 — Soundfont/DrumMachine 인스턴스 캐시 + 번들 로딩.
 *
 * Sprint 2-8 PR-A에서 webaudiofont-bridge를 대체. 같은 AudioContext를 공유하는
 * 인스턴스는 1회만 생성한다 (instrument name / machine name이 캐시 키).
 *
 * voice 추상화(drums/bass/guitar/aux)의 시그니처는 유지하고 내부에서 본 모듈의
 * 인스턴스를 호출한다. webaudiofont-bridge의 player 싱글턴 + script tag 로딩
 * 패턴은 smplr이 ESM ES module로 깔끔하게 export하므로 사라진다.
 *
 * Reverb는 마스터 FX 체인(Sprint 2-8 PR-B)이 사용 — 카드별 voice가 아니라
 * 엔진 단일 인스턴스가 ctx 라이프타임 동안 1회만 만들어 보유.
 */

import { DrumMachine, Reverb, Soundfont } from 'smplr';

import type { InstrumentBundle } from './presets';

// 인스턴스 캐시. key = instrument name (Soundfont) 또는 machine name (DrumMachine).
// Promise를 캐시하므로 동시 요청도 단일 인스턴스로 수렴.
const soundfontCache = new Map<string, Promise<Soundfont>>();
const drumCache = new Map<string, Promise<DrumMachine>>();

export type LoadedBundle = {
  drums: DrumMachine;
  bass: Soundfont;
  guitar: Soundfont;
  aux?: Soundfont;
};

/**
 * smplr Soundfont/DrumMachine은 생성자 `options.destination`으로 출력 노드를 받는다.
 * 미지정 시 ctx.destination 직행 — fxChain/masterGain 우회 → volume slider 무력화.
 * destination을 fxChain.input에 묶어 voice → fxChain → masterGain → destination 흐름 보장.
 *
 * cache는 instrument name 단위라 첫 호출의 destination이 영구 적용. engine 라이프타임
 * 동안 fxChain.input은 동일 노드라 cache hit도 안전.
 */
export async function getSoundfont(
  ctx: AudioContext,
  instrument: string,
  destination?: AudioNode,
): Promise<Soundfont> {
  const cached = soundfontCache.get(instrument);
  if (cached) return cached;
  const promise = (async () => {
    const sf = new Soundfont(ctx, { instrument, destination });
    await sf.load;
    return sf;
  })();
  soundfontCache.set(instrument, promise);
  return promise;
}

export async function getDrumMachine(
  ctx: AudioContext,
  machine: string,
  destination?: AudioNode,
): Promise<DrumMachine> {
  const cached = drumCache.get(machine);
  if (cached) return cached;
  const promise = (async () => {
    const dm = new DrumMachine(ctx, { instrument: machine, destination });
    await dm.load;
    return dm;
  })();
  drumCache.set(machine, promise);
  return promise;
}

/**
 * aux voice가 사용하는 percussion-like Soundfont 식별자.
 * spike 결과 smplr getSoundfontNames()에 woodblock·percussive_organ이 있어 임시 사용.
 * 실제 음색 적합성은 PR-A 수동 스모크에서 결정 — 더 적합한 이름이 있으면 교체.
 */
const AUX_INSTRUMENT: Record<'shaker' | 'clave', string> = {
  shaker: 'percussive_organ',
  clave: 'woodblock',
};

export async function loadBundle(
  ctx: AudioContext,
  bundle: InstrumentBundle,
  destination?: AudioNode,
): Promise<LoadedBundle> {
  const [drums, bass, guitar, aux] = await Promise.all([
    getDrumMachine(ctx, bundle.drums.machine, destination),
    getSoundfont(ctx, bundle.bass.instrument, destination),
    getSoundfont(ctx, bundle.guitar.instrument, destination),
    bundle.aux
      ? getSoundfont(ctx, AUX_INSTRUMENT[bundle.aux.kind], destination)
      : Promise.resolve(undefined),
  ]);
  return { drums, bass, guitar, aux };
}

/**
 * Reverb 인스턴스를 한 번만 생성하고 ready를 await한다.
 * AudioContext 라이프타임 동안 단일 인스턴스 유지.
 */
let _reverb: Promise<Reverb> | null = null;

export async function getReverb(ctx: AudioContext): Promise<Reverb> {
  if (_reverb) return _reverb;
  _reverb = (async () => {
    const r = new Reverb(ctx);
    await r.ready();
    return r;
  })();
  return _reverb;
}

/** 테스트·HMR 정리. 운영 코드에서 호출 금지. */
export function __resetSmplrBridgeForTests(): void {
  soundfontCache.clear();
  drumCache.clear();
  _reverb = null;
}
