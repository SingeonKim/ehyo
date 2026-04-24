'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useState } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { getAudioContext } from '@/lib/audio/context';
import { subscribeToBeats, toggleMetronome } from '@/lib/audio/metronome-singleton';
import type { SchedulerEvent } from '@/lib/audio/types';

/*
 * 메트로놈 도크 — 연습 레이아웃 탑바에 상시 배치되는 소형 컨트롤.
 *
 * 목적:
 *   /metronome 이외의 페이지(/fretboard 등)에서도 메트로놈 재생 상태를
 *   인지하고 토글할 수 있게 한다. 라우트 이동에도 싱글턴 스케줄러가
 *   계속 돌아가므로 Dock은 순수하게 상태 표시 + 액션 트리거 역할.
 *
 * UI 구성:
 *   - BPM 숫자 (tabular-nums)
 *   - 박자 펄스 dot — beat 이벤트마다 짧게 점등
 *   - Play/Stop 버튼
 */

export function MetronomeDock() {
  const bpm = useAppStore((s) => s.metronome.bpm);
  const isPlaying = useAppStore((s) => s.metronome.isPlaying);
  const accentBeatOne = useAppStore((s) => s.metronome.accentBeatOne);

  const [pulseBeat, setPulseBeat] = useState<number>(0);
  const [pulseOn, setPulseOn] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = subscribeToBeats((e: SchedulerEvent) => {
      if (e.type === 'sub') return;
      const ctx = getAudioContext();
      const delayMs = Math.max(0, (e.time - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        setPulseBeat(e.beat);
        setPulseOn(true);
        // 80ms 후 off — 한 펄스 짧게 점등
        window.setTimeout(() => setPulseOn(false), 80);
      }, delayMs);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isPlaying) setPulseOn(false);
  }, [isPlaying]);

  const handleToggle = useCallback(async () => {
    await toggleMetronome();
  }, []);

  const isAccent = accentBeatOne && pulseBeat === 1;

  return (
    <div className="flex items-center gap-2 border-l border-ink-muted/20 pl-3">
      <span
        aria-hidden="true"
        className={clsx(
          'h-2 w-2 rounded-full border transition-colors duration-75',
          pulseOn && isAccent && 'border-accent-signal bg-accent-signal',
          pulseOn && !isAccent && 'border-accent-brass bg-accent-brass',
          !pulseOn && 'border-ink-muted/40 bg-transparent',
        )}
      />
      <span className="font-mono text-xs tabular-nums text-ink-secondary" aria-label={`${bpm} BPM`}>
        {bpm}
      </span>
      <button
        type="button"
        onClick={() => void handleToggle()}
        className={clsx(
          'border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-widest transition-colors duration-75',
          isPlaying
            ? 'border-accent-signal bg-accent-signal text-bg-base hover:bg-accent-signal/80'
            : 'border-accent-brass text-accent-brass hover:bg-accent-brass hover:text-bg-base',
        )}
        aria-label={isPlaying ? '메트로놈 정지' : '메트로놈 재생'}
      >
        {isPlaying ? 'Stop' : 'Play'}
      </button>
    </div>
  );
}
