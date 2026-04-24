import type { SoundType } from '@/lib/store/app-store';

/*
 * 5종 합성음 — 모두 OscillatorNode 기반 (샘플 파일 없음).
 *
 * 설계 선택:
 *   v1은 브라우저 번들에 오디오 파일을 넣지 않고 합성음만으로 5개 음색 구분.
 *   장점: 네트워크 비용 0, iOS decode 지연 없음, 볼륨·피치 완전 통제.
 *   단점: 진짜 악기 느낌은 없음 — 감수. 음색 차별은 분명하게 설계.
 *
 * 공통 envelope: attack 0ms / decay ~30~60ms / release 0. 클릭 특성상 매우 짧음.
 * 악센트(Beat 1): 피치 약간 상승 + 볼륨 1.5배. 음색 자체는 동일.
 */

interface PlayOptions {
  /** AudioContext.currentTime 기준 절대 예약 시각. */
  time: number;
  soundType: SoundType;
  isAccent: boolean;
  /** 0.0 ~ 1.0 최종 볼륨. */
  volume: number;
  /** 서브디비전(비정박)은 정박보다 약하게. */
  isSubdiv?: boolean;
}

/** 사운드 특성 레지스트리 — (type, accent 여부)에 따른 osc type / base freq / envelope. */
interface SoundPreset {
  oscType: OscillatorType;
  baseFreq: number;
  accentFreqRatio: number; // accent 시 주파수 곱
  decaySec: number;
  peakGain: number; // accent off 기준 피크 gain (0~1)
}

const PRESETS: Record<SoundType, SoundPreset> = {
  // click: sine + 부드러운 tail. 기존 1kHz/linear decay는 귀를 찌르는 감이 있어
  // 주파수를 700Hz로 내리고 exponential decay(아래)로 자연스럽게 소멸.
  click: {
    oscType: 'sine',
    baseFreq: 700,
    accentFreqRatio: 1.35,
    decaySec: 0.09,
    peakGain: 0.55,
  },
  wood: {
    oscType: 'triangle',
    baseFreq: 800,
    accentFreqRatio: 1.25,
    decaySec: 0.08,
    peakGain: 0.7,
  },
  cowbell: {
    oscType: 'square',
    baseFreq: 540,
    accentFreqRatio: 1.3,
    decaySec: 0.14,
    peakGain: 0.4,
  },
  digital: {
    oscType: 'square',
    baseFreq: 2000,
    accentFreqRatio: 1.25,
    decaySec: 0.04,
    peakGain: 0.45,
  },
  rim: {
    oscType: 'sawtooth',
    baseFreq: 1400,
    accentFreqRatio: 1.4,
    decaySec: 0.05,
    peakGain: 0.5,
  },
};

/** 비정박(서브디비전)은 70% 볼륨 — 청각 위계. */
const SUBDIV_VOLUME_RATIO = 0.7;
/** 악센트는 피크 볼륨 1.5배. */
const ACCENT_VOLUME_RATIO = 1.5;

/**
 * 하나의 클릭을 예약.
 * destination은 호출자가 ctx.destination이든 마스터 gain이든 연결해 둔 노드.
 */
export function scheduleClick(
  ctx: AudioContext,
  destination: AudioNode,
  options: PlayOptions,
): void {
  const { time, soundType, isAccent, volume, isSubdiv = false } = options;
  const preset = PRESETS[soundType];

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = preset.oscType;
  osc.frequency.setValueAtTime(
    preset.baseFreq * (isAccent ? preset.accentFreqRatio : 1),
    time,
  );

  // 볼륨 합성: preset 피크 × 악센트/서브디비전 보정 × 유저 볼륨
  const accentMul = isAccent ? ACCENT_VOLUME_RATIO : 1;
  const subdivMul = isSubdiv ? SUBDIV_VOLUME_RATIO : 1;
  const peak = preset.peakGain * accentMul * subdivMul * Math.max(0, Math.min(1, volume));

  // envelope: 0 → peak (1ms attack) → exponential decay.
  // exponential이 linear보다 귀에 자연스러운 tail 구현. 단 0에는 수학적으로 도달
  // 불가해 매우 작은 값(0.0001)로 타겟 지정하고 오실레이터 stop 직전 이후엔 무음.
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peak * 0.001),
    time + preset.decaySec,
  );
  gain.gain.setValueAtTime(0, time + preset.decaySec + 0.01);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(time);
  osc.stop(time + preset.decaySec + 0.02);
}
