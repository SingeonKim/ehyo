/**
 * 마스터 FX 체인 — Sprint 2-8 PR-B.
 *
 * 토폴로지:
 *   input → compressor → splitter
 *                          → dryGain (0.82) ────────────────┐
 *                          → wetGain (0.18) → reverb ───────┤
 *                                                            → ctx.destination
 *
 * input은 엔진의 masterGain이 connect할 GainNode. 외부에서 input.connect로 voice가 합류.
 * 카테고리별 wet 차등은 Sprint 2-9.
 */

import type { Reverb } from 'smplr';

import { getReverb } from './smplr-bridge';

// compressor 파라미터 — 카테고리별 차등은 Sprint 2-9에서 처리
const COMPRESSOR_THRESHOLD = -18; // dB
const COMPRESSOR_RATIO = 3;
const COMPRESSOR_ATTACK = 0.005; // 5ms
const COMPRESSOR_RELEASE = 0.2; // 200ms
const COMPRESSOR_KNEE = 6; // dB

// dry/wet mix — wet 0.18이면 공간감은 살리되 과하지 않은 수준
const DRY_LEVEL = 0.82;
const WET_LEVEL = 0.18;

export interface MasterFxChain {
  /** 엔진 voice들이 connect할 진입 노드 */
  input: GainNode;
  /** Dynamics Compressor — 피크 억제 */
  compressor: DynamicsCompressorNode;
  /** 드라이 패스 게인 (0.82) */
  dryGain: GainNode;
  /** 웻 패스 게인 (0.18) — reverb.input으로 연결됨 */
  wetGain: GainNode;
  /** smplr Reverb 인스턴스 — AudioWorklet 기반 싱글턴 */
  reverb: Reverb;
  /** 체인 내 모든 노드를 disconnect. 엔진 teardown 시 호출. */
  dispose(): void;
}

/**
 * 마스터 FX 체인을 생성하고 노드 그래프를 연결한 뒤 반환한다.
 *
 * Reverb 초기화에 AudioWorklet ready() await이 필요하므로 async.
 * 엔진 초기화 시 1회 호출 후 engine.ts가 보유한다.
 */
export async function createMasterFxChain(ctx: AudioContext): Promise<MasterFxChain> {
  // 진입 GainNode — voice들이 여기로 connect
  const input = ctx.createGain();

  // Compressor — 입력 피크를 눌러 전체 음량을 균일하게
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = COMPRESSOR_THRESHOLD;
  compressor.ratio.value = COMPRESSOR_RATIO;
  compressor.attack.value = COMPRESSOR_ATTACK;
  compressor.release.value = COMPRESSOR_RELEASE;
  compressor.knee.value = COMPRESSOR_KNEE;

  // dry 패스 — 원본 신호 비율
  const dryGain = ctx.createGain();
  dryGain.gain.value = DRY_LEVEL;

  // wet 패스 — reverb로 보내는 신호 비율
  const wetGain = ctx.createGain();
  wetGain.gain.value = WET_LEVEL;

  // smplr-bridge 싱글턴 Reverb — AudioWorklet ready() 대기 포함
  const reverb = await getReverb(ctx);

  // ── 노드 그래프 연결 ──
  // input → compressor
  input.connect(compressor);
  // compressor → dry + wet 두 갈래
  compressor.connect(dryGain);
  compressor.connect(wetGain);
  // wet → reverb input (smplr Reverb는 .input으로 수신)
  wetGain.connect(reverb.input);
  // dry와 reverb 출력 모두 destination으로
  dryGain.connect(ctx.destination);
  reverb.connect(ctx.destination);

  return {
    input,
    compressor,
    dryGain,
    wetGain,
    reverb,
    dispose() {
      // 각 노드의 연결을 끊어 메모리 누수 방지
      input.disconnect();
      compressor.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      // reverb는 smplr-bridge 싱글턴 — 엔진 라이프사이클과 분리돼
      // 여기서 disconnect하지 않는다. AudioContext 폐기 시 자동 정리됨.
    },
  };
}
