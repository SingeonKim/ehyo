/**
 * WebAudioFontPlayer는 런타임에 <script> 태그를 통해 글로벌로 로드된다
 * (webaudiofont-bridge.ts 참조). npm 패키지의 메인 파일은 webpack이
 * 번들링할 때 ESM/CJS export를 만들지 않으므로 스크립트 태그 방식을 사용한다.
 * 아래 선언은 실제로 사용하는 표면만 기술한 최소 타입 정의다.
 */

declare global {
  class WebAudioFontPlayer {
    constructor();
    loader: {
      startLoad(audioContext: AudioContext, url: string, variableName: string): void;
      waitLoad(callback: () => void): void;
    };
    queueWaveTable(
      audioContext: AudioContext,
      target: AudioNode,
      preset: unknown,
      when: number,
      pitch: number,
      durationSec: number,
      volume?: number,
    ): unknown;
    queueStrumDown(
      audioContext: AudioContext,
      target: AudioNode,
      preset: unknown,
      when: number,
      pitches: number[],
      durationSec: number,
      volume?: number,
      slices?: number,
    ): void;
    queueStrumUp(
      audioContext: AudioContext,
      target: AudioNode,
      preset: unknown,
      when: number,
      pitches: number[],
      durationSec: number,
      volume?: number,
      slices?: number,
    ): void;
    cancelQueue(audioContext: AudioContext): void;
  }
}

export {};
