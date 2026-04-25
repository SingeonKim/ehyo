'use client';

/*
 * 카드 내 ▶/⏹ 버튼 + 재생 중일 때 현재 코드·바 인덱스 표시.
 *
 * 단일 재생 원칙은 engine.start 내부에서 보장 — UI는 "재생 중이면 Stop, 아니면
 * Play" 로컬 토글만 신경 쓰면 된다.
 */

import { clsx } from 'clsx';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { getBackingEngine } from '@/lib/audio/backing';
import { useAppStore } from '@/lib/store/app-store';

export function ProgressionPlayButton({
  template,
}: {
  template: ProgressionTemplate;
}) {
  const isPlaying = useAppStore(
    (s) => s.backing.backingPlayingSlug === template.slug,
  );
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const currentChord = useAppStore((s) => s.backing.backingCurrentChord);

  const onClick = async () => {
    const engine = getBackingEngine();
    if (isPlaying) {
      engine.stop();
    } else {
      await engine.start(template, backingKey);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPlaying ? 'Stop' : 'Play'}
      className={clsx(
        'flex items-center gap-2 border px-2 py-1 font-mono text-xs',
        isPlaying
          ? 'border-accent-brass/60 bg-accent-brass/10 text-accent-brass'
          : 'border-ink-muted/25 bg-bg-elevated text-ink-secondary hover:text-ink-primary',
      )}
    >
      <span aria-hidden="true">{isPlaying ? '⏹' : '▶'}</span>
      {isPlaying && currentChord && (
        <span className="tabular-nums">
          {currentChord.symbol} · bar {currentChord.barIndex + 1}/{template.bars}
        </span>
      )}
    </button>
  );
}
