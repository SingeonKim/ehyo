import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installSmplrMock, type SmplrMock } from './voice-mock-helpers';

let smplrMock: SmplrMock;

vi.mock('smplr', () => {
  // 각 테스트가 beforeEach에서 갱신한 _mock을 게으르게 참조하도록 getter 사용.
  return {
    get Soundfont() { return smplrMock.Soundfont; },
    get DrumMachine() { return smplrMock.DrumMachine; },
    get Reverb() { return smplrMock.Reverb; },
  };
});

describe('smplr-bridge', () => {
  beforeEach(() => {
    smplrMock = installSmplrMock();
    vi.resetModules();
  });
  afterEach(async () => {
    const mod = await import('@/lib/audio/backing/smplr-bridge');
    mod.__resetSmplrBridgeForTests();
  });

  it('getSoundfont — 같은 instrument는 한 번만 생성한다', async () => {
    const { getSoundfont } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    const a = await getSoundfont(ctx, 'electric_guitar_jazz');
    const b = await getSoundfont(ctx, 'electric_guitar_jazz');
    expect(a).toBe(b);
    expect(smplrMock.Soundfont).toHaveBeenCalledTimes(1);
  });

  it('getSoundfont — 다른 instrument는 별도 인스턴스', async () => {
    const { getSoundfont } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    await getSoundfont(ctx, 'electric_guitar_jazz');
    await getSoundfont(ctx, 'acoustic_bass');
    expect(smplrMock.Soundfont).toHaveBeenCalledTimes(2);
  });

  it('getDrumMachine — 같은 kit은 한 번만 생성한다', async () => {
    const { getDrumMachine } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    const a = await getDrumMachine(ctx, 'TR-808');
    const b = await getDrumMachine(ctx, 'TR-808');
    expect(a).toBe(b);
    expect(smplrMock.DrumMachine).toHaveBeenCalledTimes(1);
  });

  it('getDrumMachine — 다른 kit은 별도 인스턴스', async () => {
    const { getDrumMachine } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    await getDrumMachine(ctx, 'TR-808');
    await getDrumMachine(ctx, 'LM-2');
    expect(smplrMock.DrumMachine).toHaveBeenCalledTimes(2);
  });

  it('loadBundle — bundle 정의대로 drums/bass/guitar 병렬 로드', async () => {
    const { loadBundle } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    const loaded = await loadBundle(ctx, {
      label: 'Jazz · TR-808 brush 대체',
      drums: { machine: 'TR-808' },
      bass: { instrument: 'acoustic_bass' },
      guitar: { instrument: 'electric_guitar_jazz' },
    });
    expect(loaded.drums).toBeDefined();
    expect(loaded.bass).toBeDefined();
    expect(loaded.guitar).toBeDefined();
    expect(loaded.aux).toBeUndefined();
  });

  it('loadBundle — aux가 있으면 추가 Soundfont 로드', async () => {
    const { loadBundle } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    const loaded = await loadBundle(ctx, {
      label: 'Bossa',
      drums: { machine: 'LM-2' },
      bass: { instrument: 'acoustic_bass' },
      guitar: { instrument: 'acoustic_guitar_nylon' },
      aux: { kind: 'clave', pattern: 'bossa' },
    });
    expect(loaded.aux).toBeDefined();
    // Soundfont 호출은 bass + guitar + aux = 3회
    expect(smplrMock.Soundfont).toHaveBeenCalledTimes(3);
  });

  it('getReverb — Reverb 인스턴스 반환 (ready 대기)', async () => {
    const { getReverb } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    const reverb = await getReverb(ctx);
    expect(reverb).toBeDefined();
    expect(smplrMock.Reverb).toHaveBeenCalledTimes(1);
  });

  it('__resetSmplrBridgeForTests — 캐시 비움', async () => {
    const { getSoundfont, __resetSmplrBridgeForTests } = await import('@/lib/audio/backing/smplr-bridge');
    const ctx = {} as AudioContext;
    await getSoundfont(ctx, 'electric_guitar_jazz');
    __resetSmplrBridgeForTests();
    await getSoundfont(ctx, 'electric_guitar_jazz');
    expect(smplrMock.Soundfont).toHaveBeenCalledTimes(2);
  });
});
