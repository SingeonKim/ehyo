'use client';

/*
 * 배킹 트랙 카탈로그 Client subtree.
 *
 * Server 컴포넌트(ProgressionCatalog)가 fetch한 templates를 props로 받아
 * 카테고리별 그룹화 → 카드 그리드 렌더링.
 *
 * Sprint 2-6 변경:
 * - 마디 strip을 slice(0, 8) 잘라내지 않고 모든 step 노출.
 * - 칩을 ul/li 구조로 만들어 현재 재생 중인 마디에 aria-current="true"를 부여하고
 *   accent-brass 스타일로 강조 (배킹 엔진 onBar → store.backingCurrentChord 구독).
 * - 카탈로그 헤더에 ChordDisplayModeToggle을 두고, 모든 칩 텍스트를
 *   displayChord(symbol, backingKey, mode)로 정규화 (소문자 i7 → Im7, 절대 표기 등).
 */

import { clsx } from 'clsx';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { useAppStore } from '@/lib/store/app-store';
import { displayChord } from '@/lib/theory/chord-display';

import { BpmSlider } from './BpmSlider';
import { ChordDisplayModeToggle } from './ChordDisplayModeToggle';
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
  // 칩 라벨이 키 적용/도수 모드를 따라가야 하므로 store 셀렉터로 직접 구독.
  // selector를 잘게 쪼개 불필요한 리렌더 회피 (chordDisplayMode 토글이 카드 11개에 전파될 때만 재렌더).
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const backingPlayingSlug = useAppStore((s) => s.backing.backingPlayingSlug);
  const backingCurrentBarIndex = useAppStore(
    (s) => s.backing.backingCurrentChord?.barIndex ?? null,
  );
  const chordDisplayMode = useAppStore((s) => s.ui.chordDisplayMode);

  return (
    <section aria-label="코드 진행 카탈로그" className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Backing Catalog
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <ChordDisplayModeToggle />
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
              {items.map((t) => {
                const isPlayingThisCard = backingPlayingSlug === t.slug;
                const currentBarIdx = isPlayingThisCard
                  ? backingCurrentBarIndex
                  : null;
                return (
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
                      <ul className="flex flex-wrap gap-1 font-mono text-[0.65rem] text-ink-muted">
                        {t.progression.map((step, idx) => {
                          const isCurrent = currentBarIdx === idx;
                          return (
                            <li
                              key={idx}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={clsx(
                                'border px-1.5 py-[1px] tabular-nums transition-colors duration-75',
                                isCurrent
                                  ? 'border-accent-brass bg-accent-brass/10 font-bold text-accent-brass'
                                  : 'border-ink-muted/15 text-ink-secondary',
                              )}
                            >
                              {displayChord(
                                step.chord,
                                backingKey,
                                chordDisplayMode,
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {/* BpmSlider + Apply scale + PlayButton: 카드 우측 컨트롤 영역 */}
                      <div className="flex flex-wrap items-center gap-2">
                        <BpmSlider slug={t.slug} defaultBpm={t.default_bpm} />
                        <UseRecommendedScaleButton template={t} />
                        <ProgressionPlayButton template={t} />
                      </div>
                    </div>
                  </li>
                );
              })}
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
