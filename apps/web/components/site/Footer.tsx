/*
 * 전역 푸터 — Server Component.
 *
 * 디자인 톤: Analog × Editorial.
 *   - 큰 grid·소셜 아이콘·중앙 정렬 SaaS 푸터 패턴 의도적으로 회피.
 *   - mono 텍스트 한 줄 + 가는 상단 보더로 페이지 끝 표시.
 *
 * 연도는 정적 문자열 — 빌드 타임 prerender이라 new Date()를 쓰면
 * 빌드 시점에 박혀 다음 해에 수동 갱신 필요. 어차피 매년 갱신해야 하니
 * 런타임 다이내믹화는 가치가 낮다.
 */
export function Footer() {
  return (
    <footer className="border-t border-ink-muted/15">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 font-mono text-xs text-ink-muted sm:flex-row sm:items-baseline sm:justify-between">
        <p>
          © 2026 에휴.. (Ehyo..) ·{' '}
          <span className="text-ink-secondary">기타 연습 자극 및 스케일 연습 도구</span>
          {' · '}
          <span className="text-ink-muted/80">PC 환경에 최적화</span>
        </p>
        <p className="tabular-nums">v0.1.0</p>
      </div>
    </footer>
  );
}
