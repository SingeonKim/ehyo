/**
 * /api/v1/progression-templates 엔드포인트 래퍼.
 * 프론트 컴포넌트는 이 함수만 호출 — URL·파라미터 하드코딩 금지.
 */

import { apiFetch, type GetResponse } from './client';
// dev 전용 정합성 가드 — production 빌드 시 dead-code-eliminate 대상
import { __assertCardProfilesMatch } from '@/lib/audio/backing/card-profiles';

export type ProgressionTemplate = GetResponse<'/api/v1/progression-templates/{slug}'>;

export interface ListParams {
  category?: 'blues' | 'pop' | 'jazz' | 'minor' | 'modal' | 'funk' | 'bossa' | 'rock' | 'folk';
}

export async function listProgressionTemplates(
  params: ListParams = {},
): Promise<ProgressionTemplate[]> {
  const templates = await apiFetch<ProgressionTemplate[]>('/api/v1/progression-templates', {
    params: { category: params.category },
    // 카탈로그는 거의 정적 — 빌드 타임 캐시, 60s revalidate로 seed 변경 반영 여유.
    cache: 'force-cache',
    next: { revalidate: 60 },
  });

  // dev에서만 실행: 백엔드 카탈로그 슬러그와 CARD_PROFILES 정합성 검증.
  // production에서는 __assertCardProfilesMatch가 dead-code-eliminate된다.
  if (process.env.NODE_ENV !== 'production') {
    __assertCardProfilesMatch(templates.map((t) => t.slug));
  }

  return templates;
}

export async function getProgressionTemplate(slug: string): Promise<ProgressionTemplate> {
  return apiFetch<ProgressionTemplate>(`/api/v1/progression-templates/${slug}`, {
    cache: 'force-cache',
    next: { revalidate: 60 },
  });
}
