'use client';

/*
 * 카드 내 ▶/⏹ 버튼 + 재생 중일 때 현재 코드·바 인덱스 표시.
 *
 * 단일 재생 원칙은 engine.start 내부에서 보장 — UI는 "재생 중이면 Stop, 아니면
 * Play" 로컬 토글만 신경 쓰면 된다.
 *
 * loading 상태:
 *   engine.start()는 async (샘플 fetch 포함). 그 동안 버튼을 비활성화하고
 *   "Loading…" 텍스트를 보여준다. engine → store 브리지는 playing 상태만
 *   전파하므로, loading은 로컬 state로 트래킹한다.
 */

import { useState } from 'react';

import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

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
  // Bug 1: 정지 상태에서 BPM 슬라이더로 변경 후 ▶ 누를 때 override 값 반영.
  // engine은 store를 직접 import하지 않으므로 호출자가 읽어서 전달하는 bridge 패턴.
  const overrideBpm = useAppStore(
    (s) => (s.backing as { bpmOverrides?: Record<string, number> }).bpmOverrides?.[template.slug],
  );
  // engine.start()의 async 구간 (샘플 로드) 동안 로컬에서만 추적
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    const engine = getBackingEngine();
    if (isPlaying) {
      engine.stop();
    } else {
      setIsLoading(true);
      try {
        // overrideBpm이 undefined면 engine이 template.default_bpm을 사용
        await engine.start(template, backingKey, overrideBpm);
      } finally {
        // 성공·실패 모두 loading 해제 (playing 상태는 store 브리지가 담당)
        setIsLoading(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label={isPlaying ? 'Stop' : 'Play'}
      className={clsx(
        'flex items-center gap-2 border px-2 py-1 font-mono text-xs',
        isPlaying
          ? 'border-accent-brass/60 bg-accent-brass/10 text-accent-brass'
          : isLoading
            ? 'border-ink-muted/25 bg-bg-elevated text-ink-muted'
            : 'border-ink-muted/25 bg-bg-elevated text-ink-secondary hover:text-ink-primary',
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          <span>Loading…</span>
        </>
      ) : (
        <>
          <span aria-hidden="true">{isPlaying ? '⏹' : '▶'}</span>
          {isPlaying && currentChord && (
            <span className="tabular-nums">
              {currentChord.symbol} · bar {currentChord.barIndex + 1}/{template.bars}
            </span>
          )}
        </>
      )}
    </button>
  );
}
