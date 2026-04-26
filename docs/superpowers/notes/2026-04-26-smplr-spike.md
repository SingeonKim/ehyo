# smplr API Spike — 2026-04-26

분석 방법: `node_modules/smplr/dist/index.d.ts` (TypeScript 선언 파일) + `index.js` (실제 구현) + `README.md` 정독.
브라우저 실행 없이 정적 분석만으로 도출한 결과이므로, 실제 오디오 품질·로드 성공 여부는 미해결 사항 섹션 참조.

---

## 패키지 정보

- **버전**: 0.20.0 (설치된 버전, package.json `^0.20.0`)
- **주요 export**: `Soundfont`, `DrumMachine`, `Reverb`, `SplendidGrandPiano`, `Sampler`, `Sequencer`, `Smplr`, `CacheStorage`, `getSoundfontNames`, `getSoundfontKits`, `getDrumMachineNames`
- **진입점**: `import { Soundfont, DrumMachine, Reverb } from 'smplr'`
- **CDN 기반**: 모든 샘플은 `https://smpldsnds.github.io/` 외부 CDN에서 런타임에 fetch. 서버 없이 클라이언트만으로 동작.

---

## Soundfont 클래스

### 생성자 시그니처

```ts
new Soundfont(context: AudioContext, options: SoundfontOptions)
```

`SoundfontOptions` (모두 optional이지만 `instrument` 또는 `instrumentUrl` 중 하나는 필수):

```ts
{
  kit?: "FluidR3_GM" | "MusyngKite";  // 기본값: "MusyngKite"
  instrument?: string;                // getSoundfontNames() 목록에서 선택
  instrumentUrl?: string;             // 직접 URL (kit 무시됨)
  destination?: AudioNode;            // 기본값: context.destination
  volume?: number;                    // 0~127, 기본값: 100
  velocity?: number;                  // 0~127, 기본값: 100
  storage?: Storage;                  // CacheStorage 주입 가능
  extraGain?: number;                 // 내부 gain 배율
  loadLoopData?: boolean;             // 루프 데이터 로딩 (실험적)
  loopDataUrl?: string;
  onLoadProgress?: (progress: LoadProgress) => void;
}
```

### `start({...})` payload 키와 타입

```ts
soundfont.start({
  note: string | number,    // 음 이름("C4") 또는 MIDI 번호(60) — 필수
  velocity?: number,         // 0~127
  time?: number,             // AudioContext.currentTime 기준 절대 초 단위 — 핵심 확인됨
  duration?: number | null,  // 초 단위, null이면 stop() 수동 호출 필요
  detune?: number,           // cent 단위
  lpfCutoffHz?: number,
  loop?: boolean,
  ampRelease?: number,
  stopId?: string | number,
  onStart?: (event: NoteEvent) => void,
  onEnded?: (event: NoteEvent) => void,
  reverse?: boolean,
})
```

**중요**: `time` 파라미터는 **절대 AudioContext.currentTime 기준**으로 동작함. 구현 코드:
```js
const startT = time != null ? time : this.context.currentTime;
```
Chris Wilson 패턴과 동일하게 사용 가능. ✅

### output 라우팅 방법

`soundfont.output`은 `OutputChannel` 타입. 4가지 방법:

1. **`addEffect(name, effect, mixValue)`** — send bus (병렬 믹스):
   ```ts
   soundfont.output.addEffect("reverb", new Reverb(context), 0.2)
   ```
2. **`sendEffect(name, mix)`** — 기존 send bus의 mix 값만 변경:
   ```ts
   soundfont.output.sendEffect("reverb", 0.5)
   ```
3. **`addInsert(effect)`** — 직렬 삽입 (insert 방식):
   ```ts
   soundfont.output.addInsert(gainNode)
   ```
4. **`setVolume(vol)`** — 마스터 볼륨 (0~127)
5. **`pan` setter** — 스테레오 pan (-1~1)

`destination` 옵션으로 생성자에서 GainNode 직결도 가능:
```ts
const masterGain = context.createGain();
const sf = new Soundfont(context, { instrument: '...', destination: masterGain });
```

### 사용 가능한 instrument 식별자

`getSoundfontNames()`가 반환하는 128개 General MIDI 이름 그대로 사용.
URL 패턴: `https://gleitz.github.io/midi-js-soundfonts/{kit}/{name}-{format}.js`

**우리 플랜에서 사용하는 식별자 검증 결과**:

| 플랜 식별자 | smplr 실제 식별자 | 일치 여부 |
|---|---|---|
| `electric_guitar_jazz` | `electric_guitar_jazz` | ✅ 일치 |
| `acoustic_bass` | `acoustic_bass` | ✅ 일치 |
| `nylon_guitar` | `acoustic_guitar_nylon` | ❌ **불일치** |
| `electric_bass_finger` | `electric_bass_finger` | ✅ 일치 |
| `electric_bass_pick` | `electric_bass_pick` | ✅ 일치 |
| `electric_guitar_clean` | `electric_guitar_clean` | ✅ 일치 |
| `electric_guitar_muted` | `electric_guitar_muted` | ✅ 일치 |
| `acoustic_guitar_steel` | `acoustic_guitar_steel` | ✅ 일치 |
| `overdriven_guitar` | `overdriven_guitar` | ✅ 일치 |

**핵심 수정 필요**: 플랜의 `nylon_guitar` → 실제 이름 `acoustic_guitar_nylon`.

추가로 확인된 유용한 Guitar/Bass 식별자:
- `distortion_guitar` — 디스토션
- `guitar_harmonics`
- `slap_bass_1`, `slap_bass_2`
- `fretless_bass`

---

## DrumMachine 클래스

### 생성자 시그니처

```ts
new DrumMachine(context: AudioContext, options?: DrumMachineOptions)
```

```ts
type DrumMachineOptions = {
  instrument?: string | DrumMachineInstrument;  // 기본값: "TR-808"
  url?: string;         // 직접 dm.json URL
  storage?: Storage;
  destination?: AudioNode;
  volume?: number;      // 0~127
  pan?: number;
  velocity?: number;
  onLoadProgress?: (progress: LoadProgress) => void;
}
```

### 사용 가능한 instrument 목록 (정확한 문자열)

`getDrumMachineNames()`로 확인 가능. **현재 코드에 하드코딩된 5개**:

```
"TR-808"       → https://smpldsnds.github.io/drum-machines/TR-808/dm.json
"Casio-RZ1"    → https://smpldsnds.github.io/drum-machines/Casio-RZ1/dm.json
"LM-2"         → https://smpldsnds.github.io/drum-machines/LM-2/dm.json
"MFB-512"      → https://smpldsnds.github.io/drum-machines/MFB-512/dm.json
"Roland CR-8000" → https://smpldsnds.github.io/drum-machines/Roland-CR-8000/dm.json
```

**`'acoustic'`, `'TR-808'`, `'jazz'` 같은 instrument 식별자 검증**:
- `'TR-808'` — ✅ 존재
- `'acoustic'` — ❌ **존재하지 않음**
- `'jazz'` — ❌ **존재하지 않음** (jazz brush 드럼 머신은 smplr 0.20.0에 없음)

### `start({...})` payload

DrumMachine.start()는 Smplr.start()를 래핑. 실제로:
```ts
dm.start({ note: "kick" })          // 그룹 이름으로 첫 샘플
dm.start({ note: "kick-1" })        // 특정 샘플 직접 지정
dm.start("kick")                    // 문자열 단축형도 동작
dm.start({ note: "kick", time: context.currentTime + 0.5 })  // time 스케줄링 가능
```

note는 **string** (그룹 이름 또는 샘플 이름). MIDI 번호도 가능하나 드럼은 string이 자연스러움.

TR-808 실제 샘플 이름은 CDN의 `dm.json`을 런타임에 가져오므로 정적 분석으로 확인 불가.
공식 README의 예시: `"kick"`, `"snare"`, `"hat"` 등 일반적인 키워드로 그룹이 구성됨.

### jazz brush 가용성

**확인 결과: smplr 0.20.0의 DrumMachine에는 jazz brush kit가 없음.**

5개 드럼 머신 중 jazz brush를 포함한 kit 없음. surikov CDN의 kit=32 결손과 마찬가지로,
smplr의 DrumMachine도 jazz brush를 직접 지원하지 않음.

**대안 전략**:
1. TR-808로 대체 (기본값, 현재 planed fallback 동일)
2. `Soundfont`를 사용해 General MIDI Channel 10 (drum channel) 직접 활용
   - `FluidR3_GM` kit + MIDI 번호로 jazz brush 노트 트리거 (MIDI 번호 41~45 범위가 brush 관련)
3. `Sampler` 클래스로 외부 jazz brush 샘플 URL 직접 주입 (완전한 제어 가능)

---

## Reverb 함수/클래스

### 시그니처

```ts
new Reverb(context: AudioContext)  // 동기 생성자 — 즉시 반환
```

내부적으로 AudioWorklet(`DattorroReverb`)을 async 로딩. 생성자는 동기지만 실제 effect는 async 준비됨.

```ts
reverb.ready(): Promise<Reverb>  // AudioWorklet 준비 완료 후 resolve
reverb.isReady: boolean          // 준비 상태 폴링
reverb.input: AudioNode          // 입력 노드 (connect 소스)
reverb.connect(output: AudioNode): void  // 출력 연결
```

파라미터 목록: `preDelay, bandwidth, inputDiffusion1, inputDiffusion2, decay, decayDiffusion1, decayDiffusion2, damping, excursionRate, excursionDepth, wet, dry`

**반환 노드 타입**: `AudioNode` (내부적으로 `AudioWorkletNode`)

**주의**: AudioWorklet 미지원 컨텍스트(OfflineAudioContext)에서는 Reverb 불가.

---

## 노드 라우팅

### `output.addEffect(name, node, mix)` 가능 여부

✅ **가능**. 정확한 시그니처:

```ts
output.addEffect(
  name: string,            // send bus 식별자 (나중에 sendEffect로 참조)
  effect: AudioNode | { input: AudioNode },  // AudioInsert 타입 포함
  mixValue: number         // 0~1 범위 gain
): void
```

내부 구현: `volume → mix gain → effect.input` 순으로 연결. send bus 방식이므로 dry 신호는 그대로 `destination`으로 흐르고, 추가로 wet 신호가 effect에 공급됨.

### `addInsert` (직렬 insert)

```ts
output.addInsert(effect: AudioNode | AudioInsert): void
```

직렬 연결: `input → ...inserts → volume → panner → destination`

### GainNode로 라우팅 (destination 직결)

생성자에서 `destination` 옵션으로 커스텀 노드에 연결:

```ts
const masterGain = context.createGain();
masterGain.connect(context.destination);

const sf = new Soundfont(context, {
  instrument: 'electric_guitar_jazz',
  destination: masterGain  // masterGain에 직결
});
```

이 방식이 기존 엔진의 `masterGain` 통합에 가장 자연스러움.

---

## 우리 플랜에 대한 영향

### 1. instrument 식별자 수정 필요

| 플랜 코드 위치 | 잘못된 식별자 | 올바른 식별자 |
|---|---|---|
| `bossa` bundle, `nylon_guitar` | `nylon_guitar` | `acoustic_guitar_nylon` |

나머지 7개 식별자는 smplr의 `getSoundfontNames()` 목록과 정확히 일치. ✅

### 2. DrumMachine `'jazz'` 식별자 — 존재하지 않음

플랜 검토 결과, 플랜 본문 자체에서도 DrumMachine에 `'jazz'`를 직접 쓰지 않고 TR-808을 기본으로 사용하고 있음(플랜 L89: `instrument: 'TR-808'`). "jazz brush 포함"은 Sprint 2-8의 목표 방향이었으나 smplr 0.20.0 DrumMachine으로는 달성 불가.

**권장 처리**: TR-808으로 계속 사용. 진짜 jazz brush는 추후 `Sampler` 클래스로 외부 샘플을 로드하거나 FluidR3_GM Soundfont의 MIDI ch10을 활용하는 별도 Task로 분리.

### 3. aux voice (shaker, clave) 처리

플랜 L367~369에 이미 임시 fallback이 있음:
```ts
const AUX_INSTRUMENT = {
  shaker: 'percussive_organ',  // 임시 — A1 spike 후 적합한 sfont로 교체
  clave: 'woodblock',          // 임시 — A1 spike 후 적합한 sfont로 교체
};
```

smplr `getSoundfontNames()` 목록에서 percussion 관련 확인:
- `woodblock` — ✅ 존재 (clave 대체용)
- `agogo` — ✅ 존재 (shaker/clave 느낌)
- `steel_drums` — ✅ 존재
- `taiko_drum` — ✅ 존재
- `percussive_organ` — ✅ 존재 (플랜의 임시값)
- `synth_drum` — ✅ 존재
- `melodic_tom` — ✅ 존재

**권장**: 플랜의 임시 fallback (`percussive_organ`, `woodblock`) 그대로 유지. 실제 브라우저 청취 후 더 나은 대안으로 교체. shaker에는 `agogo`도 고려할 만함.

DrumMachine의 TR-808 샘플 중 `hat`(closed hi-hat)가 shaker 대체로 리듬감 있게 쓰일 수 있음. 단 이는 DrumMachine.start()이고 Soundfont.start()와 혼용하는 별도 Voice 구현 필요.

---

## 미해결 사항 (사용자 수동 검증 필요)

### 브라우저 검증이 필요한 부분

1. **TR-808 실제 샘플 이름 목록**: `dm.json`은 CDN에서 런타임 로드. 실제 `getSampleNames()`/`getGroupNames()` 반환값을 브라우저 콘솔에서 확인해야 함:
   ```js
   const dm = new DrumMachine(context, { instrument: 'TR-808' });
   await dm.load;
   console.log(dm.getSampleNames());   // 정확한 샘플 이름 목록
   console.log(dm.getGroupNames());    // 그룹 이름 목록
   ```

2. **MusyngKite vs FluidR3_GM 음질 비교**: guitar/bass 악기의 실제 음질은 들어봐야 판단 가능. FluidR3_GM이 더 가벼움.

3. **Soundfont 로드 속도**: gleitz CDN의 각 instrument 파일 크기와 로드 시간. `electric_guitar_jazz`는 ~800KB 수준으로 예상되나 실측 필요.

4. **`woodblock`으로 clave 소리가 적합한지**: 정적 분석으로 음색 판단 불가. 브라우저에서 직접 청취 필요.

5. **`acoustic_guitar_nylon` 음색**: bossa nova에 적합한 음색인지 실제 청취 필요.

6. **Reverb AudioWorklet 지원 여부**: Next.js SSR 환경에서 `'use client'` 컴포넌트 안에서만 호출되어야 함. AudioWorklet은 Worker context에서 동작하므로 next.js 빌드에서 별도 주의 필요.

7. **CacheStorage + HTTPS**: 개발 환경(localhost)에서는 `CacheStorage`가 동작하지 않을 수 있음. 개발 시 반복 로드 속도 문제가 발생하면 `WATCHPACK_POLLING=true pnpm dev` 상황에서 Hot Reload 시마다 CDN re-fetch가 일어날 수 있음.

### 100% 확신 불가 항목

- DrumMachine `url` 옵션으로 커스텀 `dm.json` 포맷을 제공하면 jazz brush 샘플을 직접 로드할 수 있을 것으로 보이나, `DrumMachineInstrument` 타입의 정확한 `dm.json` 포맷은 CDN 원본 파일을 열어야 확인 가능.
- Soundfont의 `extraGain` 내부 기본값(코드상 명시 없음). 실제 볼륨 밸런스 조정 시 확인 필요.
