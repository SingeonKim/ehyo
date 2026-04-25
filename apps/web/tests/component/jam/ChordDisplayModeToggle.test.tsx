import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, it, expect, beforeEach } from 'vitest';

import { ChordDisplayModeToggle } from '@/components/jam/ChordDisplayModeToggle';
import { useAppStore } from '@/lib/store/app-store';

describe('ChordDisplayModeToggle', () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({ ui: { ...s.ui, chordDisplayMode: 'roman' } }));
  });

  afterEach(() => {
    cleanup();
  });

  it('두 버튼 (Roman / Absolute) 렌더', () => {
    render(<ChordDisplayModeToggle />);
    expect(screen.getByRole('button', { name: /roman/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /absolute/i })).toBeInTheDocument();
  });

  it('roman 모드일 때 Roman 버튼이 aria-pressed=true', () => {
    render(<ChordDisplayModeToggle />);
    expect(screen.getByRole('button', { name: /roman/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /absolute/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Absolute 클릭 → store 갱신', async () => {
    const user = userEvent.setup();
    render(<ChordDisplayModeToggle />);
    await user.click(screen.getByRole('button', { name: /absolute/i }));
    expect(useAppStore.getState().ui.chordDisplayMode).toBe('absolute');
  });
});
