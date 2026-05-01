'use client';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { useAppStore } from '@/lib/store/app-store';
import { SCALES } from '@/lib/theory/scales';
import type { ScaleKey } from '@/lib/theory/types';

/**
 * 카드별 1-click 스케일 적용 버튼.
 *
 * 정책: 재생 클릭 시 ProgressionPlayButton이 *동일한 첫 추천 스케일*을 자동 적용한다.
 *   이 버튼은 그 자동 적용을 *되돌리는* 용도로 남는다 — 사용자가 다른 스케일을 잠깐
 *   보다가 다시 카드 추천으로 돌아오고 싶을 때, 또는 재생을 시작하지 않고 지판만
 *   추천 스케일로 보고 싶을 때.
 *
 * 알 수 없는 scale 키(SCALES에 없음)는 미렌더 — 백엔드 데이터가
 * frontend SCALES와 어긋난 경우의 안전장치.
 */
interface Props {
  template: ProgressionTemplate;
}

// SCALES 객체에 등록된 키인지 런타임에서 확인해 타입을 좁히는 type guard.
// Object.prototype.hasOwnProperty를 직접 호출하는 이유:
//   template.recommended_scales는 백엔드에서 오는 string[]이므로
//   타입스크립트 레벨로만 ScaleKey인 척할 수 없다. 실제 SCALES 객체와
//   대조해야 런타임 안전성을 보장할 수 있다.
function isKnownScale(s: string): s is ScaleKey {
  return Object.prototype.hasOwnProperty.call(SCALES, s);
}

export function UseRecommendedScaleButton({ template }: Props) {
  // 스토어에서 setScale 액션만 구독 — 불필요한 리렌더 방지
  const setScale = useAppStore((s) => s.setScale);

  // 첫 번째 추천 스케일만 사용. 없거나 알 수 없는 키면 렌더 스킵.
  const recommended = template.recommended_scales[0];
  if (!recommended || !isKnownScale(recommended)) return null;

  return (
    <button
      type="button"
      onClick={() => setScale(recommended)}
      className="flex h-7 items-center border border-ink-muted/20 px-2 font-mono text-[0.65rem] uppercase tracking-wider text-ink-muted transition-colors duration-75 hover:border-accent-brass/40 hover:text-accent-brass"
    >
      Apply scale: {recommended.replace(/_/g, ' ')}
    </button>
  );
}
