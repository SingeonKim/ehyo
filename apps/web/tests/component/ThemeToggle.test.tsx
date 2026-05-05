/**
 * ThemeToggle 컴포넌트 — 렌더 / 클릭 / 아이콘 분기 테스트.
 * useHasHydrated의 비동기 동작은 findByRole 비동기 쿼리로 대기
 * (Testing Library가 내부적으로 act로 감싼다).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAppStore } from '@/lib/store/app-store';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // ui 슬라이스 전체를 리셋 — chordDisplayMode가 다른 테스트에서 변경된 잔재가
    // 남는 worker 격리 의존성을 차단.
    useAppStore.setState((s) => {
      s.ui = { theme: 'dark', chordDisplayMode: 'roman' };
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('렌더 시 다크 상태에서는 "라이트 모드로 전환" aria-label', async () => {
    render(<ThemeToggle />);
    // useHasHydrated가 useEffect로 true를 세팅해 다음 렌더에 라벨이 정착.
    const button = await screen.findByRole('button', { name: '라이트 모드로 전환' });
    expect(button).toBeInTheDocument();
  });

  it('라이트 상태에서는 "다크 모드로 전환" aria-label', async () => {
    useAppStore.setState((s) => {
      s.ui = { theme: 'light', chordDisplayMode: 'roman' };
    });
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: '다크 모드로 전환' });
    expect(button).toBeInTheDocument();
  });

  it('클릭 시 toggleTheme이 호출되어 ui.theme이 토글된다', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = await screen.findByRole('button');

    await user.click(button);
    expect(useAppStore.getState().ui.theme).toBe('light');

    await user.click(button);
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });
});
