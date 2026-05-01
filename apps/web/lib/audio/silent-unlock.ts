/**
 * iOS Safari 무음 스위치 우회 — silent audio loop으로 audio session 카테고리 승격.
 *
 * 왜 필요한가:
 *   iOS Safari는 Web Audio API 출력을 기본적으로 'ambient' audio session에 둔다.
 *   ambient는 디바이스 무음 스위치를 따른다 → 스위치 ON이면 우리 메트로놈/배킹이 무음.
 *   동영상 등 일반 미디어가 무음 스위치를 무시하고 들리는 이유는 'playback' session이기 때문.
 *
 * 어떻게:
 *   첫 유저 제스처 안에서 silent loop을 <audio playsinline>으로 재생하면 페이지의
 *   audio session이 playback으로 승격된다. 이후 같은 페이지의 Web Audio 출력도
 *   무음 스위치를 무시하고 스피커로 나간다.
 *   엘리먼트는 살려두고 loop 유지 — 일부 iOS 버전에서 source가 죽으면 session이
 *   ambient로 다운그레이드되는 케이스 보고 있음.
 *
 * iOS 한정:
 *   다른 플랫폼에서는 무해하지만 무의미한 디코더 점유. UA로 게이트.
 *   iPadOS 13+는 macOS Safari로 보고하므로 maxTouchPoints로 보강 감지.
 *
 * Best-effort:
 *   play() 실패는 throw하지 않고 조용히 삼킨다. 우회는 부가 기능 — 실패해도 데스크톱·
 *   기존 환경 동작에는 영향 없게.
 */

let unlocked = false;
let element: HTMLAudioElement | null = null;
let silentUrl: string | null = null;

/** SSR 안전 — 첫 호출 때만 silent WAV Blob URL을 만들어 재사용. */
function getSilentWavUrl(): string {
  if (silentUrl) return silentUrl;

  // 0.5초 길이 8kHz mono 8-bit unsigned PCM 무음.
  // 너무 짧으면(예: 0~1 sample) 일부 iOS 버전에서 loop 인식이 불안정 — 0.5s가 안전선.
  const sampleRate = 8000;
  const samples = sampleRate / 2; // 0.5s
  const headerSize = 44;
  const dataSize = samples;
  const fileSize = headerSize + dataSize - 8;

  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
  };
  const writeU32 = (n: number) => {
    view.setUint32(offset, n, true);
    offset += 4;
  };
  const writeU16 = (n: number) => {
    view.setUint16(offset, n, true);
    offset += 2;
  };

  writeStr('RIFF');
  writeU32(fileSize);
  writeStr('WAVE');
  writeStr('fmt ');
  writeU32(16); // fmt chunk size
  writeU16(1); // PCM
  writeU16(1); // mono
  writeU32(sampleRate);
  writeU32(sampleRate); // byte rate = sampleRate * 1ch * 1byte
  writeU16(1); // block align
  writeU16(8); // bits per sample
  writeStr('data');
  writeU32(dataSize);
  // 8-bit unsigned PCM 무음 = 0x80 (signed로는 0)
  for (let i = 0; i < dataSize; i++) view.setUint8(offset++, 0x80);

  silentUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  return silentUrl;
}

/** iOS / iPadOS 감지. UA 우선 + 터치 가능한 Mac(iPadOS 위장)도 포함. */
function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * 첫 유저 제스처 콜백 안에서 호출. iOS면 silent loop 재생을 트리거.
 * 두 번째부터는 idempotent no-op.
 *
 * **반드시 동기 user-gesture 콜백 안에서 호출**해야 iOS가 play()를 허용한다.
 * await/setTimeout 뒤에서 호출하면 gesture 컨텍스트가 끊겨 자동재생 정책에 막힘.
 */
export function unlockIosAudioSession(): void {
  if (unlocked) return;
  if (typeof document === 'undefined') return;

  unlocked = true;
  if (!isIosLike()) return; // 데스크톱·안드로이드는 우회 불필요

  const audio = document.createElement('audio');
  audio.setAttribute('playsinline', 'playsinline');
  audio.setAttribute('webkit-playsinline', 'webkit-playsinline');
  audio.preload = 'auto';
  audio.loop = true;
  audio.src = getSilentWavUrl();
  // 화면 밖 + 접근성 트리에서 제외 — 시각·SR 모두 무영향.
  audio.style.position = 'absolute';
  audio.style.width = '0';
  audio.style.height = '0';
  audio.setAttribute('aria-hidden', 'true');
  audio.tabIndex = -1;
  // body에 붙여둬야 일부 iOS 버전에서 source가 회수되지 않고 session도 유지된다.
  document.body.appendChild(audio);
  element = audio;

  // play()는 호출자(유저 제스처) 안에서 동기적으로 호출. 실패는 조용히 삼킴.
  void audio.play().catch(() => {
    /* 무음 우회 실패 — 데스크톱 동작에는 영향 없음 */
  });
}

/** 테스트·hot reload 정리용. 앱 생명주기 중 통상 호출하지 않는다. */
export function __resetUnlockForTests(): void {
  unlocked = false;
  if (element) {
    try {
      element.pause();
      element.remove();
    } catch {
      /* noop */
    }
    element = null;
  }
  if (silentUrl) {
    URL.revokeObjectURL(silentUrl);
    silentUrl = null;
  }
}

/** 테스트용 inspector. */
export function __isUnlockedForTests(): boolean {
  return unlocked;
}
