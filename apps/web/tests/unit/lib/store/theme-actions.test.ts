/**
 * setTheme / toggleTheme 액션 단위 테스트.
 * persist 미들웨어를 거치지 않고 store 액션만 직접 검증.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '@/lib/store/app-store';

describe('UI theme actions', () => {
  beforeEach(() => {
    // 각 테스트마다 store를 초기 상태로 리셋.
    // ui 슬라이스 전체를 리셋하는 이유 — store는 module-level 싱글턴이라
    // 다른 테스트가 chordDisplayMode 등을 바꿔둔 잔재가 남을 수 있다.
    useAppStore.setState((s) => {
      s.ui = { theme: 'dark', chordDisplayMode: 'roman' };
    });
  });

  it('초기값은 dark', () => {
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });

  it('setTheme("light") 호출 시 ui.theme === "light"', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().ui.theme).toBe('light');
  });

  it('setTheme("dark") 호출 시 ui.theme === "dark"', () => {
    useAppStore.getState().setTheme('light');
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });

  it('toggleTheme() 한 번: dark → light', () => {
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().ui.theme).toBe('light');
  });

  it('toggleTheme() 두 번: dark → light → dark', () => {
    useAppStore.getState().toggleTheme();
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().ui.theme).toBe('dark');
  });
});
