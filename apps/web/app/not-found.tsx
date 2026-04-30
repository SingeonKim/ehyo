import Link from 'next/link';

/*
 * 404 페이지 — Next.js App Router 컨벤션. URL이 라우트와 매칭되지 않으면 자동으로 렌더.
 * Server Component. 토널리티는 메인 랜딩과 동일(에디토리얼 모노 + 브라스 강조).
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-8 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-signal">
        § 404 not found
      </p>
      <h1 className="mt-4 font-display text-6xl font-black leading-[0.95] text-ink-primary md:text-8xl">
        길을 잃었습니다
      </h1>
      <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-ink-secondary">
        요청한 페이지를 찾을 수 없어요. 메뉴에서 다시 출발해보세요.
      </p>
      <nav aria-label="대체 경로" className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/"
          className="border border-accent-brass px-6 py-3 font-mono text-sm uppercase tracking-wider text-accent-brass transition-colors hover:bg-accent-brass hover:text-bg-base"
        >
          홈으로 →
        </Link>
        <Link
          href="/jam"
          className="border border-ink-secondary px-6 py-3 font-mono text-sm uppercase tracking-wider text-ink-secondary transition-colors hover:border-ink-primary hover:text-ink-primary"
        >
          Practice
        </Link>
      </nav>
    </main>
  );
}
