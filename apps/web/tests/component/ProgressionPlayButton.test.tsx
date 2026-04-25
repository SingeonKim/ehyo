import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// backing 엔진 모킹 — start/stop spy만 필요
const startSpy = vi.fn(async () => {});
const stopSpy = vi.fn();
vi.mock('@/lib/audio/backing', () => ({
  getBackingEngine: () => ({
    getState: () => ({ status: 'idle' }),
    subscribe: () => () => {},
    start: startSpy,
    stop: stopSpy,
    dispose: vi.fn(),
  }),
  __disposeBackingEngineForTests: vi.fn(),
  __resetStoreBridgeForTests: vi.fn(),
}));

import { ProgressionPlayButton } from '@/components/jam/ProgressionPlayButton';
import { useAppStore } from '@/lib/store/app-store';

const TEMPLATE = {
  id: 'test-id',
  created_at: '2024-01-01T00:00:00Z',
  slug: 'blues-12-bar-major',
  name: '12-Bar Blues (Major)',
  category: 'blues' as const,
  bars: 12,
  default_bpm: 90,
  progression: [{ bar: 1, chord: 'I7' }],
  time_signature: '4/4',
  recommended_scales: [],
};

beforeEach(() => {
  startSpy.mockClear();
  stopSpy.mockClear();
  // v9: backing key는 fretboard.root로 통합. backing slice에는 더 이상 backingKey 없음.
  useAppStore.setState((s) => ({
    ...s,
    fretboard: { ...s.fretboard, root: 0 },
    backing: {
      ...s.backing,
      backingPlayingSlug: null,
      backingCurrentChord: null,
    },
  }));
});

afterEach(() => {
  cleanup();
  useAppStore.setState((s) => ({
    ...s,
    fretboard: { ...s.fretboard, root: 0 },
    backing: {
      ...s.backing,
      backingPlayingSlug: null,
      backingCurrentChord: null,
    },
  }));
});

describe('ProgressionPlayButton', () => {
  it('shows Play label when idle', () => {
    render(<ProgressionPlayButton template={TEMPLATE} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls engine.start with template and current fretboard.root on click', async () => {
    const user = userEvent.setup();
    useAppStore.setState((s) => ({
      ...s,
      fretboard: { ...s.fretboard, root: 5 },
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    await user.click(screen.getByRole('button', { name: /play/i }));

    // Sprint 2-7 후속: start는 (template, keyRoot, overrideBpm, startBarIndex) 4인자.
    // store에 bpmOverrides가 없으면 overrideBpm은 undefined → engine이 default_bpm 사용.
    // PlayButton에 startBarIndex prop을 안 주면 undefined → engine이 0번 마디부터.
    expect(startSpy).toHaveBeenCalledWith(TEMPLATE, 5, undefined, undefined);
  });

  it('switches to Stop label when this template is playing', () => {
    useAppStore.setState((s) => ({
      ...s,
      backing: {
        ...s.backing,
        backingPlayingSlug: TEMPLATE.slug,
        backingCurrentChord: { symbol: 'I7', barIndex: 0 },
      },
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByText(/I7/)).toBeInTheDocument();
    expect(screen.getByText(/bar 1\/12/)).toBeInTheDocument();
  });

  it('stays in Play label when a different template is playing', () => {
    useAppStore.setState((s) => ({
      ...s,
      backing: {
        ...s.backing,
        backingPlayingSlug: 'some-other-slug',
        backingCurrentChord: { symbol: 'V7', barIndex: 3 },
      },
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls engine.stop when clicked while playing', async () => {
    const user = userEvent.setup();
    useAppStore.setState((s) => ({
      ...s,
      backing: {
        ...s.backing,
        backingPlayingSlug: TEMPLATE.slug,
        backingCurrentChord: { symbol: 'I7', barIndex: 0 },
      },
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(stopSpy).toHaveBeenCalled();
  });
});
