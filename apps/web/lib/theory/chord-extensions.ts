/**
 * 코드 품질별 사용 가능 텐션 (root 기준 반음).
 *
 * 음악 이론 컨센서스:
 *   - major7: 9, #11, 13 — P4(반음 5)는 어보이드(major 3과 b9 충돌)
 *   - minor7: 9, 11, 13
 *   - dominant7: 9, #11, 13 — alt(b9, #9, b13) 추가는 genre-rules의 jazz/minor 책임
 *   - diminished7: 9, 11, b13 — 대칭 코드라 위 셋 모두 안전
 *   - half_diminished7: 11, b13 — 9는 컨텍스트 의존, 보수적으로 제외
 *
 * 0(=root)은 chord-tones 영역이므로 텐션에 포함하지 않는다.
 *
 * 본 테이블은 장르 무관한 "음악 이론 표준" — 장르 컨벤션은 genre-rules.ts.
 *
 * music-theory-guardian 게이트 대상.
 */

import type { ChordQuality } from './chords';

export const CHORD_EXTENSIONS: Record<ChordQuality, readonly number[]> = {
  major: [2], // 9
  minor: [2, 5], // 9, 11
  diminished: [2, 5], // 9, 11
  augmented: [2, 6], // 9, #11
  major7: [2, 6, 9], // 9, #11, 13 — P4(5) 어보이드 제외
  minor7: [2, 5, 9], // 9, 11, 13
  dominant7: [2, 6, 9], // 9, #11, 13 — alt는 genre-rules
  diminished7: [2, 5, 8], // 9, 11, b13
  half_diminished7: [5, 8], // 11, b13
  minor_major7: [2, 5, 9], // 9, 11, 13
} as const;
