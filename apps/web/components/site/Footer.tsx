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
 *
 * GitHub 링크는 인라인 SVG 마크 — 외부 아이콘 라이브러리 의존 회피.
 * 사이즈·색은 mono 텍스트와 같은 14px 라인 위에 얹히도록 12px·ink-muted로 맞춤.
 */
const REPO_URL = 'https://github.com/SingeonKim/ehyo';

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
        <div className="flex items-baseline gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 저장소 (새 탭에서 열림)"
            title="View source on GitHub"
            className="inline-flex translate-y-[2px] items-center text-ink-muted/80 transition-colors hover:text-ink-primary focus-visible:text-ink-primary focus-visible:outline-none"
          >
            <GitHubMark />
          </a>
          <p className="tabular-nums">v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}

/*
 * GitHub Octocat 마크 — Octicons 공식 SVG path (16x16 viewBox).
 * fill="currentColor"로 부모의 text 색을 그대로 받아 hover 전이 자연스럽게.
 */
function GitHubMark() {
  return (
    <svg
      role="img"
      aria-hidden="true"
      focusable="false"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}
