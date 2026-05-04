/**
 * GM 드럼킷 voice — Sprint 2-8 PR-A에서 webaudiofont에서 smplr DrumMachine으로 교체.
 *
 * voice는 stateless: DrumMachine 인스턴스를 매 trigger마다 인자로 받음.
 * 카드(카테고리) 전환 시 voice 객체 재사용, drumMachine만 swap.
 *
 * note는 string ('kick', 'snare', 'hat') — DrumMachine의 sample group name.
 * velocity는 0~1 패턴 데이터를 0~127 MIDI 범위로 변환해 smplr에 전달한다.
 */

import type { DrumMachine } from 'smplr';

import { getAudioContext } from '../../context';

/** smplr Smplr.start()가 반환하는 StopFn. 호출 시 미예약된 이벤트는 큐에서 제거,
 *  이미 재생된 voice는 stopById로 정지 (smplr 0.20.0 dist L1019-1031). */
type StopFn = (time?: number) => void;

/**
 * smplr DrumMachine kit별 'hat' / 'snare' sample 이름 동적 lookup.
 *
 * 문제: 우리 패턴 데이터는 추상 이름('kick'/'snare'/'hat') 사용. smplr은 sample
 * 이름 자체 + 첫 base group을 alias로 등록(예: LM-2의 'hhclosed-long' → 'hhclosed'
 * alias). 그러나 LM-2에 'hat'은 없고 'hhclosed'만 있어 'hat' 호출 시 *무음*.
 * 'kick'은 LM-2 samples에 그대로 있어 작동, 'snare'는 'snare-h' 첫 sample이
 * 'snare' alias로 매핑되어 작동.
 *
 * 해결: drumMachine.sampleNames에서 hi-hat 후보를 찾아 캐싱.
 * kit별로 'hhclosed'(LM-2), 'hh-c'(가능), 'closed-hat' 등 다양 → 우선순위 lookup.
 */
const HAT_NOTE_CACHE = new WeakMap<DrumMachine, string>();
function resolveHatNote(dm: DrumMachine): string {
  const cached = HAT_NOTE_CACHE.get(dm);
  if (cached) return cached;
  // 일부 mock이나 비정상 인스턴스에서 sampleNames 미정의 가드.
  const names = dm.sampleNames ?? [];
  // 'hhclosed-short'를 'hhclosed-long'/'hhclosed'보다 우선 — 짧고 밝은 음색이
  // 트리플렛 빠른 retrigger와 셔플 ride feel에 더 적합.
  const resolved =
    names.find((n) => n === 'hat') ??
    names.find((n) => n === 'hhclosed-short') ??
    names.find((n) => n === 'hhclosed') ??
    names.find((n) => n === 'hh-c' || n === 'closed-hat' || n === 'hi-hat') ??
    names.find((n) => n.startsWith('hhclosed')) ??
    names.find((n) => n.startsWith('hh') && !n.includes('open')) ??
    names.find((n) => n.includes('hihat')) ??
    'hat'; // fallback (이 경우 무음 가능성 — 새 kit 추가 시 lookup 보강)
  HAT_NOTE_CACHE.set(dm, resolved);
  return resolved;
}

/**
 * hat sample 전역 attenuation — 패턴 데이터의 dynamics는 보존하되 voice 레벨에서
 * 일괄 -30%. closed hat sample이 kick/snare 대비 너무 도드라지는 경향을 균형.
 * 카드별 미세 조정 필요 시 toneProfile.voiceGain.drums로 보강.
 */
const HAT_VELOCITY_SCALE = 0.7;

/**
 * smplr DrumMachine kit별 'tom' sample 이름 동적 lookup.
 *
 * kit별 실제 이름(drum sample audit 2026-05-03 기준):
 *   LM-2:    tom-h / tom-m / tom-l / tom-ll / tom-hh
 *   TR-808:  mid-tom / tom-hi / tom-low
 *   CR-8000: tom-high / tom-low
 *
 * 우선순위 — mid 패밀리 > low > high > generic > startsWith('tom') > snare-l > snare 폴백.
 * 중간 음역 tom이 배킹 climax fill에 가장 자연스럽게 앉는다.
 */
const TOM_NOTE_CACHE = new WeakMap<DrumMachine, string>();
function resolveTomNote(dm: DrumMachine): string {
  const cached = TOM_NOTE_CACHE.get(dm);
  if (cached) return cached;
  const names = dm.sampleNames ?? [];
  const resolved =
    names.find((n) => n === 'tom-mid') ??
    names.find((n) => n === 'mid-tom') ??
    names.find((n) => n === 'tom-m') ??
    names.find((n) => n === 'tom-low') ??
    names.find((n) => n === 'tom-l') ??
    names.find((n) => n === 'tom-high') ??
    names.find((n) => n === 'tom-hi') ??
    names.find((n) => n === 'tom-h') ??
    names.find((n) => n === 'tom') ??
    names.find((n) => n.startsWith('tom')) ??
    names.find((n) => n === 'snare-l') ??
    'snare';
  TOM_NOTE_CACHE.set(dm, resolved);
  return resolved;
}

/**
 * smplr DrumMachine kit별 'crash' sample 이름 동적 lookup.
 *
 * kit별 실제 이름(drum sample audit 2026-05-03 기준):
 *   LM-2:    crash
 *   TR-808:  cymbal  (no 'crash')
 *   CR-8000: cymball (double-L 오타 — 의도된 표기)
 *
 * ⚠️ 'cymball' (double-L)은 CR-8000의 실제 sample 이름. 오타가 아님.
 * 우선순위 — crash literal > cymbal > cymball(CR-8000) > cymb* > clap > snare 폴백.
 */
const CRASH_NOTE_CACHE = new WeakMap<DrumMachine, string>();
function resolveCrashNote(dm: DrumMachine): string {
  const cached = CRASH_NOTE_CACHE.get(dm);
  if (cached) return cached;
  const names = dm.sampleNames ?? [];
  const resolved =
    names.find((n) => n === 'crash') ??
    names.find((n) => n === 'crash-1') ??
    names.find((n) => n === 'crash-2') ??
    names.find((n) => n === 'cymbal') ??
    names.find((n) => n === 'cymball') ??
    names.find((n) => n.startsWith('cymb')) ??
    names.find((n) => n === 'clap') ??
    'snare';
  CRASH_NOTE_CACHE.set(dm, resolved);
  return resolved;
}

export interface DrumVoice {
  /**
   * 드럼 스텝 트리거.
   *
   * step: 'kick' | 'snare' | 'hat' | 'tom' | 'crash' — DrumMachine sample group name.
   *   'hat'/'tom'/'crash'는 kit별로 실제 sample 이름이 달라 동적 lookup 후 트리거.
   * drumMachine: smplr DrumMachine 인스턴스.
   * velocity: 0~1 패턴 범위 — 내부에서 0~127로 변환.
   * velocityScale: 카드 프로파일 배율(0~1), default 1. velocity와 곱해 clamp 후 변환.
   */
  trigger(
    step: 'kick' | 'snare' | 'hat' | 'tom' | 'crash',
    drumMachine: DrumMachine,
    time: number,
    velocity?: number,
    velocityScale?: number,
  ): void;
  /** voice 내부 GainNode 스케일 즉시 세팅. 카드 시작 시 프로파일 voiceGain 적용. */
  setVoiceGain(scale: number): void;
  /** 즉시 fade out — hardStop에서 already-attacked note 잔향 차단. */
  fadeOut(): void;
  /** 모든 예약/재생 중인 음을 즉시 취소·정지. smplr Smplr.stop()은 큐를 비우지
   *  않으므로 trigger마다 모은 StopFn을 호출하는 것이 신뢰 가능한 경로. */
  cancelScheduled(): void;
  dispose(): void;
}

/**
 * destination이 주어지면 그 노드로 연결(엔진의 master gain). 없으면 ctx.destination
 * 직접 연결로 폴백 — voice 자체가 다른 컨텍스트에서 재사용 가능하도록.
 */
export function createDrumVoice(destination?: AudioNode): DrumVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(destination ?? ctx.destination);

  // 진행 중 세션의 StopFn 누적. cancelScheduled에서 일괄 호출 후 비움.
  const pendingStops: StopFn[] = [];

  return {
    trigger(step, drumMachine, time, velocity = 0.8, velocityScale = 1) {
      // hat은 closed hi-hat sample 도드라짐 완화 위해 voice 레벨에서 -30% attenuate.
      const stepScale = step === 'hat' ? HAT_VELOCITY_SCALE : 1;
      // velocity × velocityScale × stepScale → [0,1] clamp → smplr 요구 0~127 범위
      const scaled = Math.max(0, Math.min(1, velocity * velocityScale * stepScale));
      // 'kick'/'snare'는 sample 이름과 step 이름이 동일 → 그대로.
      // 'hat'/'tom'/'crash'는 kit별 sample 이름이 달라 동적 lookup.
      let noteName: string;
      switch (step) {
        case 'hat':   noteName = resolveHatNote(drumMachine); break;
        case 'tom':   noteName = resolveTomNote(drumMachine); break;
        case 'crash': noteName = resolveCrashNote(drumMachine); break;
        default:      noteName = step; // 'kick' | 'snare'
      }
      const stop = drumMachine.start({
        note: noteName,
        time,
        velocity: Math.max(0, Math.min(127, Math.round(scaled * 127))),
      }) as unknown as StopFn;
      pendingStops.push(stop);
    },
    setVoiceGain(scale: number) {
      // 카드 시작 시 프로파일 voiceGain을 즉시 반영 — ramp 없이 setValueAtTime 사용
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0, scale), t);
    },
    fadeOut() {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.01);
      // 100ms 후 1.0 복구 — 다음 start 즉시 재사용 가능
      setTimeout(() => {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
      }, 100);
    },
    cancelScheduled() {
      for (const stop of pendingStops) {
        try { stop(); } catch { /* StopFn은 idempotent여야 — 이미 정지된 voice는 무시 */ }
      }
      pendingStops.length = 0;
    },
    dispose() {
      gain.disconnect();
    },
  };
}
