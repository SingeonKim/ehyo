/**
 * GM 드럼킷 샘플 voice (Sprint 2-4).
 * Sprint 2-3의 합성 드럼(MembraneSynth/NoiseSynth/MetalSynth)을 대체.
 *
 * GM 채널 10 표준 노트 매핑: kick=36, snare=38, hat=42.
 * 모든 카테고리에서 동일 매핑 사용 (Standard Kit 기준; Jazz Kit 등도 동일).
 *
 * voice는 stateless: preset(LoadedInstrument)을 매 trigger마다 인자로 받음.
 * 카드(카테고리) 전환 시 voice 객체 재사용, preset만 swap.
 *
 * dry GainNode가 destination 사이에 끼워져 있어, hardStop 시 voice.fadeOut()이
 * 10ms ramp로 audio를 끊는다 (WebAudioFont의 cancelQueue가 already-attacked
 * note를 release하지 못하는 한계 보완).
 */

import { getAudioContext } from '../../context';
import { getPlayer, type LoadedDrumKit } from '../webaudiofont-bridge';

const KICK_MIDI = 36;
const SNARE_MIDI = 38;
const HAT_MIDI = 42;

const NOTE_DURATION_SEC = 0.3; // 퍼커션은 짧게

export interface DrumVoice {
  /**
   * 드럼 스텝 트리거.
   *
   * kit: LoadedDrumKit — kick/snare/hat 각각이 별도 패치 파일이므로
   * step에 맞는 패치와 MIDI 노트를 조합해 queueWaveTable을 호출한다.
   * pitch 인자는 패치 파일이 이미 해당 노트 전용이므로 노트 번호와 일치해야 한다.
   */
  trigger(step: 'kick' | 'snare' | 'hat', kit: LoadedDrumKit, time: number, velocity?: number): void;
  /** 즉시 fade out — hardStop에서 already-attacked note 잔향 차단. */
  fadeOut(): void;
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

  return {
    trigger(step, kit, time, velocity = 0.8) {
      // step별로 해당 노트 전용 패치와 MIDI 번호를 선택한다.
      // surikov 패치는 노트별 개별 파일이므로 pitch 인자를 패치 파일의 노트와 일치시킨다.
      const { patch, midi } =
        step === 'kick'  ? { patch: kit.kick.patch,  midi: KICK_MIDI  } :
        step === 'snare' ? { patch: kit.snare.patch, midi: SNARE_MIDI } :
                           { patch: kit.hat.patch,   midi: HAT_MIDI   };
      getPlayer().queueWaveTable(ctx, gain, patch, time, midi, NOTE_DURATION_SEC, velocity);
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
    dispose() {
      gain.disconnect();
    },
  };
}
