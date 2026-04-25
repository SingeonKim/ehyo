/**
 * WebAudioFont loader/player 싱글턴 + 패치 캐시.
 *
 * 역할:
 *   - 앱 전체에서 `import 'webaudiofont'`는 이 모듈에서만 수행.
 *   - WebAudioFontPlayer 인스턴스를 싱글턴으로 생성·공유.
 *   - 패치(사운드폰트 데이터)를 surikov/webaudiofontdata CDN에서 lazy 로드하고
 *     Map 캐시에 저장 — 같은 악기 재진입 시 CDN 재요청 없음.
 *
 * 패키지 형태 주의:
 *   webaudiofont v3.x는 글로벌 스크립트 방식으로 설계된 패키지다 (module.exports 없음).
 *   ESM named export가 없으므로, 테스트에서는 vi.mock()으로 주입하고
 *   실제 브라우저 런타임에서는 스크립트 로드 후 globalThis.WebAudioFontPlayer 폴백을 사용.
 *
 * patchCache 보장:
 *   같은 (kind, gm) 조합의 두 번째 요청은 startLoad·waitLoad 없이 즉시 반환.
 *   카드 A→B→A 전환 시 A의 첫 ▶ 이후 로딩 지연 없음.
 *
 * 테스트 지원:
 *   __resetWebAudioFontBridgeForTests()로 싱글턴·캐시를 초기화.
 *   운영 코드에서 호출 금지.
 */

import { WebAudioFontPlayer } from 'webaudiofont';

import { getAudioContext } from '../context';
import type { InstrumentPreset } from './presets';

const PATCH_BASE = 'https://surikov.github.io/webaudiofontdata/sound/';

/** WebAudioFont 패치 하나가 로드 완료된 결과. */
export type LoadedInstrument = {
  /** WebAudioFont 패치 객체 — globalThis[varName]에 심어진 것을 참조. */
  patch: unknown;
  url: string;
};

/** loadPreset 결과: 드럼·베이스·기타 3개 패치 묶음. */
export type LoadedPreset = {
  drums: LoadedInstrument;
  bass: LoadedInstrument;
  guitar: LoadedInstrument;
};

// ── 싱글턴 상태 ────────────────────────────────────────────────────────────────

let _player: WebAudioFontPlayer | null = null;
// key: "drum:0" | "melodic:27" 등 — 같은 패치의 중복 로드 방지.
const patchCache = new Map<string, LoadedInstrument>();

// ── 내부 유틸 ──────────────────────────────────────────────────────────────────

function patchKey(kind: 'drum' | 'melodic', gm: number): string {
  return `${kind}:${gm}`;
}

/**
 * surikov CDN URL 및 글로벌 변수명 계산.
 *
 * Drum kit:   킷 번호를 2자리 0패딩 후 '0' 접미사 → 3자리 총 길이.
 *   kit 0  → "000_FluidR3_GM_sf2_file.js", var "_drum_0_FluidR3_GM_sf2_file"
 *   kit 32 → "320_FluidR3_GM_sf2_file.js", var "_drum_32_FluidR3_GM_sf2_file"
 *
 * Melodic (GM 0-127): GM 번호 × 10을 4자리 0패딩.
 *   GM 27  → "0270_FluidR3_GM_sf2_file.js", var "_tone_0270_FluidR3_GM_sf2_file"
 *   GM 33  → "0330_FluidR3_GM_sf2_file.js", var "_tone_0330_FluidR3_GM_sf2_file"
 */
function patchUrl(kind: 'drum' | 'melodic', gm: number): { url: string; varName: string } {
  if (kind === 'drum') {
    const padded = String(gm).padStart(2, '0');
    return {
      url: `${PATCH_BASE}${padded}0_FluidR3_GM_sf2_file.js`,
      varName: `_drum_${gm}_FluidR3_GM_sf2_file`,
    };
  }
  // melodic
  const padded = String(gm * 10).padStart(4, '0');
  return {
    url: `${PATCH_BASE}${padded}_FluidR3_GM_sf2_file.js`,
    varName: `_tone_${padded}_FluidR3_GM_sf2_file`,
  };
}

// ── 공개 API ───────────────────────────────────────────────────────────────────

/**
 * WebAudioFontPlayer 싱글턴 반환.
 *
 * 실제 패키지가 글로벌 방식이라 named import가 undefined일 수 있으므로
 * globalThis.WebAudioFontPlayer를 폴백으로 사용한다.
 * 테스트 환경에서는 vi.mock()이 WebAudioFontPlayer를 정상 주입하므로 폴백 불필요.
 */
export function getPlayer(): WebAudioFontPlayer {
  if (!_player) {
    // 실제 브라우저에서 named import가 작동하지 않을 때를 위한 방어 폴백.
    // webaudiofont는 script 태그 삽입 방식의 구식 패키지이므로 글로벌에 클래스가 올라온다.
    const Ctor: typeof WebAudioFontPlayer =
      WebAudioFontPlayer ??
      (globalThis as unknown as { WebAudioFontPlayer: typeof WebAudioFontPlayer })
        .WebAudioFontPlayer;

    if (!Ctor) {
      throw new Error(
        '[webaudiofont-bridge] WebAudioFontPlayer 클래스를 찾을 수 없습니다. ' +
          'webaudiofont 패키지 설치 또는 vi.mock() 설정을 확인하세요.',
      );
    }
    _player = new Ctor();
  }
  return _player;
}

/**
 * 지정 악기의 패치를 CDN에서 로드(또는 캐시 히트로 즉시 반환).
 *
 * @param kind - 'drum'(드럼 킷) | 'melodic'(선율 악기)
 * @param gm   - GM 번호 (드럼: 킷 번호, 선율: GM 0-127)
 */
export async function ensurePatch(kind: 'drum' | 'melodic', gm: number): Promise<LoadedInstrument> {
  const key = patchKey(kind, gm);
  const cached = patchCache.get(key);
  if (cached) return cached;

  const player = getPlayer();
  const ctx = getAudioContext();
  const { url, varName } = patchUrl(kind, gm);

  return new Promise<LoadedInstrument>((resolve, reject) => {
    try {
      player.loader.startLoad(ctx, url, varName);
      player.loader.waitLoad(() => {
        // waitLoad 콜백 시점에 globalThis[varName]이 패치 객체를 담고 있어야 한다.
        // 브라우저: startLoad가 script 태그를 삽입하고 전역 변수를 채움.
        // 테스트: beforeEach에서 globalThis에 직접 stub을 심어둔다.
        const patch = (globalThis as Record<string, unknown>)[varName];
        if (!patch) {
          reject(
            new Error(
              `[webaudiofont-bridge] 패치 변수 "${varName}"가 로드 후에도 존재하지 않습니다.`,
            ),
          );
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
 * InstrumentPreset의 drums/bass/guitar 3개 패치를 병렬 로드.
 *
 * 첫 호출에서 3개 CDN 요청이 동시 발사된다.
 * 이후 같은 preset 재호출 시 캐시 히트로 즉시 반환.
 */
export async function loadPreset(preset: InstrumentPreset): Promise<LoadedPreset> {
  const [drums, bass, guitar] = await Promise.all([
    ensurePatch('drum', preset.drumsKit),
    ensurePatch('melodic', preset.bass),
    ensurePatch('melodic', preset.guitar),
  ]);
  return { drums, bass, guitar };
}

/**
 * 테스트·HMR 정리용. 운영 코드에서 호출 금지.
 *
 * 싱글턴 player와 패치 캐시를 초기 상태로 되돌린다.
 * beforeEach/afterEach에서 각 테스트 간 격리를 보장.
 */
export function __resetWebAudioFontBridgeForTests(): void {
  _player = null;
  patchCache.clear();
}
