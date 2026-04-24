import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { FretboardClient } from '@/components/fretboard/FretboardClient';
import { useAppStore } from '@/lib/store/app-store';

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

  it('강조 색 사이클 — Major의 orange 5도를 클릭하면 green으로 전환', async () => {
    const user = userEvent.setup();
    render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });

    // Major 기본: { 4: orange, 7: orange }. "5" pill(semitone 7)은 aria-label에
    // "Degree 5 — orange" 포함. 클릭 시 orange → green 사이클.
    const fifthPill = screen.getByRole('button', { name: /Degree 5 — orange/ });
    await user.click(fifthPill);

    // Zustand 스토어 변화 검증: semitone 7의 색이 'green'
    const override = useAppStore.getState().fretboard.highlightsByScale.major;
    expect(override).toBeDefined();
    expect(override?.[7]).toBe('green');
    // 다른 기본 강조(4도=orange)는 유지
    expect(override?.[4]).toBe('orange');
  });

  it('손잡이 Left 선택 → store handedness=left', async () => {
    const user = userEvent.setup();
    render(<FretboardClient />);
    await screen.findByRole('img', { name: /Guitar fretboard/i });

    await user.click(screen.getByRole('radio', { name: 'Left' }));
    expect(useAppStore.getState().fretboard.handedness).toBe('left');
  });
});
