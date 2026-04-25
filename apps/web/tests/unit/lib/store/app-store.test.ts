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

  it('v6 state의 backing.backingKey 보존', () => {
    const v6 = { backing: { backingKey: 7 } };
    const result = __migrate(v6, 6) as { backing: { backingKey: number } };
    expect(result.backing.backingKey).toBe(7);
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

  it('v5 state에서 v7까지 누적 migration이 올바르게 동작 (volume 조정 + bpmOverrides 주입)', () => {
    // v5 이전 유저: volume=0.8, backing 없음 → v7 기준으로 모두 처리돼야 함
    const v5State = {
      fretboard: { root: 0, scale: 'major' },
      metronome: { volume: 0.8 },
    };
    const result = __migrate(v5State, 4) as {
      metronome: { volume: number };
      backing: { backingKey: number; bpmOverrides: Record<string, number> };
    };
    // v4→v5: volume 0.8 → 0.5
    expect(result.metronome.volume).toBe(0.5);
    // v5→v6: backingKey 기본값 0 주입
    expect(result.backing.backingKey).toBe(0);
    // v6→v7: bpmOverrides 빈 객체 주입
    expect(result.backing.bpmOverrides).toEqual({});
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
