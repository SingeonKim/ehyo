'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useState } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';
import { getAudioContext } from '@/lib/audio/context';
import { subscribeToBeats, toggleMetronome } from '@/lib/audio/metronome-singleton';
import type { SchedulerEvent } from '@/lib/audio/types';

import { BeatLED } from './BeatLED';
import { Pendulum } from './Pendulum';

/*
 * 메트로놈 클라이언트.
 *
 * 주요 책임:
 *   1. 싱글턴 스케줄러를 구독해 beat LED 동기화
 *   2. 컨트롤 (BPM/TS/Subdiv/Sound/Volume/Accent/Tap) 렌더
 *   3. 키보드 단축키 (Space, ↑/↓, Shift+↑/↓, T)
 *
 * 스케줄러 lifecycle은 lib/audio/metronome-singleton.ts가 책임 — 라우트
 * 이동(unmount)에도 오디오 계속 재생.
 */

/* 음표 유니코드 기호(♩♫)는 이모지 UI 요소에 해당 — 금지 목록.
   약어 텍스트 레이블로 대체. 악기 패널의 실크스크린 레이블 감각. */
const SUBDIVISIONS = [
  { value: 'quarter', label: '1/4' },
  { value: 'eighth', label: '1/8' },
  { value: 'triplet', label: '3' },
  { value: 'sixteenth', label: '1/16' },
  { value: 'swing', label: 'Swg' },
] as const;

const SOUND_TYPES = [
  { value: 'click', label: 'Click' },
  { value: 'wood', label: 'Wood' },
  { value: 'cowbell', label: 'Cowbell' },
  { value: 'digital', label: 'Digital' },
  { value: 'rim', label: 'Rim' },
] as const;

const DENOMINATORS = [2, 4, 8] as const;

export function MetronomeClient() {
  const hydrated = useHasHydrated();
  const m = useAppStore((s) => s.metronome);
  const setBpm = useAppStore((s) => s.setBpm);
  const setTimeSignature = useAppStore((s) => s.setTimeSignature);
  const setSubdivision = useAppStore((s) => s.setSubdivision);
  const toggleAccentBeatOne = useAppStore((s) => s.toggleAccentBeatOne);
  const setSoundType = useAppStore((s) => s.setSoundType);
  const setVolume = useAppStore((s) => s.setVolume);
  const tap = useAppStore((s) => s.tap);

  const [currentBeat, setCurrentBeat] = useState(0);

  // 싱글턴 스케줄러의 이벤트 구독 — 마운트 중에만 beat LED 동기화.
  // unmount 시 구독 해제되지만 스케줄러 자체는 계속 실행.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = subscribeToBeats((e: SchedulerEvent) => {
      if (e.type === 'sub') return;
      const ctx = getAudioContext();
      const delayMs = Math.max(0, (e.time - ctx.currentTime) * 1000);
      window.setTimeout(() => setCurrentBeat(e.beat), delayMs);
    });
    return unsub;
  }, []);

  // isPlaying이 false이면 LED 끄기 (다른 페이지/Dock에서 정지했을 수 있음)
  useEffect(() => {
    if (!m.isPlaying) setCurrentBeat(0);
  }, [m.isPlaying]);

  // Play 토글 — 싱글턴이 스토어·스케줄러 동기화까지 처리
  const handleToggle = useCallback(async () => {
    await toggleMetronome();
  }, []);

  // 키보드 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      // /jam 등 공유 뷰에서 다른 버튼에 포커스가 있을 때 Space는 해당 버튼 click으로
      // 브라우저가 처리하게 둬야 한다. BUTTON·A·SELECT에 포커스가 있으면 Space/Arrow 통과.
      const isFocusedInteractive =
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'SELECT' ||
          (target as HTMLElement).getAttribute('role') === 'radio');
      if (isFocusedInteractive) return;

      if (e.code === 'Space') {
        e.preventDefault();
        void handleToggle();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setBpm(m.bpm + (e.shiftKey ? 10 : 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setBpm(m.bpm - (e.shiftKey ? 10 : 1));
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        tap();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [m.bpm, setBpm, tap, handleToggle]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[500px] items-center justify-center border border-ink-muted/20 bg-bg-elevated">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Loading saved settings…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ── 히어로: 진자 + BPM + LED ─────────────── */}
      <section className="grid items-center gap-8 border border-ink-muted/20 bg-bg-elevated p-8 md:grid-cols-[160px_1fr_auto]">
        <Pendulum bpm={m.bpm} isPlaying={m.isPlaying} className="w-32 self-center justify-self-center md:justify-self-start" />

        <div className="text-center md:text-left">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-ink-muted">
            Beats per minute
          </p>
          {/* BPM 히어로: --text-hero 토큰 사용, -0.04em 자간 규정 준수 */}
          <p className="font-display text-hero font-black leading-none tracking-[-0.04em] tabular-nums text-ink-primary">
            {m.bpm}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 md:items-end">
          <BeatLED
            numerator={m.timeSignature.numerator}
            currentBeat={m.isPlaying ? currentBeat : 0}
            accentBeatOne={m.accentBeatOne}
          />
          <button
            type="button"
            onClick={() => void handleToggle()}
            className={clsx(
              'border-2 px-8 py-3 font-mono text-sm uppercase tracking-widest transition-colors duration-75',
              m.isPlaying
                ? 'border-accent-signal bg-accent-signal text-bg-base hover:bg-accent-signal/80'
                : 'border-accent-brass text-accent-brass hover:bg-accent-brass hover:text-bg-base',
            )}
            aria-label={m.isPlaying ? '정지 (Space)' : '재생 (Space)'}
          >
            {m.isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
      </section>

      {/* ── 컨트롤 그리드 ────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <BpmControl bpm={m.bpm} onBpmChange={setBpm} onTap={tap} />
          <TimeSignatureControl
            value={m.timeSignature}
            onChange={setTimeSignature}
          />
        </div>
        <div className="space-y-6">
          <SegmentedField
            label="Subdivision"
            value={m.subdivision}
            options={SUBDIVISIONS}
            onChange={setSubdivision}
          />
          <SegmentedField
            label="Sound"
            value={m.soundType}
            options={SOUND_TYPES}
            onChange={setSoundType}
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <VolumeControl volume={m.volume} onChange={setVolume} />
            <AccentToggle value={m.accentBeatOne} onToggle={toggleAccentBeatOne} />
          </div>
        </div>
      </div>

      {/* ── 단축키 힌트 ──────────────────────────── */}
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-ink-muted">
        Keys · Space: play/stop · ↑↓: ±1 bpm · Shift+↑↓: ±10 · T: tap
      </p>
    </div>
  );
}

// ─── 서브 컴포넌트 ─────────────────────────────

function BpmControl({
  bpm,
  onBpmChange,
  onTap,
}: {
  bpm: number;
  onBpmChange: (n: number) => void;
  onTap: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block font-mono text-xs uppercase tracking-widest text-ink-muted">
        BPM
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onBpmChange(bpm - 10)}
          className="border border-ink-muted/30 px-2 py-2 font-mono text-xs text-ink-secondary hover:border-ink-secondary hover:text-ink-primary"
          aria-label="BPM -10"
        >
          −10
        </button>
        <button
          type="button"
          onClick={() => onBpmChange(bpm - 1)}
          className="border border-ink-muted/30 px-2 py-2 font-mono text-xs text-ink-secondary hover:border-ink-secondary hover:text-ink-primary"
          aria-label="BPM -1"
        >
          −1
        </button>
        <input
          type="range"
          min={20}
          max={300}
          step={1}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="flex-1 accent-accent-brass"
          aria-label="BPM 슬라이더 (20~300)"
        />
        <button
          type="button"
          onClick={() => onBpmChange(bpm + 1)}
          className="border border-ink-muted/30 px-2 py-2 font-mono text-xs text-ink-secondary hover:border-ink-secondary hover:text-ink-primary"
          aria-label="BPM +1"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => onBpmChange(bpm + 10)}
          className="border border-ink-muted/30 px-2 py-2 font-mono text-xs text-ink-secondary hover:border-ink-secondary hover:text-ink-primary"
          aria-label="BPM +10"
        >
          +10
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-20 border border-ink-muted/30 bg-bg-elevated px-2 py-1 font-mono text-sm tabular-nums text-ink-primary"
          aria-label="BPM 입력"
        />
        <button
          type="button"
          onClick={onTap}
          className="flex-1 border border-accent-brass px-4 py-2 font-mono text-xs uppercase tracking-widest text-accent-brass transition-colors duration-75 hover:bg-accent-brass hover:text-bg-base"
          aria-label="Tap tempo (T)"
        >
          Tap Tempo
        </button>
      </div>
    </div>
  );
}

function TimeSignatureControl({
  value,
  onChange,
}: {
  value: { numerator: number; denominator: 2 | 4 | 8 };
  onChange: (ts: { numerator: number; denominator: 2 | 4 | 8 }) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block font-mono text-xs uppercase tracking-widest text-ink-muted">
        Time Signature
      </label>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={16}
            value={value.numerator}
            onChange={(e) =>
              onChange({ ...value, numerator: Math.max(1, Math.min(16, Number(e.target.value))) })
            }
            className="w-14 border border-ink-muted/30 bg-bg-elevated px-2 py-1 text-center font-mono text-sm tabular-nums text-ink-primary"
            aria-label="Time signature numerator"
          />
          <span className="font-mono text-ink-muted">/</span>
          <div
            role="radiogroup"
            aria-label="Time signature denominator"
            className="flex gap-px overflow-hidden rounded-sm border border-ink-muted/20"
          >
            {DENOMINATORS.map((d) => {
              const active = d === value.denominator;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ ...value, denominator: d })}
                  className={clsx(
                    'min-w-8 px-2 py-1 font-mono text-xs',
                    'border-r border-ink-muted/10 last:border-r-0',
                    active
                      ? 'bg-accent-brass text-bg-base'
                      : 'bg-bg-elevated text-ink-secondary hover:text-ink-primary',
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block font-mono text-xs uppercase tracking-widest text-ink-muted">
        {label}
      </label>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-px overflow-hidden rounded-sm border border-ink-muted/20"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={clsx(
                'min-w-0 flex-1 truncate whitespace-nowrap px-2 py-2 font-mono text-xs transition-colors duration-75',
                'border-r border-ink-muted/10 last:border-r-0',
                active
                  ? 'bg-accent-brass text-bg-base'
                  : 'bg-bg-elevated text-ink-secondary hover:bg-bg-raised hover:text-ink-primary',
              )}
              title={opt.label}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VolumeControl({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block font-mono text-xs uppercase tracking-widest text-ink-muted">
        Volume <span className="tabular-nums text-ink-secondary">{Math.round(volume * 100)}%</span>
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent-brass"
        aria-label="볼륨"
      />
    </div>
  );
}

function AccentToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={value ? '1번 박 억양 강조 켜짐' : '1번 박 억양 강조 꺼짐'}
      onClick={onToggle}
      className={clsx(
        'border px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors duration-75',
        value
          ? 'border-accent-signal bg-accent-signal/15 text-accent-signal'
          : 'border-ink-muted/30 text-ink-secondary hover:border-ink-secondary hover:text-ink-primary',
      )}
    >
      Accent 1
    </button>
  );
}

