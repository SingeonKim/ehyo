'use client';

import { Moon, Sun } from 'lucide-react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';

/*
 * 헤더 우측에 마운트되는 32x32 아이콘 버튼.
 *
 * 컨벤션: 현재가 아닌 *전환 후* 상태를 보여준다.
 *   - 다크 모드 활성 → ☀ Sun 아이콘 ("누르면 라이트로 간다")
 *   - 라이트 모드 활성 → ☾ Moon 아이콘
 *
 * SSR mismatch 회피: useHasHydrated가 false인 첫 렌더에선 sun으로 고정.
 * 다크가 기본값이라 첫 렌더 = 다크 가정 = sun으로 일치.
 */
export function ThemeToggle() {
  const hydrated = useHasHydrated();
  const theme = useAppStore((s) => s.ui.theme);
  const toggle = useAppStore((s) => s.toggleTheme);

  const isLight = hydrated && theme === 'light';
  const Icon = isLight ? Moon : Sun;
  const nextLabel = isLight ? '다크 모드' : '라이트 모드';

  return (
    <button
      type="button"
      onClick={() => toggle()}
      aria-label={`${nextLabel}로 전환`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-ink-muted/20 text-ink-secondary transition-colors hover:border-accent-brass hover:text-accent-brass"
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
