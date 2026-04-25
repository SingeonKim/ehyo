'use client';

/*
 * 배킹 트랙 카탈로그 Client subtree.
 *
 * Server 컴포넌트(ProgressionCatalog)가 fetch한 templates를 props로 받아
 * 카테고리별 그룹화 → 카드 그리드 렌더링. 각 카드에 Play 버튼.
 * Key selector는 카탈로그 상단에 둠.
 */

import { clsx } from 'clsx';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';

import { BpmSlider } from './BpmSlider';
import { KeySelector } from './KeySelector';
import { ProgressionPlayButton } from './ProgressionPlayButton';
import { UseRecommendedScaleButton } from './UseRecommendedScaleButton';

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

export function ProgressionCatalogClient({
  templates,
}: {
  templates: ProgressionTemplate[];
}) {
  const groups = groupByCategory(templates);

  return (
    <section aria-label="코드 진행 카탈로그" className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Backing Catalog
        </h2>
        <div className="flex items-center gap-4">
          <KeySelector />
          <span className="font-mono text-[0.65rem] text-ink-muted">
            {templates.length} progressions
          </span>
        </div>
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
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 font-mono text-[0.65rem] text-ink-muted">
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
                    {/* BpmSlider + Apply scale + PlayButton: 카드 우측 컨트롤 영역 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <BpmSlider slug={t.slug} defaultBpm={t.default_bpm} />
                      <UseRecommendedScaleButton template={t} />
                      <ProgressionPlayButton template={t} />
                    </div>
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
