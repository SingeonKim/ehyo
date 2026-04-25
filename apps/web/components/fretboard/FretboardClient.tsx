'use client';

import { FretboardControls } from './FretboardControls';
import { FretboardSurface } from './FretboardSurface';

/*
 * 지판 전체 화면 — Surface(SVG) + Controls(컨트롤 그리드)를 함께 마운트.
 *
 * /fretboard 페이지에서 단일 컴포넌트로 사용. /jam 페이지는 sticky 분리를 위해
 * FretboardSurface와 FretboardControls를 직접 임포트해 page level에서 배치한다.
 *
 * 상태 구독·hydration gate·코드 오버레이 계산은 모두 Surface/Controls 각자가 담당.
 * 이 컴포넌트는 단순 wrapper.
 */

export function FretboardClient() {
  return (
    <div className="space-y-8">
      <FretboardSurface />
      <FretboardControls />
    </div>
  );
}
