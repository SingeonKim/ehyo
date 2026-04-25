/**
 * 멀티트랙 배킹 패턴 데이터 타입.
 *
 * 한 마디(`'1m'`) 내부에서 각 voice가 언제 무엇을 칠지 표현한다.
 * `time` 표기는 Tone.js Time literal — `'bar:beat:sub'` 형식, 예: `'0:0:0'` = 마디 시작,
 * `'0:2:0'` = 3박, `'0:0:2'` = 8분 2번째.
 *
 * 엔진은 매 마디 콜백에서 패턴을 순회하며 voice별 trigger를 호출. 음높이는 베이스/keys만
 * 현재 코드 기준으로 동적 결정 — 패턴 데이터에 음정 정보 없음.
 */

export type BeatStep = {
  /** Tone.js Time literal. 마디 내부 상대 시각. */
  time: string;
  /** 0..1, 기본 0.8. */
  velocity?: number;
};

export type DrumPattern = {
  kick: BeatStep[];
  snare: BeatStep[];
  hat: BeatStep[];
};

export type BassPattern = {
  /** 각 step에서 현재 코드 루트(한 옥타브 다운)를 친다. */
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
