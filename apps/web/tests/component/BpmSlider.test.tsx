import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BpmSlider } from '@/components/jam/BpmSlider';
import { useAppStore } from '@/lib/store/app-store';

vi.mock('@/lib/store/hooks', () => ({
  useHasHydrated: vi.fn(() => true),
}));

beforeEach(() => {
  vi.useFakeTimers();
  // 테스트 간 store 격리 — slug 't'의 override를 초기화
  useAppStore.getState().clearBackingBpm('t');
});

afterEach(() => {
  // DOM 격리 — 이전 render가 다음 테스트에 남지 않도록 명시적 cleanup
  cleanup();
  vi.useRealTimers();
  useAppStore.getState().clearBackingBpm('t');
});

describe('BpmSlider', () => {
  it('초기 표시는 defaultBpm', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    expect(screen.getByRole('slider')).toHaveValue('90');
  });

  it('store에 override가 있으면 해당 값을 표시', () => {
    useAppStore.getState().setBackingBpm('t', 110);
    render(<BpmSlider slug="t" defaultBpm={90} />);
    expect(screen.getByRole('slider')).toHaveValue('110');
  });

  it('200ms 내 연속 변경은 마지막 값만 store에 dispatch', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '100' } });
    fireEvent.change(slider, { target: { value: '110' } });
    fireEvent.change(slider, { target: { value: '120' } });
    // debounce 전: store에 아직 반영 안 됨
    expect(useAppStore.getState().backing.bpmOverrides['t']).toBeUndefined();
    vi.advanceTimersByTime(200);
    // debounce 후: 마지막 값만 저장
    expect(useAppStore.getState().backing.bpmOverrides['t']).toBe(120);
  });

  it('200ms 간격 두 번 변경 → 두 번 dispatch', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '100' } });
    vi.advanceTimersByTime(200);
    expect(useAppStore.getState().backing.bpmOverrides['t']).toBe(100);
    fireEvent.change(slider, { target: { value: '140' } });
    vi.advanceTimersByTime(200);
    expect(useAppStore.getState().backing.bpmOverrides['t']).toBe(140);
  });

  it('60 미만·200 초과 입력은 clamp', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });
    vi.advanceTimersByTime(200);
    expect(useAppStore.getState().backing.bpmOverrides['t']).toBe(60);

    fireEvent.change(slider, { target: { value: '300' } });
    vi.advanceTimersByTime(200);
    expect(useAppStore.getState().backing.bpmOverrides['t']).toBe(200);
  });
});
