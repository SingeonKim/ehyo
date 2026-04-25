/**
 * WebAudioFont 통합 브릿지 — Player·script·패치 캐시 통합 관리.
 *
 * 왜 import가 아닌 script 태그인가:
 *   webaudiofont npm 패키지는 ESM/CJS export 없이 글로벌 변수 var 선언만
 *   포함된 plain JS다. webpack이 번들링하면 var가 모듈 스코프에 갇혀
 *   `globalThis.WebAudioFontPlayer`도 undefined가 된다. 따라서 `<script>`
 *   태그로 로드해 실제 글로벌 변수가 만들어지도록 한다.
 *
 * 로드 순서:
 *   1. ensurePatch(...) → ensureScriptLoaded() 먼저 await
 *   2. 스크립트 로드 후 globalThis.WebAudioFontPlayer 사용 가능
 *   3. getPlayer() 호출 시 싱글턴 인스턴스 생성
 *   4. 패치 데이터(surikov/webaudiofontdata)는 player.loader.startLoad로 별도 로드
 *
 * 동시 로드 보호:
 *   _scriptLoad 프로미스를 캐시해 동시 호출도 단일 스크립트 태그만 삽입.
 *
 * 테스트:
 *   beforeEach에서 globalThis.WebAudioFontPlayer를 mock 클래스로 직접 set.
 *   ensureScriptLoaded는 클래스가 이미 있으면 즉시 resolve.
 */

import { getAudioContext } from '../context';
import type { InstrumentPreset } from './presets';

const PATCH_BASE = 'https://surikov.github.io/webaudiofontdata/sound/';
const PLAYER_SCRIPT_URL =
  'https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js';

/** WebAudioFont 패치 하나가 로드 완료된 결과. */
export type LoadedInstrument = {
  /** WebAudioFont 패치 객체 — globalThis[varName]에 심어진 것을 참조. */
  patch: unknown;
  url: string;
};

/**
 * 드럼킷 패치 묶음 — surikov 패턴상 드럼은 MIDI 노트별로 별도 파일이므로
 * kick(36), snare(38), hat(42) 각각을 개별 LoadedInstrument로 보유.
 */
export type LoadedDrumKit = {
  kick: LoadedInstrument;
  snare: LoadedInstrument;
  hat: LoadedInstrument;
};

/** loadPreset 결과: 드럼킷·베이스·기타 패치 묶음. */
export type LoadedPreset = {
  drums: LoadedDrumKit;
  bass: LoadedInstrument;
  guitar: LoadedInstrument;
};

// ── 싱글턴 상태 ────────────────────────────────────────────────────────────────

let _player: WebAudioFontPlayer | null = null;
// 동시 호출이 와도 단일 스크립트 태그만 삽입되도록 프로미스를 캐시한다.
let _scriptLoad: Promise<void> | null = null;
// key: "drum:36:0" | "melodic:27" 등 — 같은 패치의 중복 로드 방지.
const patchCache = new Map<string, LoadedInstrument>();

// ── 내부 유틸 ──────────────────────────────────────────────────────────────────

/** globalThis에 WebAudioFontPlayer 클래스가 이미 존재하는지 확인. */
function hasGlobalPlayerClass(): boolean {
  return typeof (globalThis as { WebAudioFontPlayer?: unknown }).WebAudioFontPlayer !== 'undefined';
}

function patchKeyMelodic(gm: number): string {
  return `melodic:${gm}`;
}

/**
 * 드럼 패치용 캐시 키 — 노트·킷 조합이 각각 별도 파일이므로 둘 다 포함.
 * 예: "drum:36:0" (kick, kit 0)
 */
function patchKeyDrum(note: number, kit: number): string {
  return `drum:${note}:${kit}`;
}

/**
 * surikov CDN URL 및 글로벌 변수명 계산 — 드럼 노트별 개별 파일.
 *
 * surikov 패턴:
 *   URL: sound/128{note}_{kit}_FluidR3_GM_sf2_file.js
 *   Var: _drum_{note}_{kit}_FluidR3_GM_sf2_file
 *
 *   예: note=36, kit=0 → "12836_0_FluidR3_GM_sf2_file.js"
 *                         "_drum_36_0_FluidR3_GM_sf2_file"
 */
function drumPatchUrl(note: number, kit: number): { url: string; varName: string } {
  return {
    url: `${PATCH_BASE}128${note}_${kit}_FluidR3_GM_sf2_file.js`,
    varName: `_drum_${note}_${kit}_FluidR3_GM_sf2_file`,
  };
}

/**
 * surikov CDN URL 및 글로벌 변수명 계산 — 선율 악기(Melodic).
 *
 * Melodic (GM 0-127): GM 번호 × 10을 4자리 0패딩.
 *   GM 27  → "0270_FluidR3_GM_sf2_file.js", var "_tone_0270_FluidR3_GM_sf2_file"
 *   GM 33  → "0330_FluidR3_GM_sf2_file.js", var "_tone_0330_FluidR3_GM_sf2_file"
 */
function melodicPatchUrl(gm: number): { url: string; varName: string } {
  const padded = String(gm * 10).padStart(4, '0');
  return {
    url: `${PATCH_BASE}${padded}_FluidR3_GM_sf2_file.js`,
    varName: `_tone_${padded}_FluidR3_GM_sf2_file`,
  };
}

// ── 공개 API ───────────────────────────────────────────────────────────────────

/**
 * WebAudioFontPlayer 클래스를 글로벌에 로드한다(이미 있으면 no-op).
 *
 * 왜 <script> 태그를 쓰는가:
 *   npm 패키지를 webpack이 번들링하면 var 선언이 모듈 스코프에 갇혀
 *   globalThis에서 접근 불가. script 태그는 실제 글로벌 스코프에서 실행된다.
 *
 * 동시 호출 보호:
 *   _scriptLoad 프로미스를 공유해 두 번째 호출부터는 동일 프로미스를 반환.
 */
export function ensureScriptLoaded(): Promise<void> {
  // 이미 클래스가 있으면 즉시 resolve (테스트에서 직접 주입한 경우 포함).
  if (hasGlobalPlayerClass()) return Promise.resolve();
  if (_scriptLoad) return _scriptLoad;

  // 브라우저 환경이 아니면(SSR 등) 거부.
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(
      new Error('[webaudiofont-bridge] cannot load WebAudioFontPlayer outside browser'),
    );
  }

  _scriptLoad = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PLAYER_SCRIPT_URL;
    s.async = true;
    s.onload = () => {
      if (hasGlobalPlayerClass()) {
        resolve();
      } else {
        reject(
          new Error('[webaudiofont-bridge] script loaded but WebAudioFontPlayer global missing'),
        );
      }
    };
    s.onerror = () =>
      reject(new Error('[webaudiofont-bridge] failed to load WebAudioFontPlayer.js'));
    document.head.appendChild(s);
  });
  return _scriptLoad;
}

/**
 * WebAudioFontPlayer 싱글턴 반환.
 *
 * 동기 함수이므로, 반드시 ensurePatch 또는 ensureScriptLoaded를 먼저
 * await한 뒤 호출해야 한다. 클래스 미로드 시 즉시 에러를 던진다.
 */
export function getPlayer(): WebAudioFontPlayer {
  if (_player) return _player;
  if (!hasGlobalPlayerClass()) {
    throw new Error(
      '[webaudiofont-bridge] WebAudioFontPlayer 미로드 — ensurePatch/loadPreset 먼저 await 필요',
    );
  }
  // unknown 경유 이중 캐스팅: globalThis는 WebAudioFontPlayer 키를 모르므로
  // 직접 캐스팅 시 TS2352 오류가 발생한다. unknown을 통해 안전하게 우회.
  const G = globalThis as unknown as { WebAudioFontPlayer: typeof WebAudioFontPlayer };
  _player = new G.WebAudioFontPlayer();
  return _player;
}

/**
 * 선율 악기 패치를 CDN에서 로드(또는 캐시 히트로 즉시 반환).
 *
 * @param gm - GM 번호 (0-127)
 */
export async function ensurePatch(gm: number): Promise<LoadedInstrument> {
  const key = patchKeyMelodic(gm);
  const cached = patchCache.get(key);
  if (cached) return cached;

  await ensureScriptLoaded();

  const player = getPlayer();
  const ctx = getAudioContext();
  const { url, varName } = melodicPatchUrl(gm);

  return new Promise<LoadedInstrument>((resolve, reject) => {
    try {
      player.loader.startLoad(ctx, url, varName);
      player.loader.waitLoad(() => {
        // waitLoad 콜백 시점에 globalThis[varName]이 패치 객체를 담고 있어야 한다.
        // 브라우저: startLoad가 script 태그를 삽입하고 전역 변수를 채움.
        // 테스트: beforeEach에서 globalThis에 직접 stub을 심어둔다.
        const patch = (globalThis as Record<string, unknown>)[varName];
        if (!patch) {
          reject(new Error(`[webaudiofont-bridge] 패치 변수 "${varName}" 로드 실패`));
          return;
        }
        const loaded: LoadedInstrument = { patch, url };
        patchCache.set(key, loaded);
        resolve(loaded);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/**
 * 드럼 개별 노트 패치를 CDN에서 로드(또는 캐시 히트로 즉시 반환).
 *
 * surikov 패턴상 드럼은 노트별 개별 파일. kick=36, snare=38, hat=42는
 * 각각 별도 URL을 가진다.
 *
 * surikov CDN은 일부 kit(예: 32 Jazz, 40+)을 보유하지 않아 404가 나는데,
 * Promise.all로 묶인 loadPreset 전체가 실패하는 것을 막기 위해 요청한 kit
 * 로드가 실패하면 kit=0(Standard)로 자동 폴백한다. 폴백 동작은 콘솔 경고로
 * 사용자가 알 수 있게 남긴다.
 *
 * @param note - MIDI 노트 번호 (36=kick, 38=snare, 42=hat 등)
 * @param kit  - 드럼 킷 번호 (0=Standard 등)
 */
export async function ensureDrumPatch(note: number, kit: number): Promise<LoadedInstrument> {
  try {
    return await loadDrumPatchAttempt(note, kit);
  } catch (e) {
    if (kit !== 0) {
      console.warn(
        `[webaudiofont-bridge] drum kit=${kit} note=${note} 로드 실패, Standard kit(0)로 폴백:`,
        e,
      );
      return loadDrumPatchAttempt(note, 0);
    }
    throw e;
  }
}

/** 단일 시도 — ensureDrumPatch 폴백 로직과 분리. */
async function loadDrumPatchAttempt(note: number, kit: number): Promise<LoadedInstrument> {
  const key = patchKeyDrum(note, kit);
  const cached = patchCache.get(key);
  if (cached) return cached;

  await ensureScriptLoaded();

  const player = getPlayer();
  const ctx = getAudioContext();
  const { url, varName } = drumPatchUrl(note, kit);

  return new Promise<LoadedInstrument>((resolve, reject) => {
    try {
      player.loader.startLoad(ctx, url, varName);
      player.loader.waitLoad(() => {
        const patch = (globalThis as Record<string, unknown>)[varName];
        if (!patch) {
          reject(new Error(`[webaudiofont-bridge] 드럼 패치 변수 "${varName}" 로드 실패`));
          return;
        }
        const loaded: LoadedInstrument = { patch, url };
        patchCache.set(key, loaded);
        resolve(loaded);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

// 드럼 MIDI 노트 상수 — GM Channel 10 표준
const DRUM_NOTE_KICK = 36;
const DRUM_NOTE_SNARE = 38;
const DRUM_NOTE_HAT = 42;

/**
 * InstrumentPreset의 drums(3패치 병렬)/bass/guitar를 병렬 로드.
 *
 * 드럼은 kick(36)·snare(38)·hat(42) 3개를 개별 CDN 파일로 로드.
 * 첫 호출에서 5개 CDN 요청이 동시 발사된다.
 * 이후 같은 preset 재호출 시 캐시 히트로 즉시 반환.
 */
export async function loadPreset(preset: InstrumentPreset): Promise<LoadedPreset> {
  const [kick, snare, hat, bass, guitar] = await Promise.all([
    ensureDrumPatch(DRUM_NOTE_KICK,  preset.drumsKit),
    ensureDrumPatch(DRUM_NOTE_SNARE, preset.drumsKit),
    ensureDrumPatch(DRUM_NOTE_HAT,   preset.drumsKit),
    ensurePatch(preset.bass),
    ensurePatch(preset.guitar),
  ]);
  return {
    drums: { kick, snare, hat },
    bass,
    guitar,
  };
}

/**
 * 테스트·HMR 정리용. 운영 코드에서 호출 금지.
 *
 * 싱글턴 player, 스크립트 로드 프로미스, 패치 캐시를 초기 상태로 되돌린다.
 * beforeEach/afterEach에서 각 테스트 간 격리를 보장.
 */
export function __resetWebAudioFontBridgeForTests(): void {
  _player = null;
  _scriptLoad = null;
  patchCache.clear();
  // 테스트에서 주입한 globalThis.WebAudioFontPlayer도 정리한다.
  delete (globalThis as { WebAudioFontPlayer?: unknown }).WebAudioFontPlayer;
}
