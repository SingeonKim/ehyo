import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProgressionCatalogClient } from '@/components/jam/ProgressionCatalogClient';
import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { useAppStore } from '@/lib/store/app-store';

// 테스트용 12-bar blues 진행 (재생 마디 강조 테스트에서 idx=2 슬롯이 필요)
const blues12: ProgressionTemplate = {
  slug: 'test-blues',
  name: '12-Bar Blues (Test)',
  category: 'blues',
  bars: 12,
  time_signature: '4/4',
  default_bpm: 90,
  recommended_scales: ['major_blues'],
  progression: [
    { bar: 1, chord: 'I7' },
    { bar: 2, chord: 'I7' },
    { bar: 3, chord: 'I7' },
    { bar: 4, chord: 'I7' },
    { bar: 5, chord: 'IV7' },
    { bar: 6, chord: 'IV7' },
    { bar: 7, chord: 'I7' },
    { bar: 8, chord: 'I7' },
    { bar: 9, chord: 'V7' },
    { bar: 10, chord: 'IV7' },
    { bar: 11, chord: 'I7' },
    { bar: 12, chord: 'V7' },
  ],
} as ProgressionTemplate;

describe('ProgressionCatalogClient', () => {
  beforeEach(() => {
    // store를 알려진 기본값으로 초기화 (각 테스트 격리)
    useAppStore.setState((s) => ({
      ui: { ...s.ui, chordDisplayMode: 'roman' },
      backing: {
        ...s.backing,
        backingKey: 0,
        backingPlayingSlug: null,
        backingCurrentChord: null,
      },
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('12개 마디 칩 모두 렌더 (slice 없음)', () => {
    render(<ProgressionCatalogClient templates={[blues12]} />);
    const card = screen.getByText('12-Bar Blues (Test)').closest('li')!;
    // 칩 ul 안의 li 만 카운트 (카드 자체 li 제외 위해 chord 텍스트로 필터)
    const chips = within(card).getAllByText(/^(I7|IV7|V7|Im7|IVm7|Vm7)$/);
    expect(chips).toHaveLength(12);
  });

  it('재생 중 + barIndex=2 → 3번째 칩만 강조 (aria-current)', () => {
    useAppStore.setState((s) => ({
      backing: {
        ...s.backing,
        backingPlayingSlug: 'test-blues',
        backingCurrentChord: { symbol: 'I7', barIndex: 2 },
      },
    }));
    render(<ProgressionCatalogClient templates={[blues12]} />);
    const card = screen.getByText('12-Bar Blues (Test)').closest('li')!;
    // 카드 내부에 ul.flex-wrap 안의 li 만 추출 — chord 진행 칩
    const chipList = card.querySelector('ul.flex-wrap');
    expect(chipList).not.toBeNull();
    const chips = Array.from(chipList!.querySelectorAll(':scope > li'));
    expect(chips).toHaveLength(12);
    expect(chips[2]).toHaveAttribute('aria-current', 'true');
    chips.forEach((chip, idx) => {
      if (idx !== 2) {
        expect(chip).not.toHaveAttribute('aria-current', 'true');
      }
    });
  });

  it('mode=absolute + key=2(D) → I7 칩 텍스트가 D7', () => {
    useAppStore.setState((s) => ({
      ui: { ...s.ui, chordDisplayMode: 'absolute' },
      backing: { ...s.backing, backingKey: 2 },
    }));
    render(<ProgressionCatalogClient templates={[blues12]} />);
    const card = screen.getByText('12-Bar Blues (Test)').closest('li')!;
    expect(within(card).getAllByText('D7').length).toBeGreaterThan(0);
    expect(within(card).getAllByText('G7').length).toBeGreaterThan(0); // IV7 of D
    expect(within(card).getAllByText('A7').length).toBeGreaterThan(0); // V7 of D
  });

  it('소문자 코드(i7)는 mode=roman에서 Im7로 표시', () => {
    const minor: ProgressionTemplate = {
      ...blues12,
      slug: 'test-minor',
      name: '소문자 테스트',
      progression: [
        { bar: 1, chord: 'i7' },
        { bar: 2, chord: 'iv7' },
      ],
      bars: 2,
    } as ProgressionTemplate;
    render(<ProgressionCatalogClient templates={[minor]} />);
    const card = screen.getByText('소문자 테스트').closest('li')!;
    expect(within(card).getByText('Im7')).toBeInTheDocument();
    expect(within(card).getByText('IVm7')).toBeInTheDocument();
  });
});
