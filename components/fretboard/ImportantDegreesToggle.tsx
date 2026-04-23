'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import {
  IMPORTANT_DEGREES,
  getScaleDegreeLabels,
  resolveImportantDegrees,
} from '@/lib/theory/scales';

/*
 * 중요 노트 도수 토글.
 *
 * 현재 스케일의 모든 도수를 pill로 나열. 기본 강조 도수는 활성 상태로 시작.
 * 클릭하면 개별 토글. 유저 오버라이드는 store의 importantDegreesByScale에 저장.
 *
 * Root(0)는 항상 강조되므로 토글 불가능 (고정 표시).
 */

export function ImportantDegreesToggle() {
  const scale = useAppStore((s) => s.fretboard.scale);
  const override = useAppStore((s) => s.fretboard.importantDegreesByScale[scale]);
  const toggle = useAppStore((s) => s.toggleImportantDegree);

  const allDegrees = getScaleDegreeLabels(scale);
  const applied = new Set(resolveImportantDegrees(scale, override));
  const defaultSet = new Set(IMPORTANT_DEGREES[scale]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Important Degrees
        </label>
        <span className="font-mono text-[0.65rem] text-ink-muted">
          클릭으로 개별 강조 토글
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allDegrees.map(({ semitones, label }) => {
          const isRoot = semitones === 0;
          const isApplied = applied.has(semitones);
          const isDefault = defaultSet.has(semitones);

          const titleText = isRoot
            ? 'Root는 항상 강조됩니다'
            : isDefault
              ? `기본 강조 도수 (${label})`
              : `추가 강조 (${label})`;

          return (
            <button
              key={semitones}
              type="button"
              aria-pressed={isApplied}
              // aria-label 대신 title만 — title은 hover 툴팁으로만 작동하고
              // accessible name은 버튼 내부 텍스트(도수 레이블)가 되어
              // 스크린리더가 "5 pressed" 식으로 읽어 간결하다.
              title={titleText}
              aria-label={`Degree ${label}${isDefault ? ' — default important' : ''}`}
              disabled={isRoot}
              onClick={() => toggle(scale, semitones)}
              className={clsx(
                'min-w-10 border px-2.5 py-1 text-center font-mono text-xs transition-colors duration-75',
                isRoot && 'cursor-default border-scale-root bg-scale-root/20 text-scale-root',
                !isRoot && isApplied && 'border-scale-important bg-scale-important/20 text-scale-important',
                !isRoot && !isApplied && 'border-ink-muted/30 text-ink-muted hover:border-ink-secondary hover:text-ink-secondary',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
