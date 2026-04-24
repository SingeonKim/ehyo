import { clsx } from 'clsx';

import { listProgressionTemplates, type ProgressionTemplate } from '@/lib/api/progression-templates';

/*
 * 배킹 트랙 카탈로그 프리뷰 — Server Component.
 *
 * Phase 5 Day 4에서는 "API 연결됐음"을 보여주는 플레이스홀더. 실제 재생
 * 기능은 Phase 5 후반 Tone.js Transport 연동 시 이 카드에 Play 버튼이 붙는다.
 *
 * API 실패(컨테이너 다운 등) 시에도 페이지 자체는 렌더되도록 try/catch로
 * 격리. 실패 상태는 muted 배너로만 표시.
 */

const CATEGORY_LABELS: Record<string, string> = {
  blues: 'Blues',
  pop: 'Pop',
  jazz: 'Jazz',
  minor: 'Minor',
  modal: 'Modal',
};

const CATEGORY_ACCENT: Record<string, string> = {
  blues: 'text-highlight-blue',
  pop: 'text-highlight-orange',
  jazz: 'text-accent-brass',
  minor: 'text-ink-secondary',
  modal: 'text-highlight-green',
};

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

  const groups = groupByCategory(templates);

  return (
    <section aria-label="코드 진행 카탈로그" className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Backing Catalog
        </h2>
        <span className="font-mono text-[0.65rem] text-ink-muted">
          {templates.length} progressions · preview only
        </span>
      </div>

      <div className="space-y-5">
        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p
              className={clsx(
                'font-mono text-[0.65rem] uppercase tracking-[0.3em]',
                CATEGORY_ACCENT[category] ?? 'text-ink-secondary',
              )}
            >
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {items.map((t) => (
                <li
                  key={t.slug}
                  className="border border-ink-muted/15 bg-bg-elevated px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-sm text-ink-primary">
                      {t.name}
                    </span>
                    <span className="font-mono text-[0.65rem] tabular-nums text-ink-muted">
                      {t.default_bpm} bpm · {t.bars} bars
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1 font-mono text-[0.65rem] text-ink-muted">
                    {t.progression.slice(0, 8).map((step, idx) => (
                      <span
                        key={idx}
                        className="border border-ink-muted/15 px-1.5 py-[1px] text-ink-secondary"
                      >
                        {step.chord}
                      </span>
                    ))}
                    {t.progression.length > 8 && (
                      <span className="px-1.5 py-[1px] text-ink-muted">…</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupByCategory(
  templates: ProgressionTemplate[],
): Record<string, ProgressionTemplate[]> {
  const groups: Record<string, ProgressionTemplate[]> = {};
  for (const tpl of templates) {
    const key = tpl.category;
    (groups[key] ??= []).push(tpl);
  }
  return groups;
}
