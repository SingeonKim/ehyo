'use client';

/*
 * Global Error Boundary — Next.js App Router 컨벤션.
 *
 * `app/error.tsx`는 라우트 세그먼트의 모든 unexpected throw를 잡아 이 화면을 렌더.
 * 'use client' 필수 (Next.js requirement — error/reset 함수가 client 측에서 동작).
 *
 * production에서 error.message가 일반 사용자에게 노출되면 내부 정보가 새므로
 * 제목·설명은 정적 카피로만 노출하고, error.digest(서버 측 해시)만 보조 표기.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 향후 telemetry 연동 자리. 현재는 콘솔만 — Railway logs에 포착됨.
    console.error('[error.tsx]', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-8 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-signal">
        § error
      </p>
      <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] text-ink-primary md:text-7xl">
        뭔가 잘못됐습니다
      </h1>
      <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-ink-secondary">
        예기치 않은 오류가 발생했어요. 잠시 후 다시 시도하거나 새로고침해주세요.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[0.7rem] tabular-nums text-ink-muted">
          ref: {error.digest}
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="border border-accent-brass px-6 py-3 font-mono text-sm uppercase tracking-wider text-accent-brass transition-colors hover:bg-accent-brass hover:text-bg-base"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="border border-ink-secondary px-6 py-3 font-mono text-sm uppercase tracking-wider text-ink-secondary transition-colors hover:border-ink-primary hover:text-ink-primary"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
