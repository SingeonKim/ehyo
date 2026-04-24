'use client';

import { clsx } from 'clsx';

/*
 * 메트로놈 진자 — 사이트 아이덴티티 요소 (planning.md §5.1).
 *
 * 동작:
 *   한 사이클(좌→우→좌) = 2 beats. BPM에 따라 period 동적 계산.
 *   isPlaying=false면 정지(중앙 0deg).
 *
 * 모션 접근성:
 *   prefers-reduced-motion: reduce 시 애니메이션 비활성, 중앙 정지 상태 유지.
 *   대체로는 BeatLED의 점등이 박자를 시각화한다.
 */

interface PendulumProps {
  bpm: number;
  isPlaying: boolean;
  className?: string;
}

export function Pendulum({ bpm, isPlaying, className }: PendulumProps) {
  // 2 beats = 한 사이클. 60/bpm × 2 = 주기(sec).
  const periodSec = (60 / Math.max(1, bpm)) * 2;

  return (
    <svg
      viewBox="0 0 120 160"
      role="img"
      aria-label={isPlaying ? `메트로놈 진자 (${bpm} BPM)` : '메트로놈 정지'}
      className={clsx('h-auto', className)}
    >
      <defs>
        <style>{`
          .pendulum-arm {
            transform-origin: 60px 20px;
            animation-name: pendulum-swing;
            animation-iteration-count: infinite;
            animation-timing-function: cubic-bezier(0.45, 0.05, 0.55, 0.95);
          }
          @keyframes pendulum-swing {
            0%   { transform: rotate(-18deg); }
            50%  { transform: rotate(18deg); }
            100% { transform: rotate(-18deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .pendulum-arm {
              animation: none !important;
              transform: rotate(0deg) !important;
            }
          }
        `}</style>
      </defs>

      {/* 베이스 */}
      <rect
        x="20"
        y="150"
        width="80"
        height="6"
        fill="var(--color-ink-muted)"
        opacity={0.4}
      />

      {/* 피봇 */}
      <circle cx="60" cy="20" r="3" fill="var(--color-accent-brass)" />

      {/* 진자 팔 + 봅(bob) */}
      <g
        className="pendulum-arm"
        style={
          isPlaying
            ? { animationDuration: `${periodSec}s`, animationPlayState: 'running' }
            : { animationPlayState: 'paused' }
        }
      >
        <line
          x1="60"
          y1="20"
          x2="60"
          y2="120"
          stroke="var(--color-ink-secondary)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle
          cx="60"
          cy="130"
          r="9"
          fill="var(--color-accent-brass)"
          stroke="var(--color-accent-copper)"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}
