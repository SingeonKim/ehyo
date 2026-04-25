/**
 * webaudiofont 패키지의 자체 타입 선언 (라이브러리에 .d.ts 부족).
 *
 * 실제 패키지(v3.0.4)는 글로벌 방식으로 설계되어 module.exports가 없다.
 * Vitest mock에서 named export로 주입하기 위해 declare module로 최소 표면을 선언.
 * 실제 런타임 브라우저 경로에서는 webaudiofont-bridge.ts가 globalThis 폴백을 제공한다.
 *
 * 점진적 보강 원칙 — 현재 사용하는 메서드만 선언.
 */
declare module 'webaudiofont' {
  export class WebAudioFontPlayer {
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
