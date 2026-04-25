'use client';

/*
 * 배킹 트랙 마스터 볼륨 슬라이더 — 카탈로그 헤더에 1개.
 *
 * 카드별이 아닌 글로벌. backing.volume 슬라이스를 직접 set하고, 엔진은 store
 * 브리지에서 변화를 구독해 master gain에 setValueAtTime으로 반영한다.
 *
 * BPM 슬라이더와 달리 debounce 없음 — 볼륨은 드래그 중간값도 즉시 들리는 것이
 * 자연스럽고, store 갱신 비용이 작아 200ms 지연이 오히려 어색하다.
 */

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';

export function BackingVolumeSlider() {
  const hydrated = useHasHydrated();
  const volume = useAppStore((s) => s.backing.volume);
  const setBackingVolume = useAppStore((s) => s.setBackingVolume);

  // hydration 전에는 default 0.5 표시 — store rehydrate가 끝나면 영속값으로 교체됨
  const effective = hydrated ? volume : 0.5;
  const percent = Math.round(effective * 100);

  return (
    <label className="flex h-7 items-center gap-2 border border-ink-muted/20 px-2 font-mono text-[0.65rem] uppercase tracking-wider text-ink-muted">
      <span>Vol</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        onChange={(e) => setBackingVolume(Number(e.target.value))}
        className="h-1 w-20 accent-accent-brass"
        aria-label={`Backing volume, currently ${percent}%`}
      />
      <span className="w-7 text-right tabular-nums text-ink-primary">
        {percent}
      </span>
    </label>
  );
}
