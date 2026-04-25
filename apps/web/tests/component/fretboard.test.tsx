import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Fretboard } from '@/components/fretboard/Fretboard';
import { FretboardClient } from '@/components/fretboard/FretboardClient';
import { useAppStore } from '@/lib/store/app-store';
import type { AppropriateNotes } from '@/lib/theory/chord-voicing';
import { getFretboardNotes, getOpenStringLabels, STANDARD_TUNING } from '@/lib/theory/fretboard';

/*
 * 지판 Client의 인터랙션을 jsdom 환경에서 검증.
 * 실브라우저 E2E는 Docker에서 playwright가 담당(docker-compose.test.yml).
 * 여기서는 DOM 쿼리 + userEvent로 "클릭 → 상태 변화 → 렌더 변화"를 커버.
 *
 * useHasHydrated는 useEffect로 동작하므로 첫 렌더 후 flush가 필요하다.
 * Testing Library의 findBy*가 await 안에서 자동으로 처리해준다.
 */

afterEach(() => {
  cleanup();
  // 각 테스트 사이 스토어 초기화 — 다른 테스트의 Root 선택 등이 누수되지 않게
  useAppStore.setState({
    fretboard: {
      root: 0,
      scale: 'major',
      highlightsByScale: {},
      labelMode: 'name',
      handedness: 'right',
      frets: 22,
      fretSpacing: 'uniform',
      accidentalMode: 'auto',
    },
  });
});

describe('FretboardClient', () => {
  it('hydration 후 SVG 지판이 렌더된다', async () => {
    render(<FretboardClient />);
    const svg = await screen.findByRole('img', { name: /Guitar fretboard/i });
    expect(svg).toBeInTheDocument();
  });

  it('기본 Root=C는 라디오에서 aria-checked=true', async () => {
    render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });
    const cButton = screen.getByRole('radio', { name: 'C' });
    expect(cButton).toHaveAttribute('aria-checked', 'true');
  });

  it('Root G 클릭 → G가 선택되고 C는 해제된다', async () => {
    const user = userEvent.setup();
    render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });

    const gButton = screen.getByRole('radio', { name: 'G' });
    await user.click(gButton);

    expect(gButton).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveAttribute('aria-checked', 'false');
    expect(useAppStore.getState().fretboard.root).toBe(7);
  });

  it('스케일 Minor Pentatonic → 노트 수가 Major보다 적다', async () => {
    const user = userEvent.setup();
    const { container } = render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });

    // 초기 Major 상태 노트 수 기록 (circle 중 inlay는 aria-hidden이라 실제 노트 마커는
    // <g>로 감싸진 circle. 단순하게 모든 circle을 세고 비교)
    const majorCircles = container.querySelectorAll('svg circle').length;

    await user.click(screen.getByRole('radio', { name: 'Minor Pentatonic' }));

    const pentaCircles = container.querySelectorAll('svg circle').length;
    expect(pentaCircles).toBeLessThan(majorCircles);
  });

  it('라벨 모드 Hide → SVG 내 노트 텍스트가 줄어든다', async () => {
    const user = userEvent.setup();
    const { container } = render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });

    const textsBefore = container.querySelectorAll('svg text').length;
    expect(textsBefore).toBeGreaterThan(0);

    await user.click(screen.getByRole('radio', { name: 'Hide' }));

    const textsAfter = container.querySelectorAll('svg text').length;
    // 프렛 번호는 남고 노트 라벨만 사라짐 → 줄어들어야 함
    expect(textsAfter).toBeLessThan(textsBefore);
  });

  it('강조 색 사이클 — Major의 orange 5도(semi 7)를 클릭하면 green으로 전환', async () => {
    const user = userEvent.setup();
    render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });

    // Major 기본(I-IV-V): { 5: orange, 7: orange }. "Degree 5" pill은 semi 7.
    // 클릭 시 orange → green 사이클.
    const fifthPill = screen.getByRole('button', { name: /Degree 5 — orange/ });
    await user.click(fifthPill);

    const override = useAppStore.getState().fretboard.highlightsByScale.major;
    expect(override).toBeDefined();
    expect(override?.[7]).toBe('green');
    // 다른 기본 강조(4도 = semi 5)는 유지
    expect(override?.[5]).toBe('orange');
  });

  it('손잡이 Left 선택 → store handedness=left', async () => {
    const user = userEvent.setup();
    render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });

    await user.click(screen.getByRole('radio', { name: 'Left' }));
    expect(useAppStore.getState().fretboard.handedness).toBe('left');
  });
});

// ── Fretboard 컴포넌트 직접 렌더링 테스트 ──────────────────────────────
// FretboardClient를 통하지 않고 Fretboard에 props를 직접 주입해 halo 동작 검증.

/*
 * C major 스케일(root=0, scale='major') 기준 baseProps.
 * PC 0=C, 4=E, 7=G — C major 코드 3개 음.
 * 22프렛 × 6줄이므로 해당 PC는 지판 전역에 다수 등장한다.
 */
const MAJOR_SCALE_HIGHLIGHTS = { 5: 'orange', 7: 'orange' } as const;
const baseFretboardProps = {
  notes: getFretboardNotes({
    tuning: STANDARD_TUNING,
    frets: 22,
    root: 0,
    scale: 'major',
    highlights: MAJOR_SCALE_HIGHLIGHTS,
    useFlats: false,
  }),
  openStrings: getOpenStringLabels(STANDARD_TUNING, false),
  frets: 22 as const,
  handedness: 'right' as const,
  fretSpacing: 'uniform' as const,
  labelMode: 'name' as const,
};

describe('Fretboard chord overlay layers', () => {
  it('chordOverlay=undefined → overlay group 미존재', () => {
    const { container } = render(<Fretboard {...baseFretboardProps} />);
    expect(container.querySelector('.chord-overlay')).toBeNull();
  });

  it('chordOverlay 있음 → root + tone group 모두 렌더', () => {
    const overlay: AppropriateNotes = { chordRoot: 0, chordTones: new Set([4, 7]), colorTones: new Set() };
    const { container } = render(
      <Fretboard {...baseFretboardProps} appropriateNotes={overlay} chordSymbol="I" />
    );
    const overlayGroup = container.querySelector('.chord-overlay');
    expect(overlayGroup).not.toBeNull();
    expect(overlayGroup?.querySelector('[data-overlay-tier="chord-root"]')).not.toBeNull();
    expect(overlayGroup?.querySelector('[data-overlay-tier="chord-tone"]')).not.toBeNull();
  });

  it('chord-root layer는 root pc인 노트 위치에만', () => {
    const overlay: AppropriateNotes = { chordRoot: 0, chordTones: new Set(), colorTones: new Set() };
    const { container } = render(
      <Fretboard {...baseFretboardProps} appropriateNotes={overlay} chordSymbol="I" />
    );
    const rootCircles = container.querySelectorAll(
      '[data-overlay-tier="chord-root"] circle',
    );
    const expected = baseFretboardProps.notes.filter((n) => n.pitchClass === 0).length;
    expect(rootCircles.length).toBe(expected);
  });

  it('aria-hidden=true (장식 레이어)', () => {
    const overlay: AppropriateNotes = { chordRoot: 0, chordTones: new Set([4, 7]), colorTones: new Set() };
    const { container } = render(
      <Fretboard {...baseFretboardProps} appropriateNotes={overlay} chordSymbol="I" />
    );
    expect(container.querySelector('.chord-overlay')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Fretboard color-tone and ghost markers', () => {
  it('colorTones 비어있으면 color-tone group 미렌더', () => {
    const overlay: AppropriateNotes = {
      chordRoot: 0,
      chordTones: new Set([4, 7]),
      colorTones: new Set(),
    };
    const { container } = render(
      <Fretboard {...baseFretboardProps} appropriateNotes={overlay} chordSymbol="I" />,
    );
    expect(container.querySelector('[data-overlay-tier="color-tone"]')).toBeNull();
  });

  it('colorTones 있으면 color-tone group 렌더 + 1.5px stroke', () => {
    const overlay: AppropriateNotes = {
      chordRoot: 0,
      chordTones: new Set([4, 7]),
      colorTones: new Set([2, 9]), // D, A — 9th, 13th 격
    };
    const { container } = render(
      <Fretboard {...baseFretboardProps} appropriateNotes={overlay} chordSymbol="V7" />,
    );
    const colorGroup = container.querySelector('[data-overlay-tier="color-tone"]');
    expect(colorGroup).not.toBeNull();
    const colorCircles = colorGroup!.querySelectorAll('circle');
    expect(colorCircles.length).toBeGreaterThan(0);
    // stroke-width="1.5" 검증 (chord-tone은 2)
    expect(colorCircles[0]?.getAttribute('stroke-width')).toBe('1.5');
  });

  it('color-tone group은 chord-overlay 외부 — pulse 없음', () => {
    const overlay: AppropriateNotes = {
      chordRoot: 0,
      chordTones: new Set([4, 7]),
      colorTones: new Set([2]),
    };
    const { container } = render(
      <Fretboard {...baseFretboardProps} appropriateNotes={overlay} chordSymbol="I" />,
    );
    const overlayGroup = container.querySelector('.chord-overlay');
    // color-tone tier가 .chord-overlay 안에 있으면 안 됨 (pulse animation 회피)
    expect(overlayGroup?.querySelector('[data-overlay-tier="color-tone"]')).toBeNull();
    // 별도 그룹으로 존재해야 함
    expect(container.querySelector('[data-overlay-tier="color-tone"]')).not.toBeNull();
  });

  it('ghostNotes 없으면 ghost group 미렌더', () => {
    const overlay: AppropriateNotes = {
      chordRoot: 0,
      chordTones: new Set([4, 7]),
      colorTones: new Set([2]),
    };
    const { container } = render(
      <Fretboard {...baseFretboardProps} appropriateNotes={overlay} chordSymbol="I" />,
    );
    expect(container.querySelector('[data-overlay-tier="ghost"]')).toBeNull();
  });

  it('ghostNotes 있으면 ghost group 렌더 + 1px stroke + ink-muted', () => {
    const ghosts = [
      { string: 1, fret: 5, pitchClass: 1 as const, noteName: 'C#' },
      { string: 3, fret: 6, pitchClass: 1 as const, noteName: 'C#' },
    ];
    const overlay: AppropriateNotes = {
      chordRoot: 1, // C#, out of C major scale
      chordTones: new Set(),
      colorTones: new Set(),
    };
    const { container } = render(
      <Fretboard
        {...baseFretboardProps}
        appropriateNotes={overlay}
        chordSymbol="bII"
        ghostNotes={ghosts}
      />,
    );
    const ghostGroup = container.querySelector('[data-overlay-tier="ghost"]');
    expect(ghostGroup).not.toBeNull();
    const ghostCircles = ghostGroup!.querySelectorAll('circle');
    expect(ghostCircles).toHaveLength(2);
    expect(ghostCircles[0]?.getAttribute('stroke-width')).toBe('1');
    expect(ghostCircles[0]?.getAttribute('stroke')).toBe('var(--color-fretboard-ghost)');
  });

  it('out-of-scale chord-root 위치에도 빨강 ring 렌더', () => {
    // C# (pc=1)는 C major scale 밖. ghost marker + chord-root ring 같은 위치.
    const ghosts = [
      { string: 1, fret: 5, pitchClass: 1 as const, noteName: 'C#' },
    ];
    const overlay: AppropriateNotes = {
      chordRoot: 1, // C#
      chordTones: new Set(),
      colorTones: new Set(),
    };
    const { container } = render(
      <Fretboard
        {...baseFretboardProps}
        appropriateNotes={overlay}
        chordSymbol="bII"
        ghostNotes={ghosts}
      />,
    );
    const rootCircles = container.querySelectorAll(
      '[data-overlay-tier="chord-root"] circle',
    );
    // out-of-scale chord-root도 ring을 받아야 함
    expect(rootCircles.length).toBeGreaterThanOrEqual(1);
  });
});
