/**
 * 카테고리 rhythm + variant → swing ratio.
 *
 * 결정론·O(1). 미정의 케이스는 모두 0.5(straight)로 폴백 — 호출자가 swing 없는
 * 카테고리에 대해 별도 분기를 안 해도 되도록.
 */

import type { CategoryRhythm } from './patterns/types';

export function resolveSwing(rhythm: CategoryRhythm, variant: string | undefined): number {
  const sw = rhythm.swing;
  if (!sw) return 0.5;
  if (variant && sw.perVariant && sw.perVariant[variant] !== undefined) {
    return sw.perVariant[variant];
  }
  return sw.default;
}
