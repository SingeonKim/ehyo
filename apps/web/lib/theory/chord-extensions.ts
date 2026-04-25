/**
 * 코드 품질별 사용 가능 텐션 (root 기준 반음).
 *
 * 음악 이론 컨센서스 + 학습 UX를 절충한 baseline:
 *   - major7: 9, 13 (♯11은 Lydian 색깔이라 baseline 제외)
 *   - minor7: 9, 11, 13
 *   - dominant7: 9, 13 (♯11과 alt는 genre-rules의 jazz/bossa/minor 책임)
 *   - diminished7: 9, 11, b13 — 대칭 코드라 모두 안전
 *   - half_diminished7: 11, b13 — 9는 컨텍스트 의존, 보수적으로 제외
 *   - minor_major7: 9, 13 (11은 단3도-장7도 위에서 어색)
 *
 * Sprint 2-7 후속 튜닝(2026-04-26): jazz V7와 일반 Imaj7에서 colorTones가
 * 너무 많이 등장하는 시각 노이즈를 줄이기 위해 ♯11/11을 Part A baseline에서
 * 제거. 필요한 장르(jazz, bossa)는 genre-rules.perChord로 명시적 추가.
 *
 * 0(=root)은 chord-tones 영역이므로 텐션에 포함하지 않는다.
 *
 * 본 테이블은 장르 무관한 "음악 이론 baseline" — 장르 컨벤션은 genre-rules.ts.
 *
 * music-theory-guardian 게이트 대상.
 */

import type { ChordQuality } from './chords';

export const CHORD_EXTENSIONS: Record<ChordQuality, readonly number[]> = {
  major: [2], // 9
  minor: [2, 5], // 9, 11
  diminished: [2, 5], // 9, 11
  augmented: [2, 6], // 9, #11 (대칭 whole-tone 컨텍스트)
  major7: [2, 9], // 9, 13 (♯11 제외 — genre-rules에서 추가)
  minor7: [2, 5, 9], // 9, 11, 13
  dominant7: [2, 9], // 9, 13 (♯11 제외 + alt는 genre-rules)
  diminished7: [2, 5, 8], // 9, 11, b13
  half_diminished7: [5, 8], // 11, b13
  minor_major7: [2, 9], // 9, 13 (11 제외)
} as const;
