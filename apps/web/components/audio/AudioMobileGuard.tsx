'use client';

import { useEffect } from 'react';

import { hasAudioContext, resumeAudioContext } from '@/lib/audio/context';
import { useAppStore } from '@/lib/store/app-store';

/*
 * 모바일 백그라운드 → 포그라운드 복귀 시 AudioContext suspend 상태로 빠져
 * 재생 중인데 무음이 되는 케이스 보강.
 *
 * iOS Safari/Chrome은 탭이 백그라운드로 가면 AudioContext.state를 'interrupted'
 * (실질 suspended) 상태로 만든다. 포그라운드로 돌아와도 자동으로 resume되지 않아
 * 메트로놈/배킹은 isPlaying=true인데 소리만 끊긴 상태로 보인다.
 *
 * 이 컴포넌트는 visibilitychange 리스너로 포그라운드 복귀를 감지하고, 스토어에
 * "재생 중" 상태가 살아있으면 resume을 시도한다. visibilitychange는 user gesture가
 * 아니라서 iOS에서 100% 보장되진 않지만(특히 silent 우회 unlock은 못 함), context
 * resume 자체는 한 번 unlock된 세션이라면 동작한다.
 *
 * 데스크톱에는 영향 없음 — 데스크톱 Chrome/Firefox는 백그라운드에서도 ctx가 살아 있다.
 *
 * (practice) 레이아웃에 mount — 메트로놈/배킹 두 흐름 모두 커버.
 */
export function AudioMobileGuard() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      if (!hasAudioContext()) return;

      const { metronome, backing } = useAppStore.getState();
      const shouldRun = metronome.isPlaying || backing.backingPlayingSlug !== null;
      if (!shouldRun) return;

      // resume 실패는 조용히 — 다음 user gesture에서 회복 가능.
      void resumeAudioContext();
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return null;
}
