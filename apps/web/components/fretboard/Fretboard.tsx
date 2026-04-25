import type { AppropriateNotes } from '@/lib/theory/chord-voicing';
import { INLAY_POSITIONS, type GhostNote, type NoteMark, type OpenStringLabel } from '@/lib/theory/fretboard';
import type { FretSpacing, Handedness, LabelMode, PitchClass } from '@/lib/theory/types';

import { FretboardNote } from './FretboardNote';
import { OpenStringMarker } from './OpenStringMarker';

/*
 * 지판 전체 SVG 렌더러.
 *
 * 기하 규율:
 *   - 줄은 항상 위(string 1 = 고음) → 아래(string 6 = 저음)
 *   - 프렛 0(오픈)은 너트 왼쪽 (오른손잡이 기준). 왼손잡이는 좌우 뒤집어 그린다.
 *   - 프렛 간격: uniform(기본) 또는 equal-temperament(실기타 근사)
 *
 * 기하값은 fretWidth 기준으로 상대 계산되어, viewBox만 잘 잡으면
 * 컨테이너 크기에 따라 자동 스케일된다 (preserveAspectRatio).
 */

export interface FretboardProps {
  notes: readonly NoteMark[];
  /** 오픈 스트링 레이블 6개 — 스케일·라벨 모드 무관하게 항상 표시된다. */
  openStrings: readonly OpenStringLabel[];
  frets: 22 | 24;
  handedness: Handedness;
  fretSpacing: FretSpacing;
  labelMode: LabelMode;
  /** 지판 상단·하단 프렛 번호 표시 여부. 기본 true. */
  showFretNumbers?: boolean;
  className?: string;
  /**
   * 현재 코드 오버레이 (chord-root + chord-tone 분리).
   * undefined이면 overlay 레이어를 그리지 않는다.
   * root는 빨강 ring, tones는 파랑 ring으로 별도 SVG 레이어에 그린다.
   */
  appropriateNotes?: AppropriateNotes;
  /**
   * 현재 코드 심볼 문자열 (예: "I", "IV", "V7").
   * overlay SVG group의 key로 사용되어 chordSymbol이 바뀌면
   * group이 re-mount → CSS animation이 0%에서 재시작된다.
   */
  chordSymbol?: string | null;
  /**
   * 스케일 밖이지만 chord/color tone으로 표시할 위치 목록. FretboardSurface가
   * getGhostFretboardPositions로 산출해 prop으로 전달. undefined/빈 배열이면
   * ghost 레이어 미렌더.
   */
  ghostNotes?: readonly GhostNote[];
}

// ─── 기하 상수 ──────────────────────────────
const STRING_COUNT = 6;
const UNIFORM_FRET_WIDTH = 48;
const STRING_SPACING = 28;
const PAD_TOP = 20;
const PAD_BOTTOM = 30; // 프렛 번호 공간
const PAD_LEFT = 60; // 오픈 포지션 노트 공간
const PAD_RIGHT = 20;
const NUT_WIDTH = 6;
const INLAY_RADIUS = 4;

/**
 * 12평균율 근사 — 실제 기타에서 프렛은 뒤로 갈수록 좁아진다.
 * `totalLength`가 주어졌을 때 n번째 프렛의 x 위치 오프셋을 반환.
 * scaleLength 대비 n번째 프렛까지의 거리: L * (1 - 2^(-n/12))
 */
function equalTempFretOffset(fret: number, scaleLength: number): number {
  return scaleLength * (1 - Math.pow(2, -fret / 12));
}

/**
 * 각 프렛의 왼쪽 경계 x 좌표 배열을 계산 (오른손잡이 기준).
 * 인덱스 0은 프렛 0(너트 직후) 위치, 인덱스 n은 프렛 n 구간 시작.
 */
function computeFretLines(frets: number, fretSpacing: FretSpacing): number[] {
  const positions: number[] = [PAD_LEFT];
  if (fretSpacing === 'uniform') {
    for (let i = 1; i <= frets; i++) {
      positions.push(PAD_LEFT + i * UNIFORM_FRET_WIDTH);
    }
  } else {
    // equal-temperament — 전체 폭을 uniform 기준과 맞춰 계산
    const totalLength = frets * UNIFORM_FRET_WIDTH;
    for (let i = 1; i <= frets; i++) {
      positions.push(PAD_LEFT + equalTempFretOffset(i, totalLength));
    }
  }
  return positions;
}

// halo 반지름 — fretWidth 기준 고정 비율. tier별 노트 반지름(최대 0.23)보다 크게,
// tier와 무관하게 일정한 ring이 노트 원을 약간 감싸도록 설정.
const HALO_RADIUS_RATIO = 0.30;

export function Fretboard({
  notes,
  openStrings,
  frets,
  handedness,
  fretSpacing,
  labelMode,
  showFretNumbers = true,
  className,
  appropriateNotes,
  chordSymbol,
  ghostNotes,
}: FretboardProps) {
  const fretLines = computeFretLines(frets, fretSpacing);
  const lastFretX = fretLines[frets] ?? PAD_LEFT;
  const width = lastFretX + PAD_RIGHT;
  const height = PAD_TOP + (STRING_COUNT - 1) * STRING_SPACING + PAD_BOTTOM;

  // 왼손잡이는 x좌표를 미러링
  const mirrorX = (x: number): number => (handedness === 'left' ? width - x : x);

  // string 번호(1~6) → y 좌표 (1이 위, 6이 아래)
  const stringY = (stringNumber: number): number =>
    PAD_TOP + (stringNumber - 1) * STRING_SPACING;

  // 특정 프렛 "중앙" x (오픈은 너트와 PAD_LEFT 중간)
  const fretCenterX = (fret: number): number => {
    if (fret === 0) {
      return PAD_LEFT / 2 + NUT_WIDTH / 2;
    }
    const left = fretLines[fret - 1] ?? PAD_LEFT;
    const right = fretLines[fret] ?? PAD_LEFT;
    return (left + right) / 2;
  };

  // 프렛 폭(노트 반지름 계산용)
  const fretWidthAt = (fret: number): number => {
    if (fret === 0) return UNIFORM_FRET_WIDTH;
    const left = fretLines[fret - 1] ?? PAD_LEFT;
    const right = fretLines[fret] ?? PAD_LEFT;
    return Math.max(right - left, UNIFORM_FRET_WIDTH * 0.5);
  };

  // scale 안(notes) + 스케일 밖(ghostNotes) 모두에서 pitch class 매칭 위치를 합쳐 반환.
  // chord-root/chord-tone ring이 out-of-scale 위치(ghost marker 자리)에도 그려지도록.
  const ringPositions = (pc: PitchClass): Array<{ string: number; fret: number }> => {
    const inScale = notes
      .filter((n) => n.pitchClass === pc)
      .map((n) => ({ string: n.string, fret: n.fret }));
    const outOfScale = (ghostNotes ?? [])
      .filter((g) => g.pitchClass === pc)
      .map((g) => ({ string: g.string, fret: g.fret }));
    return [...inScale, ...outOfScale];
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Guitar fretboard scale visualization"
    >
      {/* ── 지판 배경 ───────────────── */}
      <rect
        x={PAD_LEFT}
        y={PAD_TOP - 4}
        width={lastFretX - PAD_LEFT}
        height={(STRING_COUNT - 1) * STRING_SPACING + 8}
        fill="var(--color-bg-elevated)"
        transform={handedness === 'left' ? `translate(${width}, 0) scale(-1, 1)` : undefined}
      />

      {/* ── 인레이 점 ──────────────── */}
      {INLAY_POSITIONS.filter((p) => p.fret <= frets).map((inlay) => {
        const cx = mirrorX(fretCenterX(inlay.fret));
        const cyMid = PAD_TOP + ((STRING_COUNT - 1) * STRING_SPACING) / 2;
        if (inlay.double) {
          return (
            <g key={inlay.fret} aria-hidden="true">
              <circle cx={cx} cy={cyMid - STRING_SPACING * 1.2} r={INLAY_RADIUS} fill="var(--color-ink-muted)" opacity={0.4} />
              <circle cx={cx} cy={cyMid + STRING_SPACING * 1.2} r={INLAY_RADIUS} fill="var(--color-ink-muted)" opacity={0.4} />
            </g>
          );
        }
        return (
          <circle
            key={inlay.fret}
            cx={cx}
            cy={cyMid}
            r={INLAY_RADIUS}
            fill="var(--color-ink-muted)"
            opacity={0.4}
            aria-hidden="true"
          />
        );
      })}

      {/* ── 프렛 선 ────────────────── */}
      {fretLines.slice(1).map((x, i) => (
        <line
          key={`fret-${i + 1}`}
          x1={mirrorX(x)}
          y1={stringY(1) - 4}
          x2={mirrorX(x)}
          y2={stringY(STRING_COUNT) + 4}
          stroke="var(--color-ink-muted)"
          strokeWidth={1}
          opacity={0.5}
          aria-hidden="true"
        />
      ))}

      {/* ── 너트 (0프렛 왼쪽) ─────── */}
      <rect
        x={mirrorX(PAD_LEFT) - (handedness === 'left' ? NUT_WIDTH : 0)}
        y={stringY(1) - 4}
        width={NUT_WIDTH}
        height={(STRING_COUNT - 1) * STRING_SPACING + 8}
        fill="var(--color-ink-primary)"
        aria-hidden="true"
      />

      {/* ── 줄 (1번 = 최상단) ────── */}
      {Array.from({ length: STRING_COUNT }, (_, i) => {
        const num = i + 1;
        // 굵기는 저음 줄로 갈수록 두껍게
        const strokeWidth = 1 + (num - 1) * 0.3;
        return (
          <line
            key={`string-${num}`}
            x1={mirrorX(PAD_LEFT)}
            y1={stringY(num)}
            x2={mirrorX(lastFretX)}
            y2={stringY(num)}
            stroke="var(--color-ink-secondary)"
            strokeWidth={strokeWidth}
            aria-hidden="true"
          />
        );
      })}

      {/* ── 프렛 번호 ──────────────── */}
      {showFretNumbers &&
        [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
          .filter((n) => n <= frets)
          .map((n) => (
            <text
              key={`num-${n}`}
              x={mirrorX(fretCenterX(n))}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--color-ink-muted)"
              aria-hidden="true"
            >
              {n}
            </text>
          ))}

      {/* ── 오픈 스트링 레이블 (fret 0) ─ 항상 6개, 스케일 무관 ── */}
      {openStrings.map((o) => (
        <OpenStringMarker
          key={`open-${o.string}`}
          cx={mirrorX(fretCenterX(0))}
          cy={stringY(o.string)}
          fretWidth={fretWidthAt(0)}
          noteName={o.noteName}
          stringNumber={o.string}
        />
      ))}

      {/* ── Ghost markers — Sprint 2-7 ─────────────────────
          out-of-scale 위치(스케일 밖이지만 chord/color tone에 포함된 음)에 그리는
          outline-only 점. chord-tone/color-tone ring이 그 위에 그려진다.
          스케일 음(notes)과 시각적으로 구분되도록 회색 + 0.35 opacity. */}
      {ghostNotes && ghostNotes.length > 0 && (
        <g
          data-overlay-tier="ghost"
          aria-hidden="true"
          opacity={0.22}
        >
          {ghostNotes.map((g) => (
            <circle
              key={`ghost-${g.string}-${g.fret}`}
              cx={mirrorX(fretCenterX(g.fret))}
              cy={stringY(g.string)}
              r={UNIFORM_FRET_WIDTH * 0.19}
              fill="none"
              stroke="var(--color-fretboard-ghost)"
              strokeWidth={1}
            />
          ))}
        </g>
      )}

      {/* ── 색채음 layer — Sprint 2-7 ────────────────────
          chord-overlay와 분리해 pulse 애니메이션 없음(정지). 같은 파랑 색이지만
          stroke 1.5px + opacity 0.45로 코드톤(2px, 1.0)과 위계 분리. */}
      {appropriateNotes && appropriateNotes.colorTones.size > 0 && (
        <g
          data-overlay-tier="color-tone"
          aria-hidden="true"
          opacity={0.38}
        >
          {[...appropriateNotes.colorTones].flatMap((pc) =>
            ringPositions(pc).map((p) => (
              <circle
                key={`overlay-color-${pc}-${p.string}-${p.fret}`}
                cx={mirrorX(fretCenterX(p.fret))}
                cy={stringY(p.string)}
                r={UNIFORM_FRET_WIDTH * HALO_RADIUS_RATIO}
                fill="none"
                stroke="var(--color-chord-overlay-tone)"
                strokeWidth={1.5}
              />
            )),
          )}
        </g>
      )}

      {/* ── 코드 오버레이 — chord-root + chord-tone 두 layer ───────────
          노트 마커보다 먼저(아래 레이어)에 그려서 노트 원이 위에 남는다.
          chord-root는 빨강 ring(stroke 2.5), chord-tone은 파랑 ring(stroke 2). */}
      {appropriateNotes && (appropriateNotes.chordRoot !== null || appropriateNotes.chordTones.size > 0) && (
        <g
          key={chordSymbol ?? 'idle-chord'}
          className="chord-overlay"
          aria-hidden="true"
        >
          {appropriateNotes.chordRoot !== null && (
            <g data-overlay-tier="chord-root">
              {ringPositions(appropriateNotes.chordRoot).map((p) => (
                <circle
                  key={`overlay-root-${p.string}-${p.fret}`}
                  cx={mirrorX(fretCenterX(p.fret))}
                  cy={stringY(p.string)}
                  r={UNIFORM_FRET_WIDTH * HALO_RADIUS_RATIO}
                  fill="none"
                  stroke="var(--color-chord-overlay-root)"
                  strokeWidth={2.5}
                />
              ))}
            </g>
          )}
          {appropriateNotes.chordTones.size > 0 && (
            <g data-overlay-tier="chord-tone">
              {[...appropriateNotes.chordTones].flatMap((pc) =>
                ringPositions(pc).map((p) => (
                  <circle
                    key={`overlay-tone-${pc}-${p.string}-${p.fret}`}
                    cx={mirrorX(fretCenterX(p.fret))}
                    cy={stringY(p.string)}
                    r={UNIFORM_FRET_WIDTH * HALO_RADIUS_RATIO}
                    fill="none"
                    stroke="var(--color-chord-overlay-tone)"
                    strokeWidth={2}
                  />
                )),
              )}
            </g>
          )}
        </g>
      )}

      {/* ── 노트 마커 (fret 1+) ─────── */}
      {notes.map((n) => (
        <FretboardNote
          key={`${n.string}-${n.fret}`}
          cx={mirrorX(fretCenterX(n.fret))}
          cy={stringY(n.string)}
          fretWidth={fretWidthAt(n.fret)}
          tier={n.tier}
          noteName={n.noteName}
          degree={n.degree}
          labelMode={labelMode}
          stringNumber={n.string}
          fret={n.fret}
          isChordTone={
            appropriateNotes
              ? n.pitchClass === appropriateNotes.chordRoot ||
                appropriateNotes.chordTones.has(n.pitchClass) ||
                appropriateNotes.colorTones.has(n.pitchClass)
              : false
          }
        />
      ))}
    </svg>
  );
}
