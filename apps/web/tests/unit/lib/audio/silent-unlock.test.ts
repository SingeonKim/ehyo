/**
 * silent-unlock 모듈 — iOS 무음 스위치 우회 동작 검증.
 *
 * 검증 포인트:
 *   1. iOS UA → <audio playsinline loop> 생성하고 play() 호출
 *   2. 데스크톱 UA → audio 엘리먼트 생성 안 함 (리소스 낭비 방지)
 *   3. 두 번째 호출은 idempotent no-op
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __isUnlockedForTests, __resetUnlockForTests, unlockIosAudioSession } from '@/lib/audio/silent-unlock';

// jsdom은 URL.createObjectURL을 일부만 지원 — 명시적 stub.
function stubCreateObjectURL(): void {
  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock-silent-url'),
      configurable: true,
    });
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-silent-url');
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
}

function setUserAgent(ua: string, maxTouchPoints = 0): void {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  });
}

describe('unlockIosAudioSession', () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stubCreateObjectURL();
    // jsdom의 play/pause는 not implemented — 명시적 mock으로 stderr 노이즈도 차단.
    playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    __resetUnlockForTests();
    vi.restoreAllMocks();
  });

  it('iOS UA에서 playsinline loop audio 엘리먼트를 만들고 play를 호출한다', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');

    const beforeAudio = document.querySelectorAll('audio').length;
    unlockIosAudioSession();
    const after = document.querySelectorAll('audio');

    expect(after.length).toBe(beforeAudio + 1);
    const el = after[after.length - 1];
    expect(el?.getAttribute('playsinline')).toBe('playsinline');
    expect(el?.loop).toBe(true);
    expect(el?.src).toContain('blob:');
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(__isUnlockedForTests()).toBe(true);
  });

  it('iPadOS(터치 가능 Mac UA)도 iOS-like로 인식한다', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      5,
    );

    unlockIosAudioSession();

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('데스크톱 Chrome에서는 audio 엘리먼트를 만들지 않는다', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0',
      0,
    );

    const before = document.querySelectorAll('audio').length;
    unlockIosAudioSession();

    expect(document.querySelectorAll('audio').length).toBe(before);
    expect(playSpy).not.toHaveBeenCalled();
    // 데스크톱에서도 unlocked 마킹되어 다음 호출 비용 0.
    expect(__isUnlockedForTests()).toBe(true);
  });

  it('두 번째 호출은 no-op (idempotent)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');

    unlockIosAudioSession();
    unlockIosAudioSession();
    unlockIosAudioSession();

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('play 실패해도 throw하지 않는다 (best-effort)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    playSpy.mockRejectedValue(new Error('autoplay policy'));

    expect(() => unlockIosAudioSession()).not.toThrow();
  });
});
