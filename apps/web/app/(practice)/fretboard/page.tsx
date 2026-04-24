import type { Metadata } from 'next';

import { FretboardClient } from '@/components/fretboard/FretboardClient';

/*
 * 지판 페이지 — Server Component. 정적 쉘(메타·헤더)만 담당하고 실제 인터랙션은
 * FretboardClient가 맡는다. 서버 렌더링의 SEO 이점을 유지하면서 AudioContext
 * 같은 브라우저 API에 접근하지 않는 경계를 명확히 한다.
 */

export const metadata: Metadata = {
  title: 'Fretboard',
  description: '선택한 Root와 스케일을 지판에 시각화. Root + 중요 노트 + 스케일 노트 3단계 강조.',
};

export default function FretboardPage() {
  return (
    <section className="py-8">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          Practice / Fretboard
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
          Scales, <span className="text-accent-brass">visualized.</span>
        </h1>
      </header>

      <FretboardClient />
    </section>
  );
}
