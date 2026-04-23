import type { Metadata } from 'next';

/*
 * 지판 페이지 — Server Component (Phase 0 플레이스홀더).
 * Phase 2에서 `<FretboardClient />`를 추가. 인터랙션(Root 클릭, 스케일 변경)이 있으므로 Client.
 */

export const metadata: Metadata = {
  title: 'Fretboard',
  description: '선택한 Root와 스케일을 지판에 시각화. Root + 중요 노트 + 스케일 노트 3단계 강조.',
};

export default function FretboardPage() {
  return (
    <section className="py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
        Practice / Fretboard
      </p>
      <h1 className="mt-4 font-display text-5xl font-black leading-none tracking-tight md:text-7xl">
        Scales, visualized.
      </h1>

      <div className="mt-16 border border-ink-muted/20 p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Phase 2 — 구현 예정</p>
        <ul className="mt-4 space-y-1 font-mono text-sm text-ink-secondary">
          <li>· SVG 지판 렌더러 (22/24 프렛, 좌/우 손잡이)</li>
          <li>· Root · Scale 선택</li>
          <li>· 3단계 노트 마커 (Root / Important / Regular)</li>
          <li>· IMPORTANT_DEGREES 기본값 + 유저 토글</li>
          <li>· 라벨 모드: name / degree / none</li>
        </ul>
      </div>
    </section>
  );
}
