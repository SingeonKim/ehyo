import {
  listProgressionTemplates,
  type ProgressionTemplate,
} from '@/lib/api/progression-templates';

import { ProgressionCatalogClient } from './ProgressionCatalogClient';

/*
 * 배킹 트랙 카탈로그 — Server Component.
 *
 * 카탈로그 데이터는 빌드 타임 정적(catalog.json) — 런타임 fetch 없음.
 * 인터페이스는 await 형태 유지(미래 동적화 대비).
 */

export async function ProgressionCatalog() {
  const templates: ProgressionTemplate[] = await listProgressionTemplates();
  return <ProgressionCatalogClient templates={templates} />;
}
