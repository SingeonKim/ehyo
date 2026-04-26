/**
 * /api/v1/progression-templates 엔드포인트 래퍼.
 * 프론트 컴포넌트는 이 함수만 호출 — URL·파라미터 하드코딩 금지.
 */

import { apiFetch, type GetResponse } from './client';

export type ProgressionTemplate = GetResponse<'/api/v1/progression-templates/{slug}'>;

export interface ListParams {
  category?: 'blues' | 'pop' | 'jazz' | 'minor' | 'modal' | 'funk' | 'bossa' | 'rock' | 'folk';
}

export async function listProgressionTemplates(
  params: ListParams = {},
): Promise<ProgressionTemplate[]> {
  return apiFetch<ProgressionTemplate[]>('/api/v1/progression-templates', {
    params: { category: params.category },
    // 카탈로그는 거의 정적 — 빌드 타임 캐시, 60s revalidate로 seed 변경 반영 여유.
    cache: 'force-cache',
    next: { revalidate: 60 },
  });
}

export async function getProgressionTemplate(slug: string): Promise<ProgressionTemplate> {
  return apiFetch<ProgressionTemplate>(`/api/v1/progression-templates/${slug}`, {
    cache: 'force-cache',
    next: { revalidate: 60 },
  });
}
