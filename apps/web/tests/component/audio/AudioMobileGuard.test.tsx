/**
 * AudioMobileGuard — 백그라운드 → 포그라운드 복귀 시 ctx resume 동작 검증.
 *
 * 시나리오:
 *   - 메트로놈 isPlaying=true 상태에서 visibilitychange → resume 호출됨
 *   - 백킹 backingPlayingSlug !== null 상태에서도 resume 호출됨
 *   - 둘 다 정지 상태면 resume 호출 안 됨 (불필요한 wake-up 방지)
 *   - hasAudioContext()가 false면 resume 안 시도 (컨텍스트 자체가 없는 케이스)
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioMobileGuard } from '@/components/audio/AudioMobileGuard';
import * as contextModule from '@/lib/audio/context';
import { useAppStore } from '@/lib/store/app-store';

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('AudioMobileGuard', () => {
  let resumeSpy: ReturnType<typeof vi.spyOn>;
  let hasCtxSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resumeSpy = vi.spyOn(contextModule, 'resumeAudioContext').mockResolvedValue(null);
    hasCtxSpy = vi.spyOn(contextModule, 'hasAudioContext').mockReturnValue(true);
    // 초기 상태 — 둘 다 정지
    useAppStore.setState((s) => ({
      ...s,
      metronome: { ...s.metronome, isPlaying: false },
      backing: { ...s.backing, backingPlayingSlug: null },
    }));
    // 시작 visibility = hidden (테스트가 제어)
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
  });

  afterEach(() => {
    // testing-library auto-cleanup이 이 vitest 설정에선 동작 안 함 — 수동 cleanup으로
    // 이전 테스트의 visibilitychange 리스너가 다음 테스트에 누적되는 것 차단.
    cleanup();
    vi.restoreAllMocks();
  });

  it('메트로놈 재생 중 visibility=visible로 돌아오면 resume 호출', () => {
    useAppStore.setState((s) => ({
      ...s,
      metronome: { ...s.metronome, isPlaying: true },
    }));

    render(<AudioMobileGuard />);
    setVisibility('visible');

    expect(resumeSpy).toHaveBeenCalledTimes(1);
  });

  it('배킹 재생 중에도 resume 호출', () => {
    useAppStore.setState((s) => ({
      ...s,
      backing: { ...s.backing, backingPlayingSlug: 'slow-minor-blues' },
    }));

    render(<AudioMobileGuard />);
    setVisibility('visible');

    expect(resumeSpy).toHaveBeenCalledTimes(1);
  });

  it('재생 중인 게 없으면 resume 호출 안 함', () => {
    render(<AudioMobileGuard />);
    setVisibility('visible');

    expect(resumeSpy).not.toHaveBeenCalled();
  });

  it('AudioContext가 아예 없으면 resume 시도 안 함', () => {
    hasCtxSpy.mockReturnValue(false);
    useAppStore.setState((s) => ({
      ...s,
      metronome: { ...s.metronome, isPlaying: true },
    }));

    render(<AudioMobileGuard />);
    setVisibility('visible');

    expect(resumeSpy).not.toHaveBeenCalled();
  });

  it('visibility=hidden 이벤트는 무시', () => {
    useAppStore.setState((s) => ({
      ...s,
      metronome: { ...s.metronome, isPlaying: true },
    }));

    render(<AudioMobileGuard />);
    setVisibility('hidden');

    expect(resumeSpy).not.toHaveBeenCalled();
  });

  it('unmount 시 리스너 해제', () => {
    const { unmount } = render(<AudioMobileGuard />);
    useAppStore.setState((s) => ({
      ...s,
      metronome: { ...s.metronome, isPlaying: true },
    }));

    unmount();
    setVisibility('visible');

    expect(resumeSpy).not.toHaveBeenCalled();
  });
});
