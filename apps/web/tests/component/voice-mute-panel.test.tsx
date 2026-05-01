import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VoiceMutePanel } from '@/components/jam/VoiceMutePanel';
import { useAppStore } from '@/lib/store/app-store';

afterEach(cleanup);

describe('VoiceMutePanel', () => {
  beforeEach(() => {
    useAppStore.setState((s) => {
      s.backing.voiceMutes = { drums: false, bass: false, guitar: false, aux: false };
    });
  });

  it('renders 4 toggle chips', () => {
    render(<VoiceMutePanel />);
    expect(screen.getByRole('button', { name: /drums/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bass/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guitar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aux/i })).toBeInTheDocument();
  });

  it('clicking drums toggles voiceMutes.drums', () => {
    render(<VoiceMutePanel />);
    fireEvent.click(screen.getByRole('button', { name: /drums/i }));
    expect(useAppStore.getState().backing.voiceMutes.drums).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /drums/i }));
    expect(useAppStore.getState().backing.voiceMutes.drums).toBe(false);
  });

  it('muted chip has aria-pressed=true', () => {
    useAppStore.setState((s) => {
      s.backing.voiceMutes.bass = true;
    });
    render(<VoiceMutePanel />);
    expect(screen.getByRole('button', { name: /bass/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /drums/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
