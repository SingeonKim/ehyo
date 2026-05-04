# Drum Sample Audit (Sprint 11)

> Sprint 11 Task 0 — `feat/voice-extensions`(PR-B)에서 `resolveTomNote` /
> `resolveCrashNote` 우선순위 결정 근거.

**Date:** 2026-05-03
**Method:** `curl https://smpldsnds.github.io/drum-machines/<KIT>/dm.json` →
`samples[].name` 추출

---

## LM-2 (pop / minor / folk default)

29 samples. 베이스 이름:

| 카테고리 | 실제 이름 |
|---|---|
| Kick | `kick`, `kick-alt` |
| Snare | `snare-h`, `snare-m`, `snare-l` |
| Hi-hat | `hhclosed`, `hhclosed-long`, `hhclosed-short`, `hhopen` |
| **Tom** | `tom-h`, `tom-hh`, `tom-m`, `tom-l`, `tom-ll` |
| **Crash** | `crash`, `ride` |
| Misc | `clap`, `cabasa`, `cowbell`, `tambourine`, `stick-h/m/l`, `conga-h/hh/l/ll/lll/m` |

**중요**: `tom-mid`/`tom-low`/`tom-high` literal 없음. tom-m(mid), tom-l(low),
tom-h(high)로 짧게 표기.

---

## TR-808 (jazz / funk default)

116 samples (velocity bin 변형 포함). 베이스 이름:

| 카테고리 | 실제 이름 (smplr 슬래시 alias 기준) |
|---|---|
| Kick | `kick` (bd0000~bd7575 16 variants) |
| Snare | `snare` (sd0000~sd7575 16 variants) |
| Hi-hat | `hihat-close` (`ch` alias), `hihat-open` (oh00~oh75 5 variants) |
| **Tom** | `mid-tom`, `tom-hi`, `tom-low` (각 5 variants) |
| **Crash** | `cymbal` (cy0000~cy7575 25 variants) — `crash` literal 없음 |
| Misc | `clap`, `clave`, `cowbell`, `maraca`, `rimshot`, `conga-hi/low/mid` |

**smplr 슬래시 컨벤션**: `name = "snare/sd0000"` 형식. smplr이 첫 / 앞부분을
group name(alias)으로, 뒷부분을 variant 식별자로 사용. `dm.sampleNames`이
어떤 형식으로 노출하는지(전체 vs base only) PR-B에서 spike 필요. Sprint 9
hat lookup 사례로 미루어 base name 단독 노출 가능성 높음.

---

## Roland CR-8000 (rock default)

13 samples. 가장 단순한 구조.

| 카테고리 | 실제 이름 |
|---|---|
| Kick | `kick` |
| Snare | `snare` |
| Hi-hat | `hihat-closed`, `hihat-open` |
| **Tom** | `tom-high`, `tom-low` |
| **Crash** | `cymball` (⚠️ **double-L 오타** — JSON 그대로) |
| Misc | `clap`, `clave`, `cowbell`, `cymball`, `rimshot`, `conga-high`, `conga-low` |

**중요**: crash가 `cymball`(double L)로 표기됨. 일반 `cymbal` lookup으로
못 잡음. 명시 lookup 필요.

---

## 결정 — Resolver 우선순위 (PR-B 구현 시 사용)

### `resolveTomNote(dm)` 후보 우선순위

```typescript
const candidates = [
  // 명시적 mid-tom 패밀리 (가장 균형잡힌 음역)
  'tom-mid', 'mid-tom', 'tom-m',
  // low tom (cinematic dread + 빌드업에 적합)
  'tom-low', 'tom-l',
  // high tom
  'tom-high', 'tom-hi', 'tom-h',
  // generic
  'tom',
];
// 그 외에는 startsWith('tom') 또는 includes('tom') fuzzy match.
// 최종 폴백: 'snare-l' → 'snare'
```

### `resolveCrashNote(dm)` 후보 우선순위

```typescript
const candidates = [
  'crash',           // LM-2
  'crash-1', 'crash-2',
  'cymbal',          // TR-808
  'cymball',         // ⚠️ Roland CR-8000 (typo)
];
// 그 외에는 startsWith('cymb') (cymbal/cymball/cymbals 다 catch).
// 최종 폴백: 'clap' → 'snare'
```

---

## 카드별 영향

| 카드 | 카테고리 default kit | tom resolve | crash resolve |
|---|---|---|---|
| epic-minor-cinematic | minor → LM-2 | 'tom-m' (LM-2 mid) | 'crash' (LM-2) |
| power-ballad-rock | rock → CR-8000 | 'tom-high' or 'tom-low' (CR-8000) | 'cymball' (typo, CR-8000) |
| punk-garage-rock | rock → CR-8000 | (사용 안 함) | 'cymball' (typo, CR-8000) |

세 카드 모두 정상 sample 이름으로 매핑됨 — *fallback path 발동 안 함*. cymball
typo는 **resolver chain에 명시적으로 포함**해야 안전.

---

## 후속 검증 (PR-B 단위 테스트로 cover)

1. 각 kit별 sampleNames mock으로 lookup 함수 호출 → 기대 이름 매칭
2. 빈 sampleNames → snare 폴백
3. WeakMap 캐시 동작 (반복 호출 시 dm.sampleNames 한 번만 읽음)
4. cymball 명시 (Roland CR-8000) 케이스 별도 테스트

PR-B 청취 검수 시 — 실제 smplr 인스턴스의 `dm.sampleNames` 출력 1회 console
dump로 확인 후 plan 업데이트.
