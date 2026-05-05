'use client';

import { useEffect } from 'react';

import { useAppStore } from '@/lib/store/app-store';

/*
 * 사이드이펙트 전용 컴포넌트 — store의 ui.theme 변화를 documentElement.dataset.theme에
 * 반영한다. 자체 마크업은 없다. RootLayout에 1회만 마운트하면 앱 전역 테마가 따라온다.
 *
 * color-scheme: globals.css의 html / html[data-theme="light"] selector가 CSS만으로
 * 처리하므로 여기서 colorScheme을 직접 설정하지 않는다.
 *
 * SSR/Hydration: 첫 클라이언트 렌더에서 useEffect가 실행되어 dataset.theme를 박는다.
 * FOUC 방지를 위해 RootLayout의 inline 스크립트(beforeInteractive)가 hydration *이전에*
 * 같은 속성을 미리 설정해 두므로 깜빡임 없음.
 */
export function ThemeSync() {
  const theme = useAppStore((s) => s.ui.theme);

  useEffect(() => {
    // dataset.theme만 설정. color-scheme은 globals.css의 html / html[data-theme="light"]
    // selector가 자동으로 처리하므로 여기서 별도 지정 불필요.
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
