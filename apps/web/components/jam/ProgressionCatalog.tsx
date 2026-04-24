import {
  listProgressionTemplates,
  type ProgressionTemplate,
} from '@/lib/api/progression-templates';

import { ProgressionCatalogClient } from './ProgressionCatalogClient';

/*
 * 배킹 트랙 카탈로그 — Server Component.
 *
 * API 페치만 담당, 실제 상호작용 UI는 ProgressionCatalogClient에 위임.
 * API 실패(컨테이너 다운 등) 시 페이지 자체는 렌더되도록 try/catch로 격리.
 */

export async function ProgressionCatalog() {
  let templates: ProgressionTemplate[] = [];
  let errorMessage: string | null = null;

  try {
    templates = await listProgressionTemplates();
  } catch (e) {
    errorMessage =
      e instanceof Error ? e.message : 'Backing track catalog unavailable';
  }

  if (errorMessage) {
    return (
      <section aria-label="코드 진행 카탈로그" className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Backing Catalog
        </h2>
        <div className="border border-ink-muted/20 bg-bg-elevated p-4">
          <p className="font-mono text-xs text-ink-muted">
            Catalog offline.{' '}
            <span className="text-ink-secondary">{errorMessage}</span>
          </p>
          <p className="mt-2 font-mono text-[0.65rem] text-ink-muted">
            API base:{' '}
            {process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'}
          </p>
        </div>
      </section>
    );
  }

  return <ProgressionCatalogClient templates={templates} />;
}
