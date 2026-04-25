import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RootPicker } from '@/components/fretboard/RootPicker';
import { useAppStore } from '@/lib/store/app-store';

/*
 * RootPicker 단독 렌더 테스트.
 *
 * root 버튼 12개와 accidental chip 3개는 모두 role="radio"이므로,
 * aria-labelledby="root-picker-label"을 가진 radiogroup(root 버튼)과
 * aria-label="이명동음 표기 모드"를 가진 radiogroup(accidental)을 within()으로 분리해
 * 두 그룹을 명시적으로 구분한다.
 */

beforeEach(() => {
  // 각 테스트 전 root를 C(0)으로 초기화
  useAppStore.getState().setRoot(0);
});

afterEach(() => {
  cleanup();
});

describe('RootPicker — 기본 상태', () => {
  it('라벨이 "Root"로 렌더된다', () => {
    render(<RootPicker />);
    expect(screen.getByText('Root')).toBeInTheDocument();
  });

  it('root radiogroup 안에 버튼이 12개', () => {
    render(<RootPicker />);
    const rootGroup = screen.getByRole('radiogroup', { name: /root/i });
    const rootButtons = within(rootGroup).getAllByRole('radio');
    expect(rootButtons).toHaveLength(12);
  });

  it('12개 root 버튼 모두 disabled 아님', () => {
    render(<RootPicker />);
    const rootGroup = screen.getByRole('radiogroup', { name: /root/i });
    const rootButtons = within(rootGroup).getAllByRole('radio');
    rootButtons.forEach((b) => expect(b).not.toBeDisabled());
  });

  it('C(root=0)가 aria-checked=true로 활성화됨', () => {
    render(<RootPicker />);
    const rootGroup = screen.getByRole('radiogroup', { name: /root/i });
    const cButton = within(rootGroup).getAllByRole('radio')[0]!;
    expect(cButton).toHaveAttribute('aria-checked', 'true');
  });
});

describe('RootPicker — root 변경 동작', () => {
  it('root 버튼 클릭 시 store.fretboard.root 갱신', () => {
    render(<RootPicker />);
    const rootGroup = screen.getByRole('radiogroup', { name: /root/i });
    const rootButtons = within(rootGroup).getAllByRole('radio');
    // pc=5(F) 버튼 클릭
    fireEvent.click(rootButtons[5]!);
    expect(useAppStore.getState().fretboard.root).toBe(5);
  });

  it('accidental chips는 별도 radiogroup으로 root 변경과 독립', () => {
    render(<RootPicker />);
    const accidentalGroup = screen.getByRole('radiogroup', { name: '이명동음 표기 모드' });
    const chips = within(accidentalGroup).getAllByRole('radio');
    // Auto, ♯, ♭ 총 3개, 모두 활성
    expect(chips).toHaveLength(3);
    chips.forEach((chip) => expect(chip).not.toBeDisabled());
  });
});
