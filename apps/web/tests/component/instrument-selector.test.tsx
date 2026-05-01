import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { InstrumentSelector } from '@/components/fretboard/InstrumentSelector';
import { useAppStore } from '@/lib/store/app-store';

// Sprint 10 후속: InstrumentSelector가 FretboardOptions의 Segmented(Label/Hand)와
// 동일한 시맨틱(role="radiogroup" + role="radio" + aria-checked)으로 통일됐다.
// 따라서 쿼리는 button이 아닌 radio로, 활성 표시는 aria-checked로 검증한다.

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
    expect(screen.getByRole('radio', { name: /guitar 6/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /guitar 7/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /bass 4/i })).toBeInTheDocument();
  });

  it('marks current instrument as aria-checked', () => {
    render(<InstrumentSelector />);
    expect(screen.getByRole('radio', { name: /guitar 6/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: /guitar 7/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('switching to guitar-7 sets tuning to guitar-7-standard', () => {
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('radio', { name: /guitar 7/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-7-standard');
  });

  it('switching to bass-4 sets tuning to bass-4-standard', () => {
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('radio', { name: /bass 4/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('bass-4-standard');
  });

  it('clicking same instrument keeps tuning preset (no reset)', () => {
    useAppStore.getState().setTuning('guitar-6-drop-d');
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('radio', { name: /guitar 6/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-6-drop-d');
  });
});
