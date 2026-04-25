'use client';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { useAppStore } from '@/lib/store/app-store';
import { SCALES } from '@/lib/theory/scales';
import type { ScaleKey } from '@/lib/theory/types';

/**
 * 카드별 1-click 스케일 적용 버튼.
 *
 * 왜 자동 적용이 아니라 명시 click인가:
 *   사용자가 의도적으로 다른 모드를 보고 있을 수 있음. 카드 시작 시
 *   자동으로 fretboard scale을 덮어쓰면 그 선택이 사라진다.
 *   "추천이 있다"는 정보 + "적용은 사용자 결정"의 분리.
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
