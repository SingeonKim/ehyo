# Sprint 2-8 Design — Backing Track Quality & Variety Pass

> **Goal:** 카드 ▶ 클릭 시 들리는 사운드와 그루브를 *카테고리에 맞게 다르게* 만든다. 음질·악기·리듬·카탈로그 4축을 한 스프린트에서 같이 수정한다.

**Date:** 2026-04-26
**Sprint:** 2-8 (Phase 4 후속)
**Status:** Approved (사용자 승인)

---

## 1. 개요와 배경

### 현재 상태 (2026-04-26 기준)

- 백엔드 정적 카탈로그 10개 — blues 3, pop 2, jazz 1, minor 1, modal 3.
- 모든 카테고리가 동일한 단일 `BACKBEAT_DRUMS` + `BACKBEAT_BASS` + `EIGHTH_STRUM` 패턴 재생.
- 사운드는 `surikov.github.io/webaudiofontdata` CDN (FluidR3 sf2). DrumKit 가용성이 0/8/16/24/25 한정 → jazz brush(kit=32) 결손, jazz 카드는 Standard kit 폴백.
- AudioContext 단일 인스턴스 + masterGain → ctx.destination 직결. 마스터 이펙트 없음.
- Bass −24, Guitar −12 옥타브 다운, root position 코드 보이싱 고정.

### 사용자 요구

1. 오디오 음질 대폭 강화
2. 일부 카테고리는 도메인에 따른 악기 구성 변경
3. 도메인 조사로 카탈로그별 리듬 고도화 — 각 마디별 리듬도 적절히 변화
4. 카탈로그 50%+ 증가, 특히 블루스 minor 3+, major 2+ 추가

### 결정 요약 (브레인스토밍 합의)

| 축 | 선택 | 이유 |
|---|---|---|
| 음질 강화 방향 | 사운드폰트 교체 + 마스터 이펙트 둘 다 | 결손(jazz brush) 해소 + 평탄화·공간감 동시 |
| 사운드 라이브러리 | smplr (Soundfont + DrumMachine) | 동일 sf2 CDN 재사용 + 재즈 브러시 내장 + Reverb 헬퍼 |
| 리듬 변화 수준 | 도메인 기반 다중 패턴 + selectSlot 함수 | 단순 groove/pickup 두 종 이상 — 카테고리당 2~4 슬롯 |
| 카탈로그 증가 | 10 → 17 (+7) | blues +5, funk +1 NEW, bossa +1 NEW |
| 마스터 FX | Compressor + 짧은 Reverb (wet 0.18) | 카테고리별 wet 조정은 Sprint 2-9로 미룸 |

### 비-목표 (이번 스프린트 X)

- voice별 EQ
- 카테고리별 reverb wet 레벨 차등 (→ Sprint 2-9)
- humanize / velocity 레이어 다양화
- 코드 보이싱 인버전
- RhythmRecipe 풀 시스템 (4~8 슬롯 + 글로벌 schedule) — 본 스프린트는 슬롯 2~4개로 한정
- 16마디 이상 카탈로그
- 슬롯당 다중 변형 (funk pickup이 3개 fill 돌려쓰기 등)

---

## 2. 아키텍처

### 노드 그래프 (master FX 추가 후)

```
voices (drums, bass, guitar, aux)
   │  각 voiceGain
   ▼
masterGain (0.6, 사용자 볼륨 슬라이더와 곱연산)
   ▼
DynamicsCompressorNode  (threshold −18, ratio 3, attack 5ms, release 200ms, knee 6dB)
   ▼
ChannelSplitter (구현은 dryGain + wetGain 두 갈래로 분기)
   │
   ├── dryGain (0.82) ─────────────────────┐
   └── wetGain (0.18) → ConvolverNode ─────┤
                                            ▼
                                       ctx.destination
```

- 노드는 엔진 인스턴스(`getEngine()`) 생성 시 한 번 생성, 영구 보존.
- 카드 stop 시 voiceGain만 0으로 ramp. FX 노드는 유지 → 다음 카드 sf2 재할당만 발생.

### 사운드 엔진 — smplr 도입

`webaudiofont-bridge.ts` 폐기, `smplr-bridge.ts` 신규.

- smplr 라이브러리 (`@smplr/smplr` 또는 `smplr` npm — plan 단계에서 정확한 패키지명 확정)
- AudioContext 인자 주입 — 단일 AudioContext 원칙 유지
- `Map<string, Promise<Soundfont|DrumMachine>>` 캐시로 카테고리별 인스턴스 1회만 생성
- voice 추상화(`voices/drums.ts`, `voices/bass.ts`, `voices/guitar.ts`)의 시그니처 0줄 변경 — 내부 호출만 smplr로 교체

### `InstrumentBundle` 타입

기존 `InstrumentPreset` 폐기:

```ts
type InstrumentBundle = {
  label: string;
  drums: { machine: 'acoustic' | 'jazz-brush' | 'tr808' | 'lm2'; volume?: number };
  bass:  { instrument: string; octaveShift?: number };
  guitar: { instrument: string; octaveShift?: number };
  aux?:  { kind: 'shaker' | 'clave'; pattern: 'bossa' | 'funk-16' };
};
```

카테고리 → 번들 매핑:

| category | drums | bass | guitar | aux |
|---|---|---|---|---|
| pop | acoustic | electric_finger | clean_electric | – |
| rock | acoustic | electric_pick | clean_electric | – |
| funk | acoustic | electric_pick | muted_electric | shaker(funk-16) |
| jazz | **jazz-brush** | acoustic_upright | jazz_guitar | – |
| blues | acoustic | electric_finger | overdrive | – |
| folk | acoustic | electric_finger | steel_acoustic | – |
| bossa | acoustic (soft) | acoustic_upright | nylon | clave(bossa) |
| minor | acoustic | electric_finger | clean_electric | – |
| modal | acoustic | electric_finger | clean_electric | – |

`aux` voice는 funk·bossa만 — voice 인터페이스 동일(`playAux(time, vel)`).

### RhythmPattern 시스템

#### 데이터 구조

```ts
// patterns/types.ts (확장)
type BarPattern = {
  drums: DrumPattern;
  bass: BassPattern;
  guitar: StrumPattern;
  aux?: AuxPattern;
};

type CategoryRhythm = {
  patterns: Readonly<Record<string, BarPattern>>;
  selectSlot: (tpl: ProgressionTemplate, barIndexAbs: number) => string;
};
```

#### 디렉토리

```
lib/audio/backing/patterns/
├── types.ts                  # BeatStep, parseBeatStep — 유지
├── library/
│   ├── pop.ts
│   ├── rock.ts
│   ├── funk.ts
│   ├── jazz.ts
│   ├── blues.ts
│   ├── folk.ts
│   ├── bossa.ts
│   ├── minor.ts
│   └── modal.ts
└── index.ts                  # CATEGORY_RHYTHMS = { pop, rock, ... }
```

기존 `backbeat.ts`, `strumming.ts`는 plan 단계에서 패턴 데이터 추출 후 제거.

#### selectSlot 도메인 규칙

각 카테고리 파일이 자기 selectSlot을 소유 — 엔진은 단순 디스패처.

| category | 슬롯 | selectSlot 규칙 |
|---|---|---|
| pop | `groove_a`, `groove_b`, `turnaround` | 마지막 마디 = turnaround, 짝수 = groove_a, 홀수 = groove_b |
| rock | `groove`, `pickup_eighth`, `fill_quarter` | tpl.bars≥4 && local==tpl.bars-1 → fill_quarter, ==tpl.bars-2 → pickup_eighth, else groove |
| funk | `groove_a`, `groove_b`, `pickup_one` | 1bar vamp: 4사이클 마지막에 pickup_one, 8마디 안에서 a/b alternate. 일반: 마지막 마디 = pickup_one, 짝수 = groove_a, 홀수 = groove_b |
| jazz | `walk`, `walk_approach`, `comp_only` | 마지막 마디 = walk_approach, 그 외 walk |
| blues | `shuffle_a`, `shuffle_b`, `iv_pickup`, `turnaround` | 12bar에서 local==3 → iv_pickup, local∈{10,11} → turnaround, else 짝수 a / 홀수 b. 비-12bar는 shuffle_a 디폴트 |
| folk | `picking`, `strum_8th`, `pickup` | 마지막 마디 = pickup, 짝수 = picking, 홀수 = strum_8th |
| bossa | `clave_3_2`, `clave_2_3`, `pickup` | 마지막 마디 = pickup, 그 외 idx/2 짝수 = clave_3_2, 홀수 = clave_2_3 |
| minor | `groove_8th`, `groove_16th_sparse`, `pickup` | 마지막 마디 = pickup, BPM 기준 ≤90 = 16th_sparse, 그 외 = 8th |
| modal | `groove_a`, `groove_b` | 짝수 = groove_a, 홀수 = groove_b |

> 모든 selectSlot은 결정론. 같은 `(template, barIndexAbs)` → 같은 슬롯.

#### 엔진의 책임

```ts
const rhythm = CATEGORY_RHYTHMS[tpl.category];
const slot = rhythm.selectSlot(tpl, barIndexAbs);
const pattern = rhythm.patterns[slot];
schedulePatternForBar(pattern, barStartTime, currentMidi);
```

엔진은 *어떤 슬롯이 어떻게 다른지* 모름. patterns[slot]만 들여다봄. 카테고리 추가 = library/ 파일 1개 + index.ts 1줄.

---

## 3. 카탈로그 +7 (정확한 데이터)

### Blues +5

| slug | name | bars | BPM | progression | recommended_scales |
|---|---|---|---|---|---|
| `slow-minor-blues` | Slow Minor Blues | 12 | 70 | i7 i7 i7 i7 \| iv7 iv7 i7 i7 \| V7 iv7 i7 V7 | minor_blues, dorian, minor_pentatonic |
| `hard-bop-minor-blues` | Hard Bop Minor Blues | 12 | 130 | i7 i7 i7 i7 \| iv7 iv7 i7 i7 \| iim7b5 V7 i7 V7 | minor_blues, dorian |
| `shuffle-minor-blues` | Shuffle Minor Blues | 12 | 100 | i7 iv7 i7 i7 \| iv7 iv7 i7 i7 \| V7 iv7 i7 V7 | minor_blues, minor_pentatonic |
| `jazz-major-blues` | Jazz Major Blues | 12 | 120 | Imaj7 I7 IVmaj7 ivm7 \| IVmaj7 bVII7 iiim7 VI7 \| iim7 V7 Imaj7 V7 | mixolydian, major_blues, dorian |
| `jump-blues` | Jump Blues | 12 | 140 | I7 IV7 I7 I7 \| IV7 IV7 I7 I7 \| V7 IV7 I7 V7 | major_blues, mixolydian |

### 신규 카테고리 활성화

| slug | name | category | bars | BPM | progression | scales |
|---|---|---|---|---|---|---|
| `funk-i7-vamp` | Funk I7 Vamp | funk | 1 | 110 | I7 | mixolydian, minor_pentatonic, major_blues |
| `bossa-i-iv-ii-v` | Bossa I–IV–ii–V | bossa | 4 | 130 | Imaj7 IVmaj7 iim7 V7 | major, lydian |

### 시드 변경

- `apps/api/app/scripts/seed.py`의 `SEED_TEMPLATES`에 위 7개 dict 추가 (idempotent — 기존 10개 유지).
- `apps/api/tests/test_progression_templates.py`에 신규 slug 검증 + 카탈로그 카운트 17 단언.

### 프론트 영향

- `lib/api/progression-templates.ts`의 `ListParams.category` union이 `'funk' | 'bossa' | 'rock' | 'folk'` 포함하도록 보강.
- `ProgressionCatalogClient`는 카테고리 그룹핑 자동 — 신규 카드가 funk·bossa 섹션에 자동 노출.

---

## 4. 테스트 전략

### Unit (Vitest)

| 파일 | 검증 |
|---|---|
| `tests/unit/lib/audio/backing/patterns/library/<category>.test.ts` (9 파일) | selectSlot 도메인 규칙 — 마디 인덱스별 슬롯 매핑 |
| `tests/unit/lib/audio/backing/patterns/shape.test.ts` | 모든 BarPattern이 한 마디 안의 step만, 시간 오름차순, 중복 없음 |
| `tests/unit/lib/audio/backing/presets.test.ts` (갱신) | 9개 카테고리 × InstrumentBundle 형식 + 알 수 없는 카테고리 → pop fallback |
| `tests/unit/lib/audio/backing/select-pattern.test.ts` | 12bar blues 4·11·12 마디 분기, 1bar funk vamp 4사이클 분기 |

### Integration (scheduler spy)

| 시나리오 | 검증 |
|---|---|
| `engine-rhythm.test.ts` | 카드 1 사이클 재생 시 spy로 잡힌 voice 호출 시각이 카테고리별 expected pattern과 일치 |
| `engine-fx-chain.test.ts` | 엔진 init 후 master chain 토폴로지가 voiceGain → masterGain → compressor → splitter |
| `engine-instrument-bundle.test.ts` | jazz 카드 = jazz-brush DrumMachine, bossa 카드 = nylon guitar + clave aux 요청 |

### Component (Testing Library)

- `ProgressionCatalogClient`: 카탈로그 17개일 때 카테고리 헤더 9개 (pop·rock·funk·jazz·blues·folk·bossa·minor·modal).

### E2E (Playwright, Docker)

- `tests/e2e/jam-backing.spec.ts`에 funk·bossa 카드 ▶/stop 시나리오 추가 (재생 성공 검증, 음색 X).
- 17개 전체 검증은 비용 → 카테고리당 1장 샘플링.

### API (pytest)

- `apps/api/tests/test_progression_templates.py`:
  - 카탈로그 총 개수 17 단언
  - 신규 7 slug가 GET 응답 포함
  - `?category=funk`, `?category=bossa` 필터 정상 결과

---

## 5. 단계적 머지 (PR 분할)

큰 변경이라 단일 PR로 가면 리뷰 어려움 → 4개 PR로 분할. 각 PR이 독립적으로 main 머지 가능 (앱이 작동), 문제 발견 시 단일 PR revert 가능.

| PR | 범위 | 행동 변화 |
|---|---|---|
| **PR-A** | smplr 도입 + voice 백엔드 교체 (webaudiofont-bridge → smplr-bridge) | 0 (voice API 시그니처 동일, 사운드 거의 동일) |
| **PR-B** | Master FX 체인 (compressor + reverb wet 0.18) | 미세 (전체적으로 평탄화 + 공간감) |
| **PR-C** | RhythmPattern + InstrumentBundle 9개 카테고리 모두 + jazz brush 활성화 | 큼 (체감 변화 가장 큰 PR) |
| **PR-D** | 카탈로그 +7 (seed.py 갱신 + API/UI 노출) | 카드 7장 추가 |

### 수동 스모크 체크리스트 (각 PR 머지 전)

- 9개 카테고리 카드 1장씩 ▶ → 무음 없음
- jazz: 브러시 사운드인가
- funk-i7-vamp: 4마디 사이클로 패턴이 변하는가
- bossa-i-iv-ii-v: clave 들리는가, 2마디마다 3-2 ↔ 2-3 토글
- 12-bar-blues-major: 4·11·12마디 fill/turnaround 들리는가
- 마스터 reverb wet 0.18이 적당한가 (너무 wet하지 않은가)

---

## 6. 위험과 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| smplr 데이터 URL 형식이 surikov와 비호환 | PR-A 작업 막힘 | plan 단계에서 데이터 소스 결정 추가 — smplr 공식 데이터셋(@smplr/smplr-data 또는 GitHub raw) 사용 |
| 첫 fetch 지연이 surikov보다 느림 | UX 회귀 | loading state UI 보강 — 카드 ▶ 버튼이 spinner로 변경 |
| 카테고리별 InstrumentBundle 음색이 의도와 다름 | 청취 인상 저하 | PR-C 머지 전 수동 스모크 (카테고리별 1장씩) |
| 마스터 reverb가 너무 wet | 답답함 | wet 비율을 코드 상수로 노출 + 0.18 디폴트, 머지 전 청취 |
| compressor가 다이내믹을 너무 짓누름 | 펑크/재즈가 평탄해짐 | threshold/ratio를 plan 단계에서 1차 튜닝, 청취 후 조정 |
| 카탈로그 7개 중 jazz-major-blues 진행이 우리 로마 파서와 충돌 | seed 추가 실패 | plan 단계에서 `lib/theory/chords.ts`로 각 마디 chord 문자열 사전 검증 |
| 한 PR에 변경이 너무 많아 리뷰 어려움 | 머지 지연 | 4개 PR 분할 (위) |

---

## 7. 산출물 체크리스트

스프린트 완료 = 다음 모두 main에 머지:

- [ ] PR-A: smplr 백엔드 교체 (행동 변화 0)
- [ ] PR-B: Master FX 체인
- [ ] PR-C: RhythmPattern + InstrumentBundle (9개 카테고리)
- [ ] PR-D: 카탈로그 +7
- [ ] 모든 단위 테스트 통과 (커버리지 회귀 없음)
- [ ] E2E 통과 (Docker)
- [ ] 수동 스모크 체크리스트 6개 항목 모두 OK
- [ ] CLAUDE.md 트러블슈팅 섹션의 "WebAudioFont 카드 일부가 무음" 항목 갱신 (smplr 전환으로 jazz 폴백 자체 해소)

---

## 부록 A — 도메인 레퍼런스

- **Funk 16th hat groove**: Clyde Stubblefield "Funky Drummer" 패턴 — kick 1, snare 2-and·4, hat 16th × 16 with accents on 1·3·… 대표.
- **Jazz brush ride**: Ed Thigpen / Vernel Fournier 스타일 — circular brush on snare, ride cymbal swing 8th "ding-da-DING-da-DING".
- **Bossa partido alto**: Jobim 표준 — clave 3-2 또는 2-3, snare(rim) on syncopated 16th, kick 1·"3-and".
- **Blues shuffle 12/8**: Jimmy Reed / BB King — long-short eighth (2:1 ratio), kick 1·3, snare 2·4.
- **Bird Blues**: Charlie Parker "Blues for Alice" — 12bar with iim7-V7 turnaround substitutions throughout. 본 스프린트는 1 chord/bar 제약 안에서 단순화.
- **Mr. PC**: Coltrane minor blues — i7 + iim7b5-V7 turnaround (9·10마디).
- **Jump Blues**: Louis Jordan / Big Joe Turner — fast shuffle BPM 130~160, T-Bone Walker 류 솔로 어휘.
