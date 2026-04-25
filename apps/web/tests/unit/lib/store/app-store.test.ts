/**
 * app-store.test.ts — Zustand persist migrate 로직 + bpmOverrides 액션 검증.
 *
 * migrate 함수를 __migrate export로 직접 테스트하는 이유:
 *   persist 미들웨어를 실제로 실행하려면 localStorage 스텁 + rehydrate 타이밍이 필요해
 *   테스트가 복잡해진다. migrate 로직은 순수 함수이므로 직접 호출이 더 명확하다.
 *
 * store 액션 테스트는 jsdom 환경(vitest.config.ts: environment: 'jsdom')에서
 * useAppStore.getState()를 통해 직접 검증한다.
 */

import { describe, expect, it } from 'vitest';

import { __migrate, useAppStore } from '@/lib/store/app-store';

// ─── persist migration 단위 테스트 ─────────────────────────

describe('persist migration', () => {
  it('v6 state에 bpmOverrides가 없으면 빈 객체 주입 (v6 → v7)', () => {
    const v6State = {
      backing: { backingKey: 0, backingPlayingSlug: null, backingCurrentChord: null },
    };
    const result = __migrate(v6State, 6) as typeof v6State & {
      backing: { bpmOverrides: Record<string, number> };
    };
    expect(result.backing.bpmOverrides).toEqual({});
  });

  it('v6 state의 backing.backingKey가 v9에서 fretboard.root로 흡수되고 삭제됨', () => {
    // migrate는 항상 마지막 버전(v9)까지 누적 적용되므로 v6 입력도 v9 결과로 비교한다.
    const v6 = { backing: { backingKey: 7 } };
    const result = __migrate(v6, 6) as {
      backing: Record<string, unknown>;
      fretboard: { root: number };
    };
    expect(result.fretboard.root).toBe(7);
    expect(result.backing.backingKey).toBeUndefined();
  });

  it('v7 state의 bpmOverrides는 그대로 보존 (idempotent)', () => {
    // version=7 이면 v6→v7 블록이 실행되지 않아야 하므로 기존 값이 유지됨
    const v7 = { backing: { backingKey: 0, bpmOverrides: { 'test-slug': 110 } } };
    const result = __migrate(v7, 7) as { backing: { bpmOverrides: Record<string, number> } };
    expect(result.backing.bpmOverrides).toEqual({ 'test-slug': 110 });
  });

  it('v6 state에 bpmOverrides가 잘못된 타입(null)이면 빈 객체로 교체', () => {
    // localStorage에 손상된 데이터가 있는 경우를 방어
    const broken = { backing: { backingKey: 0, bpmOverrides: null } };
    const result = __migrate(broken, 6) as { backing: { bpmOverrides: Record<string, number> } };
    expect(result.backing.bpmOverrides).toEqual({});
  });

  it('v6 state에 bpmOverrides가 잘못된 타입(배열)이면 빈 객체로 교체', () => {
    const arr = { backing: { backingKey: 0, bpmOverrides: [] } };
    const result = __migrate(arr, 6) as { backing: { bpmOverrides: Record<string, number> } };
    expect(result.backing.bpmOverrides).toEqual({});
  });

  it('persistedState가 null/undefined이면 그대로 반환 (early return 경로)', () => {
    // migrate 내부의 early return 방어 로직 검증
    expect(__migrate(null, 6)).toBeNull();
    expect(__migrate(undefined, 6)).toBeUndefined();
  });

  it('v4 state에서 v9까지 누적 migration이 올바르게 동작', () => {
    // v4 이전 유저: volume=0.8, backing 없음 → 누적 마이그레이션 끝에 v9 모양이 돼야 함
    const v5State = {
      fretboard: { root: 0, scale: 'major' },
      metronome: { volume: 0.8 },
    };
    const result = __migrate(v5State, 4) as {
      metronome: { volume: number };
      fretboard: { root: number };
      backing: { bpmOverrides: Record<string, number> } & Record<string, unknown>;
      ui: { chordDisplayMode: string };
    };
    // v4→v5: volume 0.8 → 0.5
    expect(result.metronome.volume).toBe(0.5);
    // v5→v6: backing 슬라이스 주입(v9에서 backingKey는 다시 빠짐)
    // v6→v7: bpmOverrides 빈 객체
    expect(result.backing.bpmOverrides).toEqual({});
    // v7→v8: chordDisplayMode 기본 roman
    expect(result.ui.chordDisplayMode).toBe('roman');
    // v8→v9: backingKey가 fretboard.root로 흡수되고 backing에서 삭제됨
    expect(result.backing.backingKey).toBeUndefined();
    expect(result.fretboard.root).toBe(0);
  });
});

// ─── Sprint 2-6 후속 — persist v8 → v9 migration (Key 동기화) ───

describe('persist migrate v8 → v9', () => {
  it('backingKey가 있으면 fretboard.root로 옮기고 backingKey 삭제', () => {
    const v8 = {
      fretboard: { root: 0, scale: 'major' },
      backing: { backingKey: 7, bpmOverrides: {} },
      ui: { chordDisplayMode: 'roman' },
    };
    const result = __migrate(v8, 8) as {
      fretboard: { root: number };
      backing: Record<string, unknown>;
    };
    // jam에서 듣던 키 보존이 우선 — RootPicker 기본값(C)을 덮어씀
    expect(result.fretboard.root).toBe(7);
    expect(result.backing.backingKey).toBeUndefined();
  });

  it('backingKey가 없으면 fretboard.root 변동 없음', () => {
    const v8 = {
      fretboard: { root: 5 },
      backing: { bpmOverrides: {} },
    };
    const result = __migrate(v8, 8) as {
      fretboard: { root: number };
      backing: Record<string, unknown>;
    };
    expect(result.fretboard.root).toBe(5);
    expect(result.backing.backingKey).toBeUndefined();
  });

  it('잘못된 backingKey(범위 밖, 정수 아님)는 무시', () => {
    const v8 = {
      fretboard: { root: 3 },
      backing: { backingKey: 13, bpmOverrides: {} },
    };
    const result = __migrate(v8, 8) as {
      fretboard: { root: number };
      backing: Record<string, unknown>;
    };
    // 잘못된 값은 fretboard.root를 덮지 않음 — 기존 root 유지
    expect(result.fretboard.root).toBe(3);
    expect(result.backing.backingKey).toBeUndefined();
  });

  it('backingKey가 문자열 등 잘못된 타입이면 무시', () => {
    const v8 = {
      fretboard: { root: 9 },
      backing: { backingKey: 'G', bpmOverrides: {} },
    };
    const result = __migrate(v8, 8) as {
      fretboard: { root: number };
      backing: Record<string, unknown>;
    };
    expect(result.fretboard.root).toBe(9);
    expect(result.backing.backingKey).toBeUndefined();
  });
});

// ─── setBackingBpm / clearBackingBpm 액션 테스트 ───────────

describe('setBackingBpm action', () => {
  it('새 slug에 BPM을 추가할 수 있다', async () => {
    const { useAppStore } = await import('@/lib/store/app-store');
    useAppStore.getState().setBackingBpm('test-slug', 110);
    expect(useAppStore.getState().backing.bpmOverrides['test-slug']).toBe(110);
    // 다른 테스트에 영향 주지 않도록 정리
    useAppStore.getState().clearBackingBpm('test-slug');
  });

  it('같은 slug에 BPM을 덮어쓸 수 있다', async () => {
    const { useAppStore } = await import('@/lib/store/app-store');
    useAppStore.getState().setBackingBpm('overwrite-slug', 90);
    useAppStore.getState().setBackingBpm('overwrite-slug', 130);
    expect(useAppStore.getState().backing.bpmOverrides['overwrite-slug']).toBe(130);
    useAppStore.getState().clearBackingBpm('overwrite-slug');
  });

  it('clearBackingBpm으로 slug를 제거하면 undefined가 된다', async () => {
    const { useAppStore } = await import('@/lib/store/app-store');
    useAppStore.getState().setBackingBpm('to-remove', 99);
    useAppStore.getState().clearBackingBpm('to-remove');
    expect(useAppStore.getState().backing.bpmOverrides['to-remove']).toBeUndefined();
  });

  it('존재하지 않는 slug에 clearBackingBpm을 호출해도 에러가 발생하지 않는다', async () => {
    const { useAppStore } = await import('@/lib/store/app-store');
    expect(() => {
      useAppStore.getState().clearBackingBpm('non-existent-slug');
    }).not.toThrow();
  });

  it('여러 slug의 BPM override가 독립적으로 관리된다', async () => {
    const { useAppStore } = await import('@/lib/store/app-store');
    useAppStore.getState().setBackingBpm('slug-a', 80);
    useAppStore.getState().setBackingBpm('slug-b', 140);
    const overrides = useAppStore.getState().backing.bpmOverrides;
    expect(overrides['slug-a']).toBe(80);
    expect(overrides['slug-b']).toBe(140);
    // 하나를 제거해도 나머지가 남아 있어야 함
    useAppStore.getState().clearBackingBpm('slug-a');
    expect(useAppStore.getState().backing.bpmOverrides['slug-a']).toBeUndefined();
    expect(useAppStore.getState().backing.bpmOverrides['slug-b']).toBe(140);
    // 정리
    useAppStore.getState().clearBackingBpm('slug-b');
  });
});

// ─── Sprint 2-6 — chordDisplayMode (UI 상태) ────────────────

describe('chordDisplayMode (Sprint 2-6)', () => {
  it('기본값은 roman', () => {
    const store = useAppStore.getState();
    expect(store.ui.chordDisplayMode).toBe('roman');
  });

  it('setChordDisplayMode로 absolute / roman 전환', () => {
    const { setChordDisplayMode } = useAppStore.getState();
    setChordDisplayMode('absolute');
    expect(useAppStore.getState().ui.chordDisplayMode).toBe('absolute');
    setChordDisplayMode('roman');
    expect(useAppStore.getState().ui.chordDisplayMode).toBe('roman');
  });
});

// ─── Sprint 2-6 — persist v7 → v8 migration ───────────────

describe('persist migrate v7 → v8', () => {
  it('chordDisplayMode 없는 상태에 기본값 roman 주입', () => {
    const v7State = {
      ui: { theme: 'dark' },
      backing: {
        backingKey: 0,
        backingPlayingSlug: null,
        backingCurrentChord: null,
        bpmOverrides: {},
      },
    };
    const migrated = __migrate(v7State, 7) as { ui: { chordDisplayMode: string } };
    expect(migrated.ui.chordDisplayMode).toBe('roman');
  });

  it('잘못된 chordDisplayMode 값은 roman으로 정정', () => {
    const v7State = {
      ui: { theme: 'dark', chordDisplayMode: 'INVALID' },
    };
    const migrated = __migrate(v7State, 7) as { ui: { chordDisplayMode: string } };
    expect(migrated.ui.chordDisplayMode).toBe('roman');
  });

  it('이미 absolute로 설정된 경우 보존', () => {
    const v7State = {
      ui: { theme: 'dark', chordDisplayMode: 'absolute' },
    };
    const migrated = __migrate(v7State, 7) as { ui: { chordDisplayMode: string } };
    expect(migrated.ui.chordDisplayMode).toBe('absolute');
  });
});

describe('persist v10 → v11 migration', () => {
  it('v10 state에 backingPlayingCategory: null 추가', () => {
    const v10 = {
      fretboard: { root: 0, scale: 'major', highlightsByScale: {}, accidentalMode: 'auto' },
      backing: {
        backingPlayingSlug: null,
        backingCurrentChord: null,
        bpmOverrides: {},
        volume: 0.5,
      },
      ui: { theme: 'dark', chordDisplayMode: 'roman' },
    };
    const result = __migrate(v10, 10) as { backing: { backingPlayingCategory: unknown } };
    expect(result.backing.backingPlayingCategory).toBeNull();
  });

  it('v11 이미 적용된 state는 멱등 — 기존 category 보존', () => {
    const v11 = {
      fretboard: { root: 0, scale: 'major', highlightsByScale: {}, accidentalMode: 'auto' },
      backing: {
        backingPlayingSlug: 'pop-axis',
        backingPlayingCategory: 'pop',
        backingCurrentChord: null,
        bpmOverrides: {},
        volume: 0.5,
      },
      ui: { theme: 'dark', chordDisplayMode: 'roman' },
    };
    const result = __migrate(v11, 11) as { backing: { backingPlayingCategory: unknown } };
    expect(result.backing.backingPlayingCategory).toBe('pop');
  });
});

describe('_setBackingPlayingTemplate', () => {
  it('template이 주어지면 slug + category 동시 set', () => {
    useAppStore.getState()._setBackingPlayingTemplate({
      slug: 'jazz-251',
      category: 'jazz',
    } as never);
    const s = useAppStore.getState();
    expect(s.backing.backingPlayingSlug).toBe('jazz-251');
    expect(s.backing.backingPlayingCategory).toBe('jazz');
  });

  it('null이면 slug + category 둘 다 null', () => {
    useAppStore.getState()._setBackingPlayingTemplate(null);
    const s = useAppStore.getState();
    expect(s.backing.backingPlayingSlug).toBeNull();
    expect(s.backing.backingPlayingCategory).toBeNull();
  });

  it('알 수 없는 category는 pop으로 fallback', () => {
    useAppStore.getState()._setBackingPlayingTemplate({
      slug: 'weird',
      category: 'unknown-genre',
    } as never);
    expect(useAppStore.getState().backing.backingPlayingCategory).toBe('pop');
  });

  it('재생 시작 시 기존 selection을 clear한다', () => {
    // 정지 상태에서 selection 셋업
    useAppStore.getState()._setBackingPlayingTemplate(null);
    useAppStore.getState().setBackingSelectedBar(
      {
        slug: 'pop-axis',
        category: 'pop',
        progression: [{ chord: 'I', durationBeats: 4 }],
      } as never,
      0,
    );
    expect(useAppStore.getState().backing.backingSelectedSlug).toBe('pop-axis');

    // 재생 시작 → selection은 자동 clear
    useAppStore.getState()._setBackingPlayingTemplate({
      slug: 'pop-axis',
      category: 'pop',
    } as never);
    const s = useAppStore.getState();
    expect(s.backing.backingSelectedSlug).toBeNull();
    expect(s.backing.backingSelectedBarIndex).toBeNull();
  });
});

describe('setBackingSelectedBar', () => {
  it('정지 상태에서 set: selection + chord context 모두 채움', () => {
    // 깨끗한 정지 상태
    useAppStore.getState()._setBackingPlayingTemplate(null);
    useAppStore.getState()._setBackingCurrentChord(null);

    useAppStore.getState().setBackingSelectedBar(
      {
        slug: 'jazz-251',
        category: 'jazz',
        progression: [
          { chord: 'iim7', durationBeats: 4 },
          { chord: 'V7', durationBeats: 4 },
          { chord: 'IM7', durationBeats: 4 },
        ],
      } as never,
      1,
    );
    const s = useAppStore.getState();
    expect(s.backing.backingSelectedSlug).toBe('jazz-251');
    expect(s.backing.backingSelectedBarIndex).toBe(1);
    expect(s.backing.backingCurrentChord).toEqual({ symbol: 'V7', barIndex: 1 });
    expect(s.backing.backingPlayingCategory).toBe('jazz');
  });

  it('재생 중 set: selection만 갱신, chord context 건드리지 않음', () => {
    // 재생 중 시뮬레이션 — 엔진이 chord context를 set한 상태
    useAppStore.getState()._setBackingPlayingTemplate({
      slug: 'pop-axis',
      category: 'pop',
    } as never);
    useAppStore.getState()._setBackingCurrentChord({
      symbol: 'I',
      barIndex: 0,
    });

    useAppStore.getState().setBackingSelectedBar(
      {
        slug: 'jazz-251',
        category: 'jazz',
        progression: [{ chord: 'iim7', durationBeats: 4 }],
      } as never,
      0,
    );
    const s = useAppStore.getState();
    expect(s.backing.backingSelectedSlug).toBe('jazz-251');
    expect(s.backing.backingSelectedBarIndex).toBe(0);
    // chord context는 엔진 set 그대로
    expect(s.backing.backingCurrentChord).toEqual({ symbol: 'I', barIndex: 0 });
    expect(s.backing.backingPlayingCategory).toBe('pop');
  });

  it('clear (null, null): 정지 상태면 chord context도 함께 해제', () => {
    // 정지 상태에서 selection 먼저 set
    useAppStore.getState()._setBackingPlayingTemplate(null);
    useAppStore.getState().setBackingSelectedBar(
      {
        slug: 'pop-axis',
        category: 'pop',
        progression: [{ chord: 'I', durationBeats: 4 }],
      } as never,
      0,
    );
    expect(useAppStore.getState().backing.backingCurrentChord).not.toBeNull();

    // clear
    useAppStore.getState().setBackingSelectedBar(null, null);
    const s = useAppStore.getState();
    expect(s.backing.backingSelectedSlug).toBeNull();
    expect(s.backing.backingSelectedBarIndex).toBeNull();
    expect(s.backing.backingCurrentChord).toBeNull();
    expect(s.backing.backingPlayingCategory).toBeNull();
  });
});
