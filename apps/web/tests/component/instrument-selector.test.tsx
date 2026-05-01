import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { InstrumentSelector } from '@/components/fretboard/InstrumentSelector';
import { useAppStore } from '@/lib/store/app-store';

describe('InstrumentSelector', () => {
  beforeEach(() => {
    useAppStore.setState((s) => {
      s.fretboard.tuning = 'guitar-6-standard';
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders 3 segmented options', () => {
    render(<InstrumentSelector />);
    expect(screen.getByRole('button', { name: /guitar 6/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guitar 7/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bass 4/i })).toBeInTheDocument();
  });

  it('marks current instrument as aria-pressed', () => {
    render(<InstrumentSelector />);
    expect(screen.getByRole('button', { name: /guitar 6/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /guitar 7/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switching to guitar-7 sets tuning to guitar-7-standard', () => {
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('button', { name: /guitar 7/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-7-standard');
  });

  it('switching to bass-4 sets tuning to bass-4-standard', () => {
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('button', { name: /bass 4/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('bass-4-standard');
  });

  it('clicking same instrument keeps tuning preset (no reset)', () => {
    useAppStore.getState().setTuning('guitar-6-drop-d');
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('button', { name: /guitar 6/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-6-drop-d');
  });
});
