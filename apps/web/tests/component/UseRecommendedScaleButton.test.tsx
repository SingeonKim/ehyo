import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UseRecommendedScaleButton } from '@/components/jam/UseRecommendedScaleButton';
import { useAppStore } from '@/lib/store/app-store';

const TEMPLATE_BASE = {
  id: 'x',
  slug: 'x',
  name: 'X',
  category: 'pop',
  bars: 1,
  default_bpm: 120,
  progression: [{ bar: 1, chord: 'I' }],
  time_signature: '4/4',
  created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  useAppStore.getState().setScale('major');
});

afterEach(() => {
  cleanup();
});

describe('UseRecommendedScaleButton', () => {
  it('recommended_scales 비었으면 미렌더', () => {
    const { container } = render(
      <UseRecommendedScaleButton template={{ ...TEMPLATE_BASE, recommended_scales: [] }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('알려지지 않은 scale 키는 미렌더', () => {
    const { container } = render(
      <UseRecommendedScaleButton
        template={{ ...TEMPLATE_BASE, recommended_scales: ['unknown_scale_xyz'] }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('알려진 scale은 버튼 노출 + 클릭 시 store 갱신', () => {
    render(
      <UseRecommendedScaleButton
        template={{ ...TEMPLATE_BASE, recommended_scales: ['major_blues'] }}
      />
    );
    const btn = screen.getByRole('button', { name: /apply scale/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(useAppStore.getState().fretboard.scale).toBe('major_blues');
  });

  it('label은 underscore를 공백으로 치환', () => {
    render(
      <UseRecommendedScaleButton
        template={{ ...TEMPLATE_BASE, recommended_scales: ['major_blues'] }}
      />
    );
    expect(screen.getByText(/apply scale: major blues/i)).toBeInTheDocument();
  });
});
