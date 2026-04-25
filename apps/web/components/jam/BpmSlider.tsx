'use client';

/*
 * 카드별 BPM 슬라이더.
 *
 * 왜 이 컴포넌트가 필요한가:
 *   배킹 트랙은 template.default_bpm을 기본으로 사용하지만, 사용자가 카드별로
 *   다른 BPM을 원할 수 있다. store의 bpmOverrides에 per-slug로 저장한다.
 *
 * 설계 결정:
 *   - store 자체 구독: KeySelector와 동일한 패턴. parent prop drilling 없음.
 *   - useHasHydrated 가드: persist hydration 전 첫 렌더에서 localStorage 값이 없어
 *     defaultBpm이 아닌 undefined로 보이는 깜빡임(flash)을 막기 위함.
 *   - 200ms debounce: 슬라이더 드래그 중 발생하는 모든 중간값이 store에 쌓이는 것을
 *     방지. 마지막 값만 persist된다.
 *   - 60~200 clamp: <input type="range">는 min/max를 UI에서 강제하지만,
 *     fireEvent 등 직접 DOM 조작에서 범위 밖 값이 들어올 수 있어 명시적으로 처리.
 */

import { useEffect, useRef, useState } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';

const MIN = 60;
const MAX = 200;
const DEBOUNCE_MS = 200;

function clamp(n: number): number {
  return Math.max(MIN, Math.min(MAX, n));
}

export function BpmSlider({
  slug,
  defaultBpm,
}: {
  slug: string;
  defaultBpm: number;
}) {
  const hydrated = useHasHydrated();
  // hydration 완료 전에는 store 값을 무시하고 defaultBpm 표시 — mismatch 방지
  const storedBpm = useAppStore((s) => s.backing.bpmOverrides[slug]);
  const setBackingBpm = useAppStore((s) => s.setBackingBpm);

  const effective = hydrated ? (storedBpm ?? defaultBpm) : defaultBpm;
  const [local, setLocal] = useState(effective);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // store 값이 외부에서 변경될 때(다른 탭, devtools 등) local 동기화
  useEffect(() => {
    setLocal(effective);
  }, [effective]);

  // unmount 시 pending timer 정리 — 메모리 누수 방지
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clamp(Number(e.target.value));
    // local state는 즉시 반영 → 슬라이더 UI가 끊기지 않음
    setLocal(next);
    // 이전 debounce 타이머 취소 후 새로 등록
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setBackingBpm(slug, next);
    }, DEBOUNCE_MS);
  };

  return (
    <label className="flex h-7 items-center gap-2 border border-ink-muted/20 px-2 font-mono text-[0.65rem] uppercase tracking-wider text-ink-muted">
      <span>BPM</span>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={local}
        onChange={onChange}
        className="h-1 w-20 accent-accent-brass"
        aria-label={`BPM for this progression, currently ${local}`}
      />
      {/* tabular-nums: 숫자 너비 고정 — 슬라이더 레이아웃 흔들림 방지 */}
      <span className="w-7 text-right tabular-nums text-ink-primary">{local}</span>
    </label>
  );
}
