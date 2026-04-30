/**
 * 코드 진행 카탈로그 — 빌드 타임 정적 데이터.
 *
 * 데이터 단일 소스: `catalog.json` (apps/api/app/scripts/seed.py와 동일 구조).
 * 카탈로그는 22장 고정이고 사용자별 커스텀이 없으므로 런타임 fetch 대신
 * 빌드에 박아 단일 컨테이너 배포가 가능하도록 한다.
 *
 * 함수 시그니처는 async를 유지 — 호출처(Server Component)가 `await`로 사용 중이고,
 * 미래에 동적 카탈로그(사용자 프리셋 등)로 전환할 때 인터페이스 변경 비용을 0으로 만들기 위함.
 */

// dev 전용 정합성 가드 — production 빌드 시 dead-code-eliminate 대상
import { __assertCardProfilesMatch } from '@/lib/audio/backing/card-profiles';

import catalogData from './catalog.json';

export interface ChordProgressionItem {
  /** 1-indexed 마디 번호 */
  bar: number;
  /** 로마 숫자 코드 표기 (예: I7, V7, ii) */
  chord: string;
}

export interface ProgressionTemplate {
  slug: string;
  name: string;
  category: string;
  bars: number;
  time_signature: string;
  default_bpm: number;
  recommended_scales: string[];
  progression: ChordProgressionItem[];
}

export interface ListParams {
  category?: 'blues' | 'pop' | 'jazz' | 'minor' | 'modal' | 'funk' | 'bossa' | 'rock' | 'folk';
}

const CATALOG = catalogData as ProgressionTemplate[];

// 모듈 로드 시점에 한 번만: 백엔드 카탈로그 슬러그 ↔ CARD_PROFILES 정합성 검증.
// production에서는 함수 자체가 dead-code-eliminate된다.
if (process.env.NODE_ENV !== 'production') {
  __assertCardProfilesMatch(CATALOG.map((t) => t.slug));
}

export async function listProgressionTemplates(
  params: ListParams = {},
): Promise<ProgressionTemplate[]> {
  if (!params.category) return CATALOG;
  return CATALOG.filter((t) => t.category === params.category);
}

export async function getProgressionTemplate(slug: string): Promise<ProgressionTemplate> {
  const tpl = CATALOG.find((t) => t.slug === slug);
  if (!tpl) throw new Error(`ProgressionTemplate not found: ${slug}`);
  return tpl;
}
