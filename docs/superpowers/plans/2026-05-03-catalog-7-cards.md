# Sprint 11 — 카탈로그 +7장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카탈로그 22 → 29장. jazz·minor·funk·bossa·folk·rock 6개 카테고리에 신규 카드 7장(각 신규 rhythm variant 동반) 추가. 사전 인프라 3건(슬래시 코드 파서·guitar voicingMode·drums tom·crash dynamic lookup) 동반.

**Architecture:** 기존 카드 프로필 시스템(Sprint 9) + swing/triplet8 모델 그대로 사용. 변경 범위 = `lib/theory/chords.ts` 슬래시 확장 + `voices/{guitar,drums,bass}.ts` 옵션 추가 + `patterns/library/*` 에 7 variant + `card-profiles.ts` 7 entry + `catalog.json` 7 entry. DB 스키마·Alembic·localStorage 변경 0.

**Tech Stack:** Next.js 15 App Router, Vitest + Testing Library, Playwright(Docker), smplr(Soundfont/DrumMachine), FastAPI/SQLAlchemy(seed only).

**Spec:** `docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md`

**브랜치 전략:** main이 자동 배포 → `feat/catalog-7-cards` 통합 브랜치 + 8 sub-PR + 1 통합 PR(`PR-I`).

---

## File Structure

### 신규 파일

| 파일 | 책임 |
|---|---|
| `apps/web/tests/unit/lib/theory/chords-slash.test.ts` | 슬래시 코드 파서 단위 테스트 (15+5 케이스) |
| `apps/web/tests/unit/lib/theory/chord-display-slash.test.ts` | 슬래시 round-trip Roman↔Absolute 테스트 |
| `apps/web/tests/unit/lib/audio/backing/voices/guitar-voicing.test.ts` | `voicingMode='power'` 트리거 단위 테스트 |
| `apps/web/tests/unit/lib/audio/backing/voices/drums-lookup.test.ts` | tom/crash dynamic lookup 단위 테스트 |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/jazz-autumn.test.ts` | autumn_leaves selectSlot + swing perVariant 단위 테스트 |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/minor-epic.test.ts` | epic_minor_halftime selectSlot + 패턴 spy |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/funk-form16.test.ts` | funk_form_16 selectSlot + stop-time spy |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/bossa-chromatic.test.ts` | bossa_chromatic selectSlot + 4× stab spy |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/folk-travis.test.ts` | travis_pick selectSlot + 드럼 비움 + 슬래시 베이스 발현 |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/rock-power-ballad.test.ts` | power_ballad selectSlot + 패턴 spy |
| `apps/web/tests/unit/lib/audio/backing/patterns/library/rock-punk.test.ts` | punk_8th selectSlot + voicingMode='power' 발현 |

### 수정 파일

| 파일 | 변경 |
|---|---|
| `apps/web/lib/theory/chords.ts` | 슬래시 코드 파싱 (`'V/VII'` → `bassDegree` + `bassSemitones`) |
| `apps/web/lib/theory/chord-display.ts` | Roman↔Absolute 변환 시 슬래시 베이스 처리 |
| `apps/web/lib/theory/chord-voicing.ts` | `chordBassMidi(symbol, keyRoot, octave)` 신규 export |
| `apps/web/lib/audio/backing/voices/guitar.ts` | `voicingMode?: 'full' \| 'power'` 옵션 |
| `apps/web/lib/audio/backing/voices/drums.ts` | `resolveTomNote` / `resolveCrashNote` 추가, trigger에 'tom'/'crash' 케이스 |
| `apps/web/lib/audio/backing/engine.ts` | 베이스 midi 계산을 `chordBassMidi`로 교체 |
| `apps/web/lib/audio/backing/patterns/library/jazz.ts` | `autumn_walk`/`autumn_turnaround` 슬롯 + selectSlot 분기 + swing perVariant |
| `apps/web/lib/audio/backing/patterns/library/minor.ts` | `epic_main`/`epic_climax`/`epic_resolve` 슬롯 + selectSlot 분기 |
| `apps/web/lib/audio/backing/patterns/library/funk.ts` | `funk_a_main`/`funk_b_iv`/`funk_bridge_c`/`funk_stop_resolve` 슬롯 + selectSlot |
| `apps/web/lib/audio/backing/patterns/library/bossa.ts` | `bossa_chromatic_main`/`bossa_chromatic_resolve` 슬롯 + selectSlot |
| `apps/web/lib/audio/backing/patterns/library/folk.ts` | `travis_main`/`travis_resolve` 슬롯 + selectSlot |
| `apps/web/lib/audio/backing/patterns/library/rock.ts` | `pb_intro`/`pb_main`/`pb_climax`/`pb_resolve` + `punk_main`/`punk_climax` + selectSlot |
| `apps/web/lib/audio/backing/card-profiles.ts` | 신규 7 entry |
| `apps/web/lib/api/catalog.json` | 신규 7 entry |
| `apps/web/tests/e2e/jam-card-profiles.spec.ts` | 신규 6 카드 E2E (카테고리당 1장) |
| `apps/api/tests/test_progression_templates.py` | 신규 7 슬러그 시드 회귀 |

### 변경 없는 파일

- `apps/web/lib/store/app-store.ts` — localStorage v12 유지
- `apps/api/alembic/versions/*` — 마이그레이션 0
- `apps/api/app/scripts/seed.py` — catalog.json 자동 반영

---

## Task 0: 통합 브랜치 + Drum sample 사전 검증

**목표:** `feat/catalog-7-cards` 통합 브랜치 생성 + smplr DrumMachine kit별 tom/crash sample 존재 확인.

**Files:**
- Create: `docs/superpowers/notes/2026-05-03-drum-sample-audit.md` (audit 결과 노트)

- [ ] **Step 1: main에서 통합 브랜치 분기**

```bash
git checkout main && git pull origin main
git checkout -b feat/catalog-7-cards
git push -u origin feat/catalog-7-cards
```

- [ ] **Step 2: LM-2 / TR-808 / Roland-CR-8000 sample 목록 dump**

```bash
mkdir -p docs/superpowers/notes
for kit in LM-2 TR-808 Roland-CR-8000; do
  echo "=== $kit ===" >> /tmp/dm-samples.txt
  curl -s "https://smpldsnds.github.io/drum-machines/$kit/dm.json" | jq '.sampleNames' >> /tmp/dm-samples.txt
done
cat /tmp/dm-samples.txt
```

Expected: 각 kit의 sampleNames 배열이 출력. tom·crash 후보 이름 식별.

- [ ] **Step 3: audit 결과 노트 작성**

다음 형식으로 `docs/superpowers/notes/2026-05-03-drum-sample-audit.md`에 기록:

```markdown
# Drum Sample Audit (Sprint 11)

## LM-2 (minor / folk / pop default)
- Tom 후보: [실제 dump 결과에서 식별]
- Crash 후보: [실제 dump 결과에서 식별]
- 폴백: [tom 부재 시 'snare-l', crash 부재 시 'clap']

## TR-808 (jazz / funk default)
... (위와 동일)

## Roland CR-8000 (rock default)
... (위와 동일)

## 결정
- `resolveTomNote` 우선순위: [...]
- `resolveCrashNote` 우선순위: [...]
- 카드별 영향: epic_climax / pb_climax / punk_climax 모두 fallback path 검증 필요.
```

- [ ] **Step 4: 노트 커밋**

```bash
git add docs/superpowers/notes/2026-05-03-drum-sample-audit.md
git commit -m "$(cat <<'EOF'
docs(notes): drum sample audit for Sprint 11 tom/crash lookup

LM-2 / TR-808 / Roland CR-8000의 sampleNames dump 결과 정리.
PR-B의 resolveTomNote / resolveCrashNote 우선순위 결정 근거.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin feat/catalog-7-cards
```

---

## Task 1 (PR-A): chord 파서 슬래시 확장

**목표:** `parseRoman('V/VII')`이 `{ bassDegree: 7, bassSemitones: 11, ... }`을 반환하도록 확장. `chordBassMidi` 함수 신설. `chord-display`도 슬래시 round-trip 지원.

**브랜치:** `feat/parser-slash-chord` (off `feat/catalog-7-cards`)

**Files:**
- Modify: `apps/web/lib/theory/chords.ts`
- Modify: `apps/web/lib/theory/chord-display.ts`
- Modify: `apps/web/lib/theory/chord-voicing.ts`
- Modify: `apps/web/lib/audio/backing/engine.ts`
- Create: `apps/web/tests/unit/lib/theory/chords-slash.test.ts`
- Create: `apps/web/tests/unit/lib/theory/chord-display-slash.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards
git checkout -b feat/parser-slash-chord
```

- [ ] **Step 2: 슬래시 파서 실패 테스트 작성**

Create `apps/web/tests/unit/lib/theory/chords-slash.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { parseRoman, romanToChord } from '@/lib/theory/chords';

describe('parseRoman — slash chord', () => {
  describe('valid', () => {
    it('I/VII (C/B in C key) — major triad with VII degree bass', () => {
      const r = parseRoman('I/VII');
      expect(r).not.toBeNull();
      expect(r!.degree).toBe(1);
      expect(r!.quality).toBe('major');
      expect(r!.rootSemitones).toBe(0);
      expect(r!.bassDegree).toBe(7);
      expect(r!.bassSemitones).toBe(11);
    });

    it('vim/V (Am/G) — minor triad with V degree bass', () => {
      const r = parseRoman('vim/V');
      expect(r!.degree).toBe(6);
      expect(r!.quality).toBe('minor');
      expect(r!.rootSemitones).toBe(9);
      expect(r!.bassDegree).toBe(5);
      expect(r!.bassSemitones).toBe(7);
    });

    it('I/III (C/E) — first inversion', () => {
      const r = parseRoman('I/III');
      expect(r!.bassDegree).toBe(3);
      expect(r!.bassSemitones).toBe(4);
    });

    it('iim7/V (Dm7/G) — m7 with V bass', () => {
      const r = parseRoman('iim7/V');
      expect(r!.quality).toBe('minor7');
      expect(r!.bassDegree).toBe(5);
      expect(r!.bassSemitones).toBe(7);
    });

    it('bIII/V — flat root with V bass', () => {
      const r = parseRoman('bIII/V');
      expect(r!.degree).toBe(3);
      expect(r!.rootSemitones).toBe(3); // bIII = 4 - 1 = 3
      expect(r!.bassDegree).toBe(5);
      expect(r!.bassSemitones).toBe(7);
    });

    it('V/bVII — V with flat 7 bass', () => {
      const r = parseRoman('V/bVII');
      expect(r!.degree).toBe(5);
      expect(r!.bassDegree).toBe(7);
      expect(r!.bassSemitones).toBe(10); // bVII = 11 - 1 = 10
    });

    it('I7/V — dominant7 with V bass', () => {
      const r = parseRoman('I7/V');
      expect(r!.quality).toBe('dominant7');
      expect(r!.bassDegree).toBe(5);
    });

    it('Imaj7/III — maj7 with III bass', () => {
      const r = parseRoman('Imaj7/III');
      expect(r!.quality).toBe('major7');
      expect(r!.bassDegree).toBe(3);
    });
  });

  describe('invalid — return null', () => {
    it('rejects V/8 (invalid degree)', () => {
      expect(parseRoman('V/8')).toBeNull();
    });
    it('rejects V/ (empty bass)', () => {
      expect(parseRoman('V/')).toBeNull();
    });
    it('rejects V//VII (double slash)', () => {
      expect(parseRoman('V//VII')).toBeNull();
    });
    it('rejects /VII (no chord body)', () => {
      expect(parseRoman('/VII')).toBeNull();
    });
    it('rejects V/bb3 (invalid bass prefix)', () => {
      expect(parseRoman('V/bb3')).toBeNull();
    });
  });

  describe('non-slash chords (regression)', () => {
    it('V (no slash) leaves bassDegree undefined', () => {
      const r = parseRoman('V');
      expect(r!.bassDegree).toBeUndefined();
      expect(r!.bassSemitones).toBeUndefined();
    });
    it('iim7 (no slash) leaves bassDegree undefined', () => {
      const r = parseRoman('iim7');
      expect(r!.bassDegree).toBeUndefined();
    });
  });

  describe('romanToChord — slash retains semitones', () => {
    it('I/VII semitones는 chord triad 그대로 (베이스는 별도 필드)', () => {
      const r = romanToChord('I/VII');
      expect(r!.semitones).toEqual([0, 4, 7]);
      expect(r!.bassSemitones).toBe(11);
    });
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chords-slash.test.ts`

Expected: 모든 valid 테스트가 `bassDegree to be 7` 등으로 FAIL — 파서가 아직 슬래시를 모르고 `null` 반환.

- [ ] **Step 4: 파서 슬래시 로직 구현**

Modify `apps/web/lib/theory/chords.ts`:

먼저 `ParsedChord` 인터페이스에 슬래시 필드 추가 (line 57-66):

```typescript
export interface ParsedChord {
  /** 스케일 상의 도수 (1~7). 없으면 null. */
  degree: number;
  /** Key 루트로부터의 반음 오프셋 (0~11). major 스케일 기준 degree 오프셋 + 품질 변형. */
  rootSemitones: number;
  /** 코드 품질. */
  quality: ChordQuality;
  /** 화성 구성 피치 클래스 목록 (키에 루트를 적용하면 실제 연주 노트). */
  semitones: readonly number[];
  /** 슬래시 코드의 베이스 도수 (1~7). 없으면 undefined. */
  bassDegree?: number;
  /** 베이스의 반음 오프셋 (0~11, prefix b/# 적용 후). */
  bassSemitones?: number;
}
```

`parseRoman` 함수에 슬래시 분리 + 재귀 파싱 로직 추가 (함수 시작 부분 line 99~):

```typescript
export function parseRoman(symbol: string): Omit<ParsedChord, 'semitones'> | null {
  // 슬래시 코드 분리 — 'V/VII' → chord='V', bass='VII'
  // '/' 0개: 일반 코드 (기존 로직)
  // '/' 1개: 본체와 베이스로 분리 후 둘 다 파싱
  // '/' 2개 이상 또는 빈 측: invalid
  const slashIdx = symbol.indexOf('/');
  if (slashIdx >= 0) {
    const chordPart = symbol.slice(0, slashIdx);
    const bassPart = symbol.slice(slashIdx + 1);
    if (!chordPart || !bassPart || bassPart.includes('/')) return null;

    // chord 본체는 슬래시 없는 경로로 재귀
    const chord = parseRoman(chordPart);
    if (!chord) return null;

    // 베이스 부분은 도수 + b/# prefix만 인정 (quality suffix 없음)
    const bass = parseBassDegree(bassPart);
    if (!bass) return null;

    return { ...chord, bassDegree: bass.degree, bassSemitones: bass.semitones };
  }

  // ... (기존 로직 그대로 — prefix b/# 처리부터 시작)
```

`parseBassDegree` 헬퍼를 같은 파일 하단에 추가:

```typescript
/** 베이스 부분 파싱 — 도수(1~7) + b/# prefix만. quality suffix 거부. */
function parseBassDegree(s: string): { degree: number; semitones: number } | null {
  let prefixOffset = 0;
  let body = s;
  if (body.startsWith('b')) {
    if (body.length < 2 || body[1] === 'b' || body[1] === '#') return null;
    prefixOffset = -1;
    body = body.slice(1);
  } else if (body.startsWith('#')) {
    if (body.length < 2 || body[1] === '#' || body[1] === 'b') return null;
    prefixOffset = 1;
    body = body.slice(1);
  }
  // 본체는 정확히 도수(I~VII)만 허용 — 추가 suffix 없음
  let degree: number | undefined;
  for (const candidate of ['VII', 'III', 'VI', 'IV', 'II', 'V', 'I']) {
    if (body.toUpperCase() === candidate) {
      degree = ROMAN_TO_DIGIT[candidate];
      break;
    }
  }
  if (degree === undefined) return null;
  const baseRoot = DEGREE_OFFSET[degree];
  if (baseRoot === undefined) return null;
  const semitones = (baseRoot + prefixOffset + 12) % 12;
  return { degree, semitones };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chords-slash.test.ts`

Expected: 모두 PASS. 기존 `chords.test.ts`도 회귀 없이 PASS.

```bash
cd apps/web && pnpm test tests/unit/lib/theory/
```

- [ ] **Step 6: chord-display round-trip 테스트 작성**

Create `apps/web/tests/unit/lib/theory/chord-display-slash.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { romanToAbsolute, displayChord } from '@/lib/theory/chord-display';

describe('chord-display — slash chord', () => {
  it('I/VII in C → C/B', () => {
    expect(romanToAbsolute('I/VII', 0)).toBe('C/B');
  });

  it('vim/V in C → Am/G', () => {
    expect(romanToAbsolute('vim/V', 0)).toBe('Am/G');
  });

  it('I/III in C → C/E', () => {
    expect(romanToAbsolute('I/III', 0)).toBe('C/E');
  });

  it('Imaj7/V in C → Cmaj7/G', () => {
    expect(romanToAbsolute('Imaj7/V', 0)).toBe('Cmaj7/G');
  });

  it('I/VII in F♯ (key=6) — flat key 컨벤션', () => {
    // F♯ key는 sharp key (isFlatKey false). bass도 sharp 표기.
    const result = romanToAbsolute('I/VII', 6);
    expect(result).toMatch(/^F#\/F$/); // F# major + VII = F (실제 F#의 VII는 E#=F)
  });

  it('displayChord roman mode preserves slash', () => {
    expect(displayChord('vim/V', 0, 'roman')).toBe('vim/V');
  });

  it('non-slash chord 회귀 — V → G', () => {
    expect(romanToAbsolute('V', 0)).toBe('G');
  });
});
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chord-display-slash.test.ts`

Expected: FAIL — `romanToAbsolute('I/VII', 0)`이 `C` 또는 invalid 반환.

- [ ] **Step 8: chord-display 슬래시 변환 구현**

Modify `apps/web/lib/theory/chord-display.ts`. `romanToAbsolute` 함수 교체:

```typescript
export function romanToAbsolute(symbol: string, keyRoot: PitchClass): string {
  const parsed = parseRoman(symbol);
  if (!parsed) return symbol;
  const rootPc = pitchClassFromRoot(keyRoot, parsed.rootSemitones);
  const noteName = getNoteName(rootPc, isFlatKey(keyRoot));
  const head = noteName + QUALITY_SUFFIX[parsed.quality];
  // 슬래시 코드면 베이스 노트 표기 추가
  if (parsed.bassSemitones !== undefined) {
    const bassPc = pitchClassFromRoot(keyRoot, parsed.bassSemitones);
    const bassName = getNoteName(bassPc, isFlatKey(keyRoot));
    return `${head}/${bassName}`;
  }
  return head;
}
```

`normalizeRomanCase`도 슬래시 보존하도록 수정:

```typescript
export function normalizeRomanCase(symbol: string): string {
  const parsed = parseRoman(symbol);
  if (!parsed) return symbol;
  const upper = UPPER_ROMAN[parsed.degree - 1];
  if (!upper) return symbol;
  const head = upper + QUALITY_SUFFIX[parsed.quality];
  if (parsed.bassDegree !== undefined) {
    // 베이스도 b/# prefix 보존하려면 원본 문자열에서 추출 (단순화: 원본 슬래시 부분)
    const slashIdx = symbol.indexOf('/');
    const bassPart = symbol.slice(slashIdx + 1);
    return `${head}/${bassPart}`;
  }
  return head;
}
```

- [ ] **Step 9: chord-display 테스트 통과 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chord-display-slash.test.ts`

Expected: PASS. 기존 `chord-display.test.ts` 회귀 0건.

- [ ] **Step 10: chord-voicing.ts에 chordBassMidi 추가**

Modify `apps/web/lib/theory/chord-voicing.ts` — 파일 하단에 신규 함수 추가:

```typescript
import { romanToChord } from './chords';

/**
 * 베이스 voice용 단일 MIDI 노트.
 * 슬래시 코드면 bassSemitones, 아니면 chord root.
 * Engine이 bass voice trigger 직전에 호출.
 */
export function chordBassMidi(
  symbol: string,
  keyRoot: PitchClass,
  rootOctave: number = DEFAULT_OCTAVE,
): number | null {
  const chord = romanToChord(symbol);
  if (!chord) return null;
  const semitones = chord.bassSemitones ?? chord.semitones[0]!;
  const bassPc = pitchClassFromRoot(keyRoot, semitones);
  return 12 * (rootOctave + 1) + bassPc;
}
```

- [ ] **Step 11: chordBassMidi 단위 테스트 추가**

Append to `apps/web/tests/unit/lib/theory/chords-slash.test.ts`:

```typescript
import { chordBassMidi, chordSymbolToMidi } from '@/lib/theory/chord-voicing';

describe('chordBassMidi — bass voice resolver', () => {
  it('non-slash chord returns chord root midi', () => {
    // V in C key: chord root G = midi 67 (G4, default octave = 4)
    expect(chordBassMidi('V', 0, 4)).toBe(67);
  });

  it('I/VII in C returns VII bass midi (B = 71)', () => {
    expect(chordBassMidi('I/VII', 0, 4)).toBe(71);
  });

  it('vim/V in C returns V bass midi (G = 67)', () => {
    expect(chordBassMidi('vim/V', 0, 4)).toBe(67);
  });

  it('chord triad midi unchanged (regression)', () => {
    // chordSymbolToMidi는 슬래시 영향 받지 않음 — guitar voice / overlay용
    const triad = chordSymbolToMidi('I/VII', 0, 4);
    expect(triad).toEqual([60, 64, 67]); // C E G — VII bass는 별도
  });
});
```

- [ ] **Step 12: 테스트 통과 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chords-slash.test.ts`

Expected: PASS.

- [ ] **Step 13: engine.ts에서 bass midi 분리**

Modify `apps/web/lib/audio/backing/engine.ts` — `chordBassMidi` import 추가 (line 37 부근):

```typescript
import { chordBassMidi, chordSymbolToMidi } from '@/lib/theory/chord-voicing';
```

bass voice 트리거 부분 (line 348-351) 교체:

```typescript
// bass: 슬래시 코드면 bass note, 아니면 chord root. -24 → 2옥타브 다운 (C2 부근)
if (!voiceMutes.bass) {
  const bassRootMidi = chordBassMidi(symbol, currentKeyRoot);
  if (bassRootMidi !== null) {
    const bassMidi = bassRootMidi - 24;
    for (const s of pattern.bass.steps) voices.bass.trigger(bassMidi, loaded.bass, beatSec, t(s), s.velocity, vs);
  }
}
```

- [ ] **Step 14: 전체 테스트 회귀 확인**

```bash
cd apps/web && pnpm typecheck && pnpm test
```

Expected: 모두 PASS, 회귀 0건.

- [ ] **Step 15: 커밋 + PR 생성**

```bash
git add apps/web/lib/theory/chords.ts \
        apps/web/lib/theory/chord-display.ts \
        apps/web/lib/theory/chord-voicing.ts \
        apps/web/lib/audio/backing/engine.ts \
        apps/web/tests/unit/lib/theory/chords-slash.test.ts \
        apps/web/tests/unit/lib/theory/chord-display-slash.test.ts

git commit -m "$(cat <<'EOF'
feat(theory): add slash chord support to roman parser

parseRoman이 'V/VII', 'vim/V' 같은 슬래시 표기를 인식해 bassDegree +
bassSemitones 필드를 채운다. chord triad의 semitones는 그대로 — 슬래시는
베이스 voice 한정 영향. chordBassMidi(symbol, key, oct) 신설로 engine이
chord root 대신 슬래시 베이스를 사용할 수 있게 한다.

chord-display의 Roman ↔ Absolute 변환도 슬래시 round-trip 지원
(I/VII in C → C/B).

Sprint 11 사전 인프라 — Travis picking 카드의 descending bass 라인
(C→B→A→G→F→E→D→C) 표현을 위해 도입.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §5.1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/parser-slash-chord
gh pr create --base feat/catalog-7-cards --title "feat(theory): slash chord parser + chord-display round-trip" --body "$(cat <<'EOF'
## Summary
- parseRoman이 'V/VII' 슬래시 표기 인식
- ParsedChord에 bassDegree + bassSemitones 필드 추가
- chordBassMidi 신설로 engine이 슬래시 베이스 사용
- chord-display Roman↔Absolute 변환에 슬래시 round-trip
- engine.ts bass voice trigger를 chordBassMidi로 교체

## Test plan
- [x] 슬래시 파싱 +15 케이스 (valid + invalid)
- [x] chord-display 슬래시 round-trip
- [x] chordBassMidi 단위 테스트 (slash + non-slash)
- [x] 기존 chords.test.ts / chord-display.test.ts 회귀 0건
- [x] 전체 typecheck + test green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 2 (PR-B): voice extensions (guitar voicingMode + drums tom/crash lookup)

**목표:** guitar.ts에 `voicingMode?: 'full' | 'power'` 옵션 추가. drums.ts에 `tom`/`crash` step 지원 + dynamic lookup.

**브랜치:** `feat/voice-extensions` (off `feat/catalog-7-cards`)

**Files:**
- Modify: `apps/web/lib/audio/backing/voices/guitar.ts`
- Modify: `apps/web/lib/audio/backing/voices/drums.ts`
- Modify: `apps/web/lib/audio/backing/patterns/types.ts` (DrumPattern에 tom/crash 추가)
- Create: `apps/web/tests/unit/lib/audio/backing/voices/guitar-voicing.test.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/voices/drums-lookup.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards
git checkout -b feat/voice-extensions
```

- [ ] **Step 2: guitar voicingMode 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/voices/guitar-voicing.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { createGuitarVoice } from '@/lib/audio/backing/voices/guitar';
import { mockSoundfont } from '../voice-mock-helpers';

describe('GuitarVoice — voicingMode', () => {
  it("voicingMode='full' (default) plays all chord pitches", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // C major triad MIDI: C E G = 60 64 67
    voice.strum('down', [60, 64, 67], sf, 0.5, 0, 0.6);
    expect(sf.start).toHaveBeenCalledTimes(3);
    voice.dispose();
  });

  it("voicingMode='power' plays only root + perfect 5th", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // root 60, 3rd 64, 5th 67 — power chord = root + 5th = 60, 67
    voice.strum('down', [60, 64, 67], sf, 0.5, 0, 0.6, 1, 'power');
    expect(sf.start).toHaveBeenCalledTimes(2);
    const notes = (sf.start.mock.calls as Array<[{ note: number }]>).map((c) => c[0].note).sort((a, b) => a - b);
    expect(notes).toEqual([60, 67]);
    voice.dispose();
  });

  it("voicingMode='power' with non-triad voicing still extracts root + p5", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // Imaj7 voicing: 60, 64, 67, 71 — power should still pick 60 + 67
    voice.strum('down', [60, 64, 67, 71], sf, 0.5, 0, 0.6, 1, 'power');
    expect(sf.start).toHaveBeenCalledTimes(2);
    const notes = (sf.start.mock.calls as Array<[{ note: number }]>).map((c) => c[0].note).sort((a, b) => a - b);
    expect(notes).toEqual([60, 67]);
    voice.dispose();
  });

  it("voicingMode='power' fallback when no perfect 5th present", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // diminished triad: C Eb Gb = 60 63 66 — no perfect 5th. power → root only
    voice.strum('down', [60, 63, 66], sf, 0.5, 0, 0.6, 1, 'power');
    expect(sf.start).toHaveBeenCalledTimes(1);
    const note = (sf.start.mock.calls as Array<[{ note: number }]>)[0]![0].note;
    expect(note).toBe(60);
    voice.dispose();
  });
});
```

`voice-mock-helpers.ts`는 이미 존재(`apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts`) — 거기 `mockSoundfont` export 확인.

- [ ] **Step 3: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/voices/guitar-voicing.test.ts`

Expected: FAIL — 8번째 인자 `voicingMode`를 받지 않음, full triad 그대로 트리거.

- [ ] **Step 4: guitar.ts에 voicingMode 추가**

Modify `apps/web/lib/audio/backing/voices/guitar.ts` — `GuitarVoice` 인터페이스 (line 19-35)와 `strum` 구현 (line 47-63):

```typescript
export interface GuitarVoice {
  strum(
    direction: 'down' | 'up',
    midiNotes: readonly number[],
    soundfont: Soundfont,
    durationSec: number,
    time: number,
    velocity?: number,
    velocityScale?: number,
    voicingMode?: 'full' | 'power',
  ): void;
  setVoiceGain(scale: number): void;
  fadeOut(): void;
  cancelScheduled(): void;
  dispose(): void;
}
```

`strum` 함수 본체:

```typescript
strum(direction, midiNotes, soundfont, durationSec, time, velocity = 0.6, velocityScale = 1, voicingMode = 'full') {
  // voicingMode='power': root + perfect 5th(7 반음)만 추출. 5th 없으면 root만.
  let notes: readonly number[] = midiNotes;
  if (voicingMode === 'power' && midiNotes.length > 0) {
    const root = Math.min(...midiNotes);
    const p5 = root + 7;
    notes = midiNotes.includes(p5) ? [root, p5] : [root];
  }
  // down: 저음 → 고음(오름차순), up: 고음 → 저음(내림차순)
  const sorted = [...notes].sort((a, b) => a - b);
  const order = direction === 'down' ? sorted : sorted.reverse();
  const scaled = Math.max(0, Math.min(1, velocity * velocityScale));
  const v = Math.max(0, Math.min(127, Math.round(scaled * 127)));
  order.forEach((note, i) => {
    const stop = soundfont.start({
      note,
      time: time + i * STRUM_STAGGER_SEC,
      duration: durationSec,
      velocity: v,
    }) as unknown as StopFn;
    pendingStops.push(stop);
  });
},
```

- [ ] **Step 5: guitar 테스트 통과 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/voices/guitar-voicing.test.ts`

Expected: PASS. 기존 voice 테스트 회귀 0건.

- [ ] **Step 6: drums tom/crash 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/voices/drums-lookup.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { createDrumVoice } from '@/lib/audio/backing/voices/drums';

function mockDrumMachine(sampleNames: string[]) {
  return {
    sampleNames,
    start: vi.fn().mockReturnValue(() => {}),
  } as any;
}

describe('DrumVoice — tom/crash dynamic lookup', () => {
  it("'tom' resolves to 'tom-mid' if available", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'tom-low', 'tom-mid', 'tom-high']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0, 0.8);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'tom-mid' }));
    voice.dispose();
  });

  it("'tom' falls back to 'tom-low' when no tom-mid", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'tom-low']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0, 0.8);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'tom-low' }));
    voice.dispose();
  });

  it("'tom' falls back to snare when no tom available", () => {
    const dm = mockDrumMachine(['kick', 'snare']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0, 0.8);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'snare' }));
    voice.dispose();
  });

  it("'crash' resolves to 'crash' literal if available", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'crash', 'ride']);
    const voice = createDrumVoice();
    voice.trigger('crash', dm, 0, 0.9);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'crash' }));
    voice.dispose();
  });

  it("'crash' falls back to 'clap' when no cymbal", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'clap']);
    const voice = createDrumVoice();
    voice.trigger('crash', dm, 0, 0.9);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'clap' }));
    voice.dispose();
  });

  it('lookup is cached via WeakMap (called once per kit)', () => {
    const dm = mockDrumMachine(['kick', 'snare', 'tom-mid']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0);
    voice.trigger('tom', dm, 0.1);
    voice.trigger('tom', dm, 0.2);
    expect(dm.start).toHaveBeenCalledTimes(3);
    // 모든 호출이 동일 노트로 → cache 작동
    const notes = (dm.start.mock.calls as Array<[{ note: string }]>).map((c) => c[0].note);
    expect(new Set(notes)).toEqual(new Set(['tom-mid']));
    voice.dispose();
  });
});
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/voices/drums-lookup.test.ts`

Expected: FAIL — `voice.trigger('tom', ...)`이 타입 에러 또는 'tom' 그대로 전달.

- [ ] **Step 8: types.ts DrumPattern 확장**

Modify `apps/web/lib/audio/backing/patterns/types.ts` (line 22-26 부근):

```typescript
export type DrumPattern = {
  kick: BeatStep[];
  snare: BeatStep[];
  hat: BeatStep[];
  /** Optional — 카드 climax/fill에서 사용. kit 부재 시 snare 폴백. */
  tom?: BeatStep[];
  /** Optional — 카드 climax 끝 액센트. kit 부재 시 snare 폴백. */
  crash?: BeatStep[];
};
```

- [ ] **Step 9: drums.ts에 lookup + tom/crash trigger 추가**

Modify `apps/web/lib/audio/backing/voices/drums.ts`:

기존 `HAT_NOTE_CACHE` 아래에 추가 (line 50 부근):

```typescript
const TOM_NOTE_CACHE = new WeakMap<DrumMachine, string>();
function resolveTomNote(dm: DrumMachine): string {
  const cached = TOM_NOTE_CACHE.get(dm);
  if (cached) return cached;
  const names = dm.sampleNames ?? [];
  const resolved =
    names.find((n) => n === 'tom-mid') ??
    names.find((n) => n === 'tom-low') ??
    names.find((n) => n === 'tom-high') ??
    names.find((n) => n === 'tom') ??
    names.find((n) => n.startsWith('tom')) ??
    names.find((n) => n === 'snare-l') ??
    'snare';
  TOM_NOTE_CACHE.set(dm, resolved);
  return resolved;
}

const CRASH_NOTE_CACHE = new WeakMap<DrumMachine, string>();
function resolveCrashNote(dm: DrumMachine): string {
  const cached = CRASH_NOTE_CACHE.get(dm);
  if (cached) return cached;
  const names = dm.sampleNames ?? [];
  const resolved =
    names.find((n) => n === 'crash') ??
    names.find((n) => n === 'crash-1') ??
    names.find((n) => n === 'crash-2') ??
    names.find((n) => n === 'cymbal') ??
    names.find((n) => n.startsWith('crash')) ??
    names.find((n) => n === 'clap') ??
    'snare';
  CRASH_NOTE_CACHE.set(dm, resolved);
  return resolved;
}
```

`DrumVoice.trigger` 시그니처 확장 (line 68-74):

```typescript
trigger(
  step: 'kick' | 'snare' | 'hat' | 'tom' | 'crash',
  drumMachine: DrumMachine,
  time: number,
  velocity?: number,
  velocityScale?: number,
): void;
```

`trigger` 본체에서 noteName 분기 추가 (line 99-112):

```typescript
trigger(step, drumMachine, time, velocity = 0.8, velocityScale = 1) {
  const stepScale = step === 'hat' ? HAT_VELOCITY_SCALE : 1;
  const scaled = Math.max(0, Math.min(1, velocity * velocityScale * stepScale));
  let noteName: string;
  switch (step) {
    case 'hat':   noteName = resolveHatNote(drumMachine); break;
    case 'tom':   noteName = resolveTomNote(drumMachine); break;
    case 'crash': noteName = resolveCrashNote(drumMachine); break;
    default:      noteName = step; // 'kick'/'snare'
  }
  const stop = drumMachine.start({
    note: noteName,
    time,
    velocity: Math.max(0, Math.min(127, Math.round(scaled * 127))),
  }) as unknown as StopFn;
  pendingStops.push(stop);
},
```

- [ ] **Step 10: drums 테스트 통과 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/voices/drums-lookup.test.ts`

Expected: PASS. 기존 drums 테스트 회귀 0건.

- [ ] **Step 11: engine.ts에서 tom/crash trigger 흘려보내기**

Modify `apps/web/lib/audio/backing/engine.ts` — drums 트리거 블록 (line 340-344) 확장:

```typescript
if (!voiceMutes.drums) {
  for (const s of pattern.drums.kick)  voices.drums.trigger('kick',  loaded.drums, t(s), s.velocity, vs);
  for (const s of pattern.drums.snare) voices.drums.trigger('snare', loaded.drums, t(s), s.velocity, vs);
  for (const s of pattern.drums.hat)   voices.drums.trigger('hat',   loaded.drums, t(s), s.velocity, vs);
  if (pattern.drums.tom)
    for (const s of pattern.drums.tom)   voices.drums.trigger('tom',   loaded.drums, t(s), s.velocity, vs);
  if (pattern.drums.crash)
    for (const s of pattern.drums.crash) voices.drums.trigger('crash', loaded.drums, t(s), s.velocity, vs);
}
```

- [ ] **Step 12: 전체 테스트 회귀 확인**

```bash
cd apps/web && pnpm typecheck && pnpm test
```

Expected: PASS, 회귀 0건.

- [ ] **Step 13: 커밋 + PR 생성**

```bash
git add apps/web/lib/audio/backing/voices/guitar.ts \
        apps/web/lib/audio/backing/voices/drums.ts \
        apps/web/lib/audio/backing/patterns/types.ts \
        apps/web/lib/audio/backing/engine.ts \
        apps/web/tests/unit/lib/audio/backing/voices/guitar-voicing.test.ts \
        apps/web/tests/unit/lib/audio/backing/voices/drums-lookup.test.ts

git commit -m "$(cat <<'EOF'
feat(audio): voice extensions for power chord and tom/crash drum samples

GuitarVoice.strum이 voicingMode?: 'full' | 'power' 옵션을 받는다.
'power'는 root + perfect 5th(7 semitone)만 트리거. 5th 부재 시 root only.
punk_8th variant에서 사용 예정.

DrumVoice.trigger가 'tom' / 'crash' step을 추가 지원. kit별 sample 이름
차이(LM-2/TR-808/CR-8000)에 대응해 resolveTomNote / resolveCrashNote가
동적 lookup + WeakMap 캐시. 부재 시 snare 폴백으로 안전.

DrumPattern 타입에 tom?: / crash?: optional 필드 추가.
engine.ts가 두 step 모두 trigger.

Sprint 11 사전 인프라 — epic_minor_halftime / power_ballad / punk_8th
신규 카드의 climax 표현에 필요.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §5.2

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/voice-extensions
gh pr create --base feat/catalog-7-cards --title "feat(audio): voice extensions — power chord + tom/crash lookup" --body "$(cat <<'EOF'
## Summary
- GuitarVoice voicingMode='power' (root+5th only)
- DrumVoice tom/crash step + dynamic lookup + WeakMap cache
- DrumPattern 타입에 tom?/crash? optional
- engine.ts가 추가 step trigger

## Test plan
- [x] guitar voicingMode 4 케이스 (full/power/power-fallback/no-p5)
- [x] drum tom/crash lookup 6 케이스 (포함/폴백/캐시)
- [x] 회귀 0건

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 3 (PR-C): card-autumn-leaves (jazz)

**목표:** `autumn-leaves` 카드 + `autumn_leaves` variant + `autumn_walk`/`autumn_turnaround` 슬롯 + jazz swing perVariant 0.62.

**브랜치:** `feat/card-autumn-leaves` (off `feat/catalog-7-cards`, requires PR-A merged)

**Files:**
- Modify: `apps/web/lib/api/catalog.json`
- Modify: `apps/web/lib/audio/backing/patterns/library/jazz.ts`
- Modify: `apps/web/lib/audio/backing/card-profiles.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/swing.test.ts` (perVariant 회귀)
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/jazz-autumn.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards
git pull origin feat/catalog-7-cards
git checkout -b feat/card-autumn-leaves
```

- [ ] **Step 2: catalog.json에 autumn-leaves 추가**

Modify `apps/web/lib/api/catalog.json` — jazz-ii-V-I 항목 다음에 새 객체 삽입 (`,` 위치 주의):

```json
{
  "slug": "autumn-leaves",
  "name": "Autumn Leaves (16-bar form)",
  "category": "jazz",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 90,
  "recommended_scales": ["dorian", "harmonic_minor", "natural_minor"],
  "progression": [
    { "bar": 1,  "chord": "iim7" },
    { "bar": 2,  "chord": "V7" },
    { "bar": 3,  "chord": "Imaj7" },
    { "bar": 4,  "chord": "IVmaj7" },
    { "bar": 5,  "chord": "viim7b5" },
    { "bar": 6,  "chord": "III7" },
    { "bar": 7,  "chord": "vim7" },
    { "bar": 8,  "chord": "vim7" },
    { "bar": 9,  "chord": "iim7" },
    { "bar": 10, "chord": "V7" },
    { "bar": 11, "chord": "Imaj7" },
    { "bar": 12, "chord": "IVmaj7" },
    { "bar": 13, "chord": "viim7b5" },
    { "bar": 14, "chord": "III7" },
    { "bar": 15, "chord": "vim7" },
    { "bar": 16, "chord": "vim7" }
  ]
}
```

- [ ] **Step 3: 카탈로그 JSON 유효성 검증**

```bash
cd apps/web && python3 -c "import json; data=json.load(open('lib/api/catalog.json')); print(f'OK — {len(data)} cards'); assert any(c['slug']=='autumn-leaves' for c in data)"
```

Expected: `OK — 23 cards` 출력.

- [ ] **Step 4: jazz-autumn 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/patterns/library/jazz-autumn.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { JAZZ_RHYTHM } from '@/lib/audio/backing/patterns/library/jazz';
import { resolveSwing } from '@/lib/audio/backing/swing';

const TPL = { bars: 16, default_bpm: 90, progression: Array(16).fill({ chord: 'iim7' }) };

describe('jazz autumn_leaves variant', () => {
  it('selectSlot bar 1-15 → autumn_walk', () => {
    for (let i = 0; i < 15; i++) {
      expect(JAZZ_RHYTHM.selectSlot(TPL, i, 'autumn_leaves')).toBe('autumn_walk');
    }
  });

  it('selectSlot bar 16 (idx 15) → autumn_turnaround', () => {
    expect(JAZZ_RHYTHM.selectSlot(TPL, 15, 'autumn_leaves')).toBe('autumn_turnaround');
  });

  it('autumn_walk slot 정의됨 (drums.kick / snare / hat 배열)', () => {
    const slot = JAZZ_RHYTHM.patterns.autumn_walk;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick).toBeDefined();
    expect(slot!.drums.snare.length).toBeGreaterThan(0);
    expect(slot!.drums.hat.length).toBeGreaterThan(0);
    expect(slot!.bass.steps.length).toBe(4); // 4-to-bar walking
    expect(slot!.guitar.length).toBeGreaterThan(0); // Freddie Green comp
  });

  it('autumn_turnaround slot 정의됨 + bass에 chromatic approach 추가', () => {
    const slot = JAZZ_RHYTHM.patterns.autumn_turnaround;
    expect(slot).toBeDefined();
    // walk보다 1 step 많음 (4-and 자리에 chromatic approach)
    expect(slot!.bass.steps.length).toBeGreaterThan(4);
  });

  it('swing perVariant — autumn_leaves는 0.62, default는 0.66', () => {
    expect(resolveSwing(JAZZ_RHYTHM, 'autumn_leaves')).toBe(0.62);
    expect(resolveSwing(JAZZ_RHYTHM, undefined)).toBe(0.66); // walk default
    expect(resolveSwing(JAZZ_RHYTHM, 'walk')).toBe(0.66); // explicit walk
  });

  it('기존 walk variant 회귀 — selectSlot 변경 없음', () => {
    expect(JAZZ_RHYTHM.selectSlot(TPL, 0, undefined)).toBe('walk');
    expect(JAZZ_RHYTHM.selectSlot(TPL, 15, undefined)).toBe('walk_approach');
  });
});
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/jazz-autumn.test.ts`

Expected: FAIL — `autumn_walk` 슬롯 부재, swing perVariant 미정의.

- [ ] **Step 6: jazz.ts에 autumn_leaves 슬롯 + selectSlot + swing 추가**

Modify `apps/web/lib/audio/backing/patterns/library/jazz.ts`:

`swing` 필드 변경:

```typescript
swing: { default: 0.66, perVariant: { autumn_leaves: 0.62 } },
```

`patterns:` 객체 안에 `comp_only` 다음 슬롯 2개 추가:

```typescript
// autumn_leaves variant — 16bar form. walk보다 sparse (Freddie Green 2박만, 4박 drop).
// brush snare velocity 0.25로 더 부드럽게.
autumn_walk: {
  drums: {
    kick: [],
    snare: [
      { time: '0:1:2', velocity: 0.25 },
      { time: '0:3:2', velocity: 0.25 },
    ],
    // walk와 동일 triplet8 ride
    hat: [
      { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
      { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
      { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
      { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
    ],
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:1:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
      { time: '0:3:0', velocity: 0.85 },
    ],
  },
  // Freddie Green 2박만 — 4박 drop으로 더 sparse
  guitar: [
    { time: '0:1:0', direction: 'down', velocity: 0.35 },
  ],
},

autumn_turnaround: {
  drums: {
    kick: [],
    snare: [
      { time: '0:1:2', velocity: 0.25 },
      { time: '0:3:2', velocity: 0.25 },
    ],
    hat: [
      { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
      { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
      { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
      { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
      { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
    ],
  },
  bass: {
    // 4박-and에 chromatic approach (bar 16 vim7 → bar 1 iim7 진입)
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:1:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
      { time: '0:3:0', velocity: 0.85 },
      { time: '0:3:2', velocity: 0.7 },
    ],
  },
  guitar: [
    { time: '0:1:0', direction: 'down', velocity: 0.35 },
  ],
},
```

`selectSlot` 함수에 분기 추가 (기존 walk/walk_approach 분기 *위*에):

```typescript
selectSlot: (tpl, idx, variant) => {
  if (variant === 'autumn_leaves') {
    return idx % tpl.bars === tpl.bars - 1 ? 'autumn_turnaround' : 'autumn_walk';
  }
  const local = idx % tpl.bars;
  if (local === tpl.bars - 1) return 'walk_approach';
  return 'walk';
},
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/jazz-autumn.test.ts`

Expected: PASS.

- [ ] **Step 8: card-profiles.ts에 entry 추가**

Modify `apps/web/lib/audio/backing/card-profiles.ts` — `'jazz-ii-V-I'` 다음에 추가:

```typescript
// 16bar form, perVariant swing 0.62, Blue Note dry. jazz default electric_guitar_jazz 그대로.
'autumn-leaves': {
  rhythmVariant: 'autumn_leaves',
  toneProfile: { reverbWet: 0.20 },
},
```

- [ ] **Step 9: card-profiles 정합성 + 회귀 테스트 확인**

Run: `cd apps/web && pnpm typecheck && pnpm test`

Expected: PASS. dev console에서 `__assertCardProfilesMatch` warning 없음.

- [ ] **Step 10: dev 서버 띄워서 청취 검수**

```bash
cd apps/web && pnpm dev
# 브라우저 localhost:3000/jam → autumn-leaves 카드 → ▶ 30초
```

확인 포인트:
- 16 마디 진행 매끈 (bar counter 1/16 ~ 16/16)
- bar 16에 chromatic approach 베이스 4-and 들림
- swing 0.62로 walk보다 살짝 평탄한 셔플 feel
- Freddie Green comp는 2박만

- [ ] **Step 11: 커밋 + PR 생성**

```bash
git add apps/web/lib/api/catalog.json \
        apps/web/lib/audio/backing/patterns/library/jazz.ts \
        apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/library/jazz-autumn.test.ts

git commit -m "$(cat <<'EOF'
feat(audio): add autumn-leaves jazz card (16-bar form)

신규 카드 + autumn_leaves variant. 16bar AABA form 학습용 — relative major↔minor
ii-V 피벗. Freddie Green 2박만(4박 drop)으로 walk보다 sparse, brush snare
velocity 0.25, swing perVariant 0.62 (walk 0.66보다 평탄).

bar 16 turnaround 슬롯이 4-and chromatic approach로 bar 1 iim7로 매끈 진입.

Sprint 11 카드 1/7.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §3.1, §4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/card-autumn-leaves
gh pr create --base feat/catalog-7-cards --title "feat(audio): autumn-leaves jazz card (16-bar form)" --body "$(cat <<'EOF'
## Summary
- catalog.json + autumn-leaves entry (16bar, 90bpm, dorian/harmonic_minor)
- jazz.ts: autumn_walk + autumn_turnaround slot + selectSlot 분기 + swing perVariant 0.62
- card-profiles entry (reverbWet 0.20)

## Test plan
- [x] selectSlot 매핑 16 케이스 (1-15→walk, 16→turnaround)
- [x] swing perVariant 0.62 vs default 0.66
- [x] 기존 walk/walk_approach 회귀
- [x] 청취 검수: 16bar 진행 매끈, bar 16 chromatic approach, swing 0.62 feel

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 4 (PR-D): card-epic-minor-cinematic (minor)

**목표:** `epic-minor-cinematic` 카드 + `epic_minor_halftime` variant + 슬롯 3개(epic_main / epic_climax / epic_resolve).

**브랜치:** `feat/card-epic-minor` (off `feat/catalog-7-cards`, requires PR-B merged for tom 트리거)

**Files:**
- Modify: `apps/web/lib/api/catalog.json`
- Modify: `apps/web/lib/audio/backing/patterns/library/minor.ts`
- Modify: `apps/web/lib/audio/backing/card-profiles.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/minor-epic.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards && git pull
git checkout -b feat/card-epic-minor
```

- [ ] **Step 2: catalog.json에 epic-minor-cinematic 추가**

Modify `apps/web/lib/api/catalog.json` — `minor-i-VI-III-VII` 다음에:

```json
{
  "slug": "epic-minor-cinematic",
  "name": "Epic Minor (Cinematic 16-bar)",
  "category": "minor",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 70,
  "recommended_scales": ["natural_minor", "harmonic_minor", "minor_pentatonic"],
  "progression": [
    { "bar": 1,  "chord": "i" },
    { "bar": 2,  "chord": "VI" },
    { "bar": 3,  "chord": "III" },
    { "bar": 4,  "chord": "VII" },
    { "bar": 5,  "chord": "iv" },
    { "bar": 6,  "chord": "VI" },
    { "bar": 7,  "chord": "VII" },
    { "bar": 8,  "chord": "i" },
    { "bar": 9,  "chord": "i" },
    { "bar": 10, "chord": "VI" },
    { "bar": 11, "chord": "III" },
    { "bar": 12, "chord": "VII" },
    { "bar": 13, "chord": "iv" },
    { "bar": 14, "chord": "V" },
    { "bar": 15, "chord": "V" },
    { "bar": 16, "chord": "i" }
  ]
}
```

- [ ] **Step 3: minor-epic 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/patterns/library/minor-epic.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { MINOR_RHYTHM } from '@/lib/audio/backing/patterns/library/minor';

const TPL = { bars: 16, default_bpm: 70, progression: Array(16).fill({ chord: 'i' }) };

describe('minor epic_minor_halftime variant', () => {
  it('selectSlot 매핑', () => {
    // 1-12 → epic_main, 13 → epic_climax, 14-15 → epic_main, 16 → epic_resolve
    for (let i = 0; i < 12; i++) {
      expect(MINOR_RHYTHM.selectSlot(TPL, i, 'epic_minor_halftime')).toBe('epic_main');
    }
    expect(MINOR_RHYTHM.selectSlot(TPL, 12, 'epic_minor_halftime')).toBe('epic_climax');
    expect(MINOR_RHYTHM.selectSlot(TPL, 13, 'epic_minor_halftime')).toBe('epic_main');
    expect(MINOR_RHYTHM.selectSlot(TPL, 14, 'epic_minor_halftime')).toBe('epic_main');
    expect(MINOR_RHYTHM.selectSlot(TPL, 15, 'epic_minor_halftime')).toBe('epic_resolve');
  });

  it('half-time pattern — kick 1·3박만, snare 3박만', () => {
    const slot = MINOR_RHYTHM.patterns.epic_main;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick.map((s) => s.time)).toEqual(['0:0:0', '0:2:0']);
    expect(slot!.drums.snare.map((s) => s.time)).toEqual(['0:2:0']);
  });

  it('epic_climax는 tom 강조', () => {
    const slot = MINOR_RHYTHM.patterns.epic_climax;
    expect(slot).toBeDefined();
    expect(slot!.drums.tom).toBeDefined();
    expect(slot!.drums.tom!.length).toBeGreaterThan(0);
  });

  it('epic_resolve는 1박에 crash', () => {
    const slot = MINOR_RHYTHM.patterns.epic_resolve;
    expect(slot).toBeDefined();
    expect(slot!.drums.crash).toBeDefined();
    expect(slot!.drums.crash![0]!.time).toBe('0:0:0');
  });

  it('기존 minor variant 회귀', () => {
    // 기존 카드는 variant 미정의 → 기본 슬롯
    expect(() => MINOR_RHYTHM.selectSlot(TPL, 0, undefined)).not.toThrow();
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/minor-epic.test.ts`

Expected: FAIL.

- [ ] **Step 5: minor.ts에 epic 슬롯 + selectSlot 추가**

먼저 minor.ts 현재 구조 확인:

```bash
cat apps/web/lib/audio/backing/patterns/library/minor.ts
```

`patterns:` 객체에 슬롯 3개 추가 (기존 슬롯 다음):

```typescript
// epic_minor_halftime variant — cinematic dread, half-time, tom 강조.
epic_main: {
  drums: {
    // half-time: kick 1·3박만
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    // snare 3박만(2/4 backbeat 제거)
    snare: [{ time: '0:2:0' }],
    // hat 4분만 (8분 비움)
    hat: [
      { time: '0:0:0', velocity: 0.4 },
      { time: '0:1:0', velocity: 0.4 },
      { time: '0:2:0', velocity: 0.4 },
      { time: '0:3:0', velocity: 0.4 },
    ],
  },
  bass: {
    // sustained low — 1박만
    steps: [{ time: '0:0:0', velocity: 0.9 }],
  },
  // sustained power-chord-arpeggio: 1·3박 down strum (length 2박)
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.6 },
    { time: '0:2:0', direction: 'down', velocity: 0.5 },
  ],
},

epic_climax: {
  drums: {
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [{ time: '0:2:0' }],
    hat: [
      { time: '0:0:0', velocity: 0.5 },
      { time: '0:1:0', velocity: 0.5 },
      { time: '0:2:0', velocity: 0.5 },
      { time: '0:3:0', velocity: 0.5 },
    ],
    // tom buildup — bar 13(iv) 도착 강조
    tom: [
      { time: '0:0:2', velocity: 0.5 },
      { time: '0:1:2', velocity: 0.6 },
      { time: '0:2:2', velocity: 0.7 },
      { time: '0:3:2', velocity: 0.8 },
    ],
  },
  bass: {
    steps: [{ time: '0:0:0', velocity: 0.95 }],
  },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.7 },
    { time: '0:2:0', direction: 'down', velocity: 0.6 },
  ],
},

epic_resolve: {
  drums: {
    kick: [{ time: '0:0:0', velocity: 0.95 }],
    snare: [],
    hat: [],
    // 1박에 crash로 끝맺음
    crash: [{ time: '0:0:0', velocity: 0.9 }],
    // tom roll로 마무리
    tom: [
      { time: '0:0:2', velocity: 0.6 },
      { time: '0:1:0', velocity: 0.7 },
      { time: '0:1:2', velocity: 0.8 },
    ],
  },
  bass: {
    // 1박만 — sustained
    steps: [{ time: '0:0:0', velocity: 0.95 }],
  },
  // 1박에 강한 final strum
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.85 },
  ],
},
```

`selectSlot` 함수에 분기 추가:

```typescript
selectSlot: (tpl, idx, variant) => {
  if (variant === 'epic_minor_halftime') {
    const local = idx % tpl.bars;
    if (local === 12) return 'epic_climax';   // bar 13
    if (local === 15) return 'epic_resolve';  // bar 16
    return 'epic_main';
  }
  // 기존 minor 분기 (그대로)
  // ...
},
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/minor-epic.test.ts`

Expected: PASS.

- [ ] **Step 7: card-profiles.ts에 entry 추가**

Modify `apps/web/lib/audio/backing/card-profiles.ts` — `'minor-i-VI-III-VII'` 다음에:

```typescript
// cinematic hall reverb 0.35. minor default electric_guitar_clean 유지(arpeggio 적합).
'epic-minor-cinematic': {
  rhythmVariant: 'epic_minor_halftime',
  toneProfile: { reverbWet: 0.35 },
},
```

- [ ] **Step 8: 회귀 + 청취 검수**

```bash
cd apps/web && pnpm typecheck && pnpm test && pnpm dev
# localhost:3000/jam → epic-minor-cinematic → ▶ 60초
```

확인:
- bar 13에서 tom buildup 들림
- bar 14·15 V (harmonic minor dominant) → bar 16 i 해결
- bar 16에 crash + tom roll
- half-time 슬로우 cinematic feel

- [ ] **Step 9: 커밋 + PR 생성**

```bash
git add apps/web/lib/api/catalog.json \
        apps/web/lib/audio/backing/patterns/library/minor.ts \
        apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/library/minor-epic.test.ts

git commit -m "$(cat <<'EOF'
feat(audio): add epic-minor-cinematic minor card (16-bar)

신규 카드 + epic_minor_halftime variant. half-time(kick 1+3, snare 3),
hat 4분만, bar 13 tom buildup, bar 16 crash + tom roll로 cinematic dread.
bar 14·15 V는 harmonic minor dominant — leading tone 도입.

cinematic hall reverbWet 0.35.

Sprint 11 카드 2/7.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §3.2, §4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/card-epic-minor
gh pr create --base feat/catalog-7-cards --title "feat(audio): epic-minor-cinematic card (16-bar)" --body "$(cat <<'EOF'
## Summary
- catalog entry (16bar, 70bpm, natural/harmonic minor)
- minor.ts: epic_main / epic_climax / epic_resolve slot + selectSlot
- card-profile (reverbWet 0.35 cinematic)

## Test plan
- [x] selectSlot 매핑 16 케이스
- [x] half-time kick/snare/hat 패턴 검증
- [x] tom/crash trigger 발현 (PR-B 의존)
- [x] 청취: bar 13 tom buildup, bar 16 crash, harmonic minor V 해결

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 5 (PR-E): card-cissy-strut-funk

**목표:** `cissy-strut-funk` 카드 + `funk_form_16` variant + 슬롯 4개.

**브랜치:** `feat/card-cissy-strut` (off `feat/catalog-7-cards`)

**Files:**
- Modify: `apps/web/lib/api/catalog.json`
- Modify: `apps/web/lib/audio/backing/patterns/library/funk.ts`
- Modify: `apps/web/lib/audio/backing/card-profiles.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/funk-form16.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards && git pull
git checkout -b feat/card-cissy-strut
```

- [ ] **Step 2: catalog.json 추가**

`funk-i7-vamp` 다음에:

```json
{
  "slug": "cissy-strut-funk",
  "name": "Cissy Strut Funk (16-bar form)",
  "category": "funk",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 96,
  "recommended_scales": ["dorian", "minor_pentatonic", "minor_blues"],
  "progression": [
    { "bar": 1,  "chord": "i7" },    { "bar": 2,  "chord": "i7" },
    { "bar": 3,  "chord": "i7" },    { "bar": 4,  "chord": "i7" },
    { "bar": 5,  "chord": "iv7" },   { "bar": 6,  "chord": "iv7" },
    { "bar": 7,  "chord": "i7" },    { "bar": 8,  "chord": "i7" },
    { "bar": 9,  "chord": "i7" },    { "bar": 10, "chord": "i7" },
    { "bar": 11, "chord": "i7" },    { "bar": 12, "chord": "i7" },
    { "bar": 13, "chord": "bIII7" }, { "bar": 14, "chord": "iv7" },
    { "bar": 15, "chord": "V7" },    { "bar": 16, "chord": "i7" }
  ]
}
```

- [ ] **Step 3: funk-form16 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/patterns/library/funk-form16.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { FUNK_RHYTHM } from '@/lib/audio/backing/patterns/library/funk';

const TPL = { bars: 16, default_bpm: 96, progression: Array(16).fill({ chord: 'i7' }) };

describe('funk funk_form_16 variant', () => {
  it('selectSlot 매핑 — A-section 1-4·7-12, B-section 5-6, bridge 13-15, stop 16', () => {
    const map: Record<string, string> = {};
    for (let i = 0; i < 16; i++) {
      map[`bar${i + 1}`] = FUNK_RHYTHM.selectSlot(TPL, i, 'funk_form_16');
    }
    expect(map.bar1).toBe('funk_a_main');
    expect(map.bar4).toBe('funk_a_main');
    expect(map.bar5).toBe('funk_b_iv');
    expect(map.bar6).toBe('funk_b_iv');
    expect(map.bar7).toBe('funk_a_main');
    expect(map.bar12).toBe('funk_a_main');
    expect(map.bar13).toBe('funk_bridge_c');
    expect(map.bar14).toBe('funk_bridge_c');
    expect(map.bar15).toBe('funk_bridge_c');
    expect(map.bar16).toBe('funk_stop_resolve');
  });

  it('funk_stop_resolve — kick 1박만, snare 4박만, hat 비움', () => {
    const slot = FUNK_RHYTHM.patterns.funk_stop_resolve;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick.length).toBe(1);
    expect(slot!.drums.kick[0]!.time).toBe('0:0:0');
    expect(slot!.drums.snare.length).toBe(1);
    expect(slot!.drums.snare[0]!.time).toBe('0:3:0');
    expect(slot!.drums.hat.length).toBe(0);
  });

  it('funk_a_main과 funk_b_iv는 그루브 동일(harmonic만 다름)', () => {
    const a = FUNK_RHYTHM.patterns.funk_a_main;
    const b = FUNK_RHYTHM.patterns.funk_b_iv;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a!.drums.kick.length).toBe(b!.drums.kick.length);
    expect(a!.drums.snare.length).toBe(b!.drums.snare.length);
  });

  it('기존 1bar vamp variant 회귀', () => {
    const tpl1 = { bars: 1, default_bpm: 96, progression: [{ chord: 'i7' }] };
    expect(FUNK_RHYTHM.selectSlot(tpl1, 0, undefined)).toBe('groove_a');
    expect(FUNK_RHYTHM.selectSlot(tpl1, 3, undefined)).toBe('pickup_one');
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/funk-form16.test.ts`

Expected: FAIL.

- [ ] **Step 5: funk.ts에 funk_form_16 슬롯 + selectSlot 추가**

기존 `funk.ts`의 `groove_a`/`groove_b`/`pickup_one` 슬롯 다음에 추가:

```typescript
// funk_form_16 variant — Cissy Strut form (The Meters).
// A-section(1-4, 7-12) / B-section(5-6 iv7) / bridge(13-15 bIII7-iv7-V7) / stop(16)
funk_a_main: {
  drums: {
    kick: [
      { time: '0:0:0' },
      { time: '0:1:2', velocity: 0.8 },
      { time: '0:2:0' },
    ],
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    hat: GROOVE_A_HAT,
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:0:3', velocity: 0.85 },
      { time: '0:1:2', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
      { time: '0:2:3', velocity: 0.85 },
      { time: '0:3:2', velocity: 0.85 },
    ],
  },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.7 },
    { time: '0:0:2', direction: 'up', velocity: 0.7 },
    { time: '0:1:0', direction: 'down', velocity: 0.7 },
    { time: '0:1:2', direction: 'up', velocity: 0.7 },
    { time: '0:2:0', direction: 'down', velocity: 0.7 },
    { time: '0:2:2', direction: 'up', velocity: 0.7 },
    { time: '0:3:0', direction: 'down', velocity: 0.7 },
    { time: '0:3:2', direction: 'up', velocity: 0.7 },
  ],
  aux: SHAKER_AUX,
},

// B-section: iv7 — A-section과 동일 그루브, harmonic만 다름
funk_b_iv: {
  drums: {
    kick: [
      { time: '0:0:0' },
      { time: '0:1:2', velocity: 0.8 },
      { time: '0:2:0' },
    ],
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    hat: GROOVE_A_HAT,
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:0:3', velocity: 0.85 },
      { time: '0:1:2', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
      { time: '0:2:3', velocity: 0.85 },
      { time: '0:3:2', velocity: 0.85 },
    ],
  },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.75 },
    { time: '0:0:2', direction: 'up', velocity: 0.7 },
    { time: '0:1:0', direction: 'down', velocity: 0.75 },
    { time: '0:1:2', direction: 'up', velocity: 0.7 },
    { time: '0:2:0', direction: 'down', velocity: 0.75 },
    { time: '0:2:2', direction: 'up', velocity: 0.7 },
    { time: '0:3:0', direction: 'down', velocity: 0.75 },
    { time: '0:3:2', direction: 'up', velocity: 0.7 },
  ],
  aux: SHAKER_AUX,
},

// bridge: 13-15 (bIII7-iv7-V7)
funk_bridge_c: {
  drums: {
    kick: [
      { time: '0:0:0' },
      { time: '0:1:2', velocity: 0.85 },
      { time: '0:2:0' },
      { time: '0:3:2', velocity: 0.7 },
    ],
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    hat: GROOVE_A_HAT,
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:0:3', velocity: 0.85 },
      { time: '0:1:2', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
      { time: '0:2:3', velocity: 0.85 },
      { time: '0:3:2', velocity: 0.85 },
    ],
  },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.8 },
    { time: '0:0:2', direction: 'up', velocity: 0.75 },
    { time: '0:1:0', direction: 'down', velocity: 0.8 },
    { time: '0:1:2', direction: 'up', velocity: 0.75 },
    { time: '0:2:0', direction: 'down', velocity: 0.8 },
    { time: '0:2:2', direction: 'up', velocity: 0.75 },
    { time: '0:3:0', direction: 'down', velocity: 0.8 },
    { time: '0:3:2', direction: 'up', velocity: 0.75 },
  ],
  aux: SHAKER_AUX,
},

// stop-time 16 — kick 1박, snare 4박, hat 0
funk_stop_resolve: {
  drums: {
    kick: [{ time: '0:0:0', velocity: 0.95 }],
    snare: [{ time: '0:3:0', velocity: 0.9 }],
    hat: [],
  },
  bass: {
    // 1박 stab만
    steps: [{ time: '0:0:0', velocity: 0.95 }],
  },
  // 1박 stab + 4박 끝맺음
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.85 },
    { time: '0:3:0', direction: 'down', velocity: 0.8 },
  ],
  // shaker도 끔 (stop-time)
  aux: [],
},
```

`selectSlot`에 분기 추가 (기존 1bar vamp 분기 유지):

```typescript
selectSlot: (tpl, idx, variant) => {
  if (variant === 'funk_form_16') {
    const local = idx % tpl.bars;
    if (local === 15) return 'funk_stop_resolve';      // bar 16
    if (local >= 12) return 'funk_bridge_c';            // 13-15
    if (local === 4 || local === 5) return 'funk_b_iv'; // 5-6
    return 'funk_a_main';                                // 1-4, 7-12
  }
  // 기존 1bar vamp 분기 (그대로)
  if (tpl.bars === 1) {
    if (idx % 4 === 3) return 'pickup_one';
    return idx % 8 < 4 ? 'groove_a' : 'groove_b';
  }
  const local = idx % tpl.bars;
  if (local === tpl.bars - 1) return 'pickup_one';
  return local % 2 === 0 ? 'groove_a' : 'groove_b';
},
```

- [ ] **Step 6: 테스트 + 회귀 + 청취**

```bash
cd apps/web && pnpm typecheck && pnpm test && pnpm dev
# localhost:3000/jam → cissy-strut-funk → ▶ 60초
```

청취 포인트: bar 16 stop-time 분명히 들림(다른 마디와 dynamic 차이 큼).

- [ ] **Step 7: card-profiles.ts에 entry 추가**

```typescript
// funk default 0.12 그대로.
'cissy-strut-funk': {
  rhythmVariant: 'funk_form_16',
},
```

- [ ] **Step 8: 커밋 + PR**

```bash
git add apps/web/lib/api/catalog.json \
        apps/web/lib/audio/backing/patterns/library/funk.ts \
        apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/library/funk-form16.test.ts

git commit -m "$(cat <<'EOF'
feat(audio): add cissy-strut-funk card (16-bar Meters form)

신규 카드 + funk_form_16 variant. A-section(1-4, 7-12) / B-section iv7(5-6) /
bridge bIII7-iv7-V7(13-15) / stop-time(16: kick 1박, snare 4박, hat 0)으로
The Meters Cissy Strut form 표현. stop-time은 funk 본질의 한 축.

기존 1bar vamp variant와 분리 — variant 분기 우선, fallback으로 vamp 로직.

Sprint 11 카드 3/7.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §3.3, §4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/card-cissy-strut
gh pr create --base feat/catalog-7-cards --title "feat(audio): cissy-strut-funk card (16-bar form)" --body "## Summary
- catalog entry (16bar, 96bpm, dorian)
- funk.ts: funk_a_main / funk_b_iv / funk_bridge_c / funk_stop_resolve + selectSlot
- card-profile (default reverb)

## Test plan
- [x] selectSlot 16 케이스
- [x] stop-time 검증 (kick 1, snare 1, hat 0)
- [x] 1bar vamp 회귀
- [x] 청취: bar 16 stop-time 분명

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Task 6 (PR-F): card-bossa-major-ipanema

**목표:** `bossa-major-ipanema` 카드 + `bossa_chromatic` variant + 슬롯 2개. 기존 bossa 드럼/베이스 그대로 + guitar 4× stab.

**브랜치:** `feat/card-bossa-major`

**Files:**
- Modify: `apps/web/lib/api/catalog.json`
- Modify: `apps/web/lib/audio/backing/patterns/library/bossa.ts`
- Modify: `apps/web/lib/audio/backing/card-profiles.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/bossa-chromatic.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards && git pull
git checkout -b feat/card-bossa-major
```

- [ ] **Step 2: catalog.json 추가**

`bossa-i-iv-ii-v` 다음에:

```json
{
  "slug": "bossa-major-ipanema",
  "name": "Bossa Nova (Major Chromatic 8-bar)",
  "category": "bossa",
  "bars": 8,
  "time_signature": "4/4",
  "default_bpm": 132,
  "recommended_scales": ["major", "lydian", "major_pentatonic"],
  "progression": [
    { "bar": 1, "chord": "Imaj7" }, { "bar": 2, "chord": "II7" },
    { "bar": 3, "chord": "iim7" },  { "bar": 4, "chord": "bII7" },
    { "bar": 5, "chord": "Imaj7" }, { "bar": 6, "chord": "II7" },
    { "bar": 7, "chord": "iim7" },  { "bar": 8, "chord": "bII7" }
  ]
}
```

- [ ] **Step 3: bossa-chromatic 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/patterns/library/bossa-chromatic.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { BOSSA_RHYTHM } from '@/lib/audio/backing/patterns/library/bossa';

const TPL = { bars: 8, default_bpm: 132, progression: Array(8).fill({ chord: 'Imaj7' }) };

describe('bossa bossa_chromatic variant', () => {
  it('selectSlot — main 1-7, resolve 8', () => {
    for (let i = 0; i < 7; i++) {
      expect(BOSSA_RHYTHM.selectSlot(TPL, i, 'bossa_chromatic')).toBe('bossa_chromatic_main');
    }
    expect(BOSSA_RHYTHM.selectSlot(TPL, 7, 'bossa_chromatic')).toBe('bossa_chromatic_resolve');
  });

  it('bossa_chromatic_main — guitar 마디당 4× stab', () => {
    const slot = BOSSA_RHYTHM.patterns.bossa_chromatic_main;
    expect(slot).toBeDefined();
    expect(slot!.guitar.length).toBe(4); // 1·2·3·4박 stab
    expect(slot!.guitar.map((s) => s.time)).toEqual(['0:0:0', '0:1:0', '0:2:0', '0:3:0']);
  });

  it('기존 bossa variant 회귀', () => {
    expect(() => BOSSA_RHYTHM.selectSlot(TPL, 0, undefined)).not.toThrow();
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/bossa-chromatic.test.ts`

Expected: FAIL.

- [ ] **Step 5: bossa.ts에 슬롯 + selectSlot 추가**

기존 bossa 슬롯의 drums/bass 패턴을 재사용. 슬롯 2개 추가:

```typescript
// bossa_chromatic variant — major key + descending chromatic ii-V (Ipanema 패밀리).
// 드럼/베이스는 기존 bossa 패턴 동일, guitar는 4 코드 빠른 변화 표현으로 마디당 4× stab.
bossa_chromatic_main: {
  drums: {
    // bossa nova 표준 — kick 1·3박, snare cross-stick 2·4박
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [
      { time: '0:1:0', velocity: 0.4 },
      { time: '0:3:0', velocity: 0.4 },
    ],
    // hat 8분
    hat: [
      { time: '0:0:0', velocity: 0.4 },
      { time: '0:0:2', velocity: 0.35 },
      { time: '0:1:0', velocity: 0.4 },
      { time: '0:1:2', velocity: 0.35 },
      { time: '0:2:0', velocity: 0.4 },
      { time: '0:2:2', velocity: 0.35 },
      { time: '0:3:0', velocity: 0.4 },
      { time: '0:3:2', velocity: 0.35 },
    ],
  },
  bass: {
    // bossa 베이스: 1·3박 root
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
    ],
  },
  // 마디당 4× stab — 1·2·3·4박. quick chord change 표현.
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.55 },
    { time: '0:1:0', direction: 'down', velocity: 0.5 },
    { time: '0:2:0', direction: 'down', velocity: 0.55 },
    { time: '0:3:0', direction: 'down', velocity: 0.5 },
  ],
},

// bar 8 — 마지막 stab을 살짝 sustain
bossa_chromatic_resolve: {
  drums: {
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [
      { time: '0:1:0', velocity: 0.4 },
      { time: '0:3:0', velocity: 0.4 },
    ],
    hat: [
      { time: '0:0:0', velocity: 0.4 },
      { time: '0:0:2', velocity: 0.35 },
      { time: '0:1:0', velocity: 0.4 },
      { time: '0:1:2', velocity: 0.35 },
      { time: '0:2:0', velocity: 0.4 },
      { time: '0:2:2', velocity: 0.35 },
      { time: '0:3:0', velocity: 0.4 },
    ],
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
    ],
  },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.55 },
    { time: '0:1:0', direction: 'down', velocity: 0.5 },
    { time: '0:2:0', direction: 'down', velocity: 0.55 },
    // bar 8 마지막 stab은 살짝 강하게 (다음 사이클로 진입)
    { time: '0:3:0', direction: 'down', velocity: 0.6 },
  ],
},
```

`selectSlot` 함수에 분기 추가:

```typescript
selectSlot: (tpl, idx, variant) => {
  if (variant === 'bossa_chromatic') {
    return idx % tpl.bars === tpl.bars - 1 ? 'bossa_chromatic_resolve' : 'bossa_chromatic_main';
  }
  // 기존 bossa 분기 (그대로)
  // ...
},
```

- [ ] **Step 6: 테스트 + 회귀 + 청취**

```bash
cd apps/web && pnpm typecheck && pnpm test && pnpm dev
```

청취: 각 마디에 코드 4번씩 빠르게 stab — descending chromatic 들림.

- [ ] **Step 7: card-profiles.ts entry 추가**

```typescript
// bossa default 0.20 그대로.
'bossa-major-ipanema': {
  rhythmVariant: 'bossa_chromatic',
},
```

- [ ] **Step 8: 커밋 + PR**

```bash
git add apps/web/lib/api/catalog.json \
        apps/web/lib/audio/backing/patterns/library/bossa.ts \
        apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/library/bossa-chromatic.test.ts

git commit -m "$(cat <<'EOF'
feat(audio): add bossa-major-ipanema card (8-bar major chromatic)

신규 카드 + bossa_chromatic variant. major key descending chromatic
(Imaj7 II7 iim7 bII7) — Ipanema 패밀리 + tritone substitution(bII7).
기존 bossa 드럼/베이스 패턴 재사용, guitar는 마디당 4× stab으로 빠른 코드
변화 표현.

기존 minor key bossa-i-iv-ii-v(Black Orpheus)와 major↔minor 색 분리.

Sprint 11 카드 4/7.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §3.4, §4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/card-bossa-major
gh pr create --base feat/catalog-7-cards --title "feat(audio): bossa-major-ipanema card (8-bar)" --body "## Summary
- catalog entry (8bar, 132bpm, major/lydian)
- bossa.ts: bossa_chromatic_main / bossa_chromatic_resolve + selectSlot
- guitar 4× stab/bar (vs 기존 bossa 2×)

## Test plan
- [x] selectSlot 8 케이스
- [x] 4× stab 검증
- [x] 회귀
- [x] 청취: descending chromatic 분명

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Task 7 (PR-G): card-travis-pick-folk

**목표:** `travis-pick-folk` 카드 + `travis_pick` variant + 슬롯 2개. **드럼 비움**, bass alternating(슬래시 베이스 override 활용), guitar 8분 finger arpeggio.

**브랜치:** `feat/card-travis-pick` (PR-A merged 필요)

**Files:**
- Modify: `apps/web/lib/api/catalog.json`
- Modify: `apps/web/lib/audio/backing/patterns/library/folk.ts`
- Modify: `apps/web/lib/audio/backing/card-profiles.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/folk-travis.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards && git pull
git checkout -b feat/card-travis-pick
```

- [ ] **Step 2: catalog.json 추가**

`ballad-I-V-vi-IV` 다음에:

```json
{
  "slug": "travis-pick-folk",
  "name": "Travis Picking (Fingerstyle 8-bar)",
  "category": "folk",
  "bars": 8,
  "time_signature": "4/4",
  "default_bpm": 100,
  "recommended_scales": ["major", "major_pentatonic", "mixolydian"],
  "progression": [
    { "bar": 1, "chord": "I" },     { "bar": 2, "chord": "I/VII" },
    { "bar": 3, "chord": "vim" },   { "bar": 4, "chord": "vim/V" },
    { "bar": 5, "chord": "IV" },    { "bar": 6, "chord": "I/III" },
    { "bar": 7, "chord": "iim7" },  { "bar": 8, "chord": "I" }
  ]
}
```

- [ ] **Step 3: folk-travis 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/patterns/library/folk-travis.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { FOLK_RHYTHM } from '@/lib/audio/backing/patterns/library/folk';
import { chordBassMidi } from '@/lib/theory/chord-voicing';

const TPL = { bars: 8, default_bpm: 100, progression: Array(8).fill({ chord: 'I' }) };

describe('folk travis_pick variant', () => {
  it('selectSlot — main 1-7, resolve 8', () => {
    for (let i = 0; i < 7; i++) {
      expect(FOLK_RHYTHM.selectSlot(TPL, i, 'travis_pick')).toBe('travis_main');
    }
    expect(FOLK_RHYTHM.selectSlot(TPL, 7, 'travis_pick')).toBe('travis_resolve');
  });

  it('travis_main — 드럼 비움(kick/snare/hat 모두 0)', () => {
    const slot = FOLK_RHYTHM.patterns.travis_main;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick).toEqual([]);
    expect(slot!.drums.snare).toEqual([]);
    expect(slot!.drums.hat).toEqual([]);
  });

  it('travis_main — bass 1·3박 alternating thumb', () => {
    const slot = FOLK_RHYTHM.patterns.travis_main;
    expect(slot!.bass.steps.length).toBeGreaterThanOrEqual(2);
    // 1박, 3박 자리에 베이스 (Travis 엄지)
    expect(slot!.bass.steps[0]!.time).toBe('0:0:0');
    expect(slot!.bass.steps[1]!.time).toBe('0:2:0');
  });

  it('travis_main — guitar finger arpeggio 8분 6+ steps', () => {
    const slot = FOLK_RHYTHM.patterns.travis_main;
    // 1·3박은 베이스 엄지 → guitar는 2·4박 + 사이 8분 = 6 steps 정도
    expect(slot!.guitar.length).toBeGreaterThanOrEqual(6);
  });

  it('travis_resolve — 마지막 root sustain', () => {
    const slot = FOLK_RHYTHM.patterns.travis_resolve;
    expect(slot).toBeDefined();
    // 1박만 강하게
    expect(slot!.bass.steps[0]!.time).toBe('0:0:0');
  });

  it('슬래시 코드 bass 발현 — bar 2 I/VII에서 bass midi가 root와 다름', () => {
    // C key (root=0): I=C, VII=B → bass는 B(midi 71 default oct), root=C(midi 60)
    const rootMidi = chordBassMidi('I', 0, 4);
    const slashBassMidi = chordBassMidi('I/VII', 0, 4);
    expect(rootMidi).toBe(60);
    expect(slashBassMidi).toBe(71);
    expect(slashBassMidi).not.toBe(rootMidi);
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/folk-travis.test.ts`

Expected: FAIL — `travis_main` 슬롯 부재.

- [ ] **Step 5: folk.ts에 travis_pick 슬롯 + selectSlot 추가**

기존 folk 슬롯 다음에:

```typescript
// travis_pick variant — fingerstyle. 드럼 비움, bass alternating thumb(1·3박),
// guitar 8th finger arpeggio. 슬래시 베이스 override 활용으로 descending bass 표현.
travis_main: {
  drums: {
    // fingerstyle = no drums
    kick: [],
    snare: [],
    hat: [],
  },
  bass: {
    // Travis 엄지 alternating: 1박 root(or slash bass) + 3박 root(or slash bass)
    // 슬래시 코드면 chord-voicing.chordBassMidi가 bassSemitones 사용 → 자연 descending
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
    ],
  },
  // finger arpeggio 8분 6 steps — 2·4박은 강조, 사이 8분은 약하게
  // pattern: rest 1박 / strum :2 / rest 2박 / strum :2 / rest 3박 / strum :2 / rest 4박 / strum :2
  guitar: [
    { time: '0:0:2', direction: 'down', velocity: 0.45 },
    { time: '0:1:0', direction: 'up', velocity: 0.5 },
    { time: '0:1:2', direction: 'down', velocity: 0.45 },
    { time: '0:2:2', direction: 'down', velocity: 0.45 },
    { time: '0:3:0', direction: 'up', velocity: 0.5 },
    { time: '0:3:2', direction: 'down', velocity: 0.45 },
  ],
},

travis_resolve: {
  drums: {
    kick: [],
    snare: [],
    hat: [],
  },
  bass: {
    // 마지막 마디 — 1박 root sustain only
    steps: [{ time: '0:0:0', velocity: 0.95 }],
  },
  // 1박에 final pluck
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.7 },
  ],
},
```

`selectSlot`에 분기 추가:

```typescript
selectSlot: (tpl, idx, variant) => {
  if (variant === 'travis_pick') {
    return idx % tpl.bars === tpl.bars - 1 ? 'travis_resolve' : 'travis_main';
  }
  // 기존 folk_strum / ballad_pick_a / ballad_pick_b 분기 (그대로)
  // ...
},
```

- [ ] **Step 6: 테스트 + 회귀 + 청취**

```bash
cd apps/web && pnpm typecheck && pnpm test && pnpm dev
# localhost:3000/jam → travis-pick-folk → ▶ 60초
```

청취 포인트:
- 드럼 완전 무음
- 베이스 라인이 C → B → A → G → F → E → D → C 매끈하게 하강
- 기타 8분 finger pattern

- [ ] **Step 7: card-profiles.ts entry 추가**

```typescript
// folk default 0.18 → 0.25 (intimate). acoustic_guitar_steel 그대로.
'travis-pick-folk': {
  rhythmVariant: 'travis_pick',
  toneProfile: { reverbWet: 0.25 },
},
```

- [ ] **Step 8: 커밋 + PR**

```bash
git add apps/web/lib/api/catalog.json \
        apps/web/lib/audio/backing/patterns/library/folk.ts \
        apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/library/folk-travis.test.ts

git commit -m "$(cat <<'EOF'
feat(audio): add travis-pick-folk card (8-bar fingerstyle)

신규 카드 + travis_pick variant. Dust in the Wind 패밀리 — 슬래시 코드로
descending bass(C→B→A→G→F→E→D→C) 표현. 드럼 비움(jazz comp_only 선례),
bass alternating thumb 1·3박, guitar 8분 finger arpeggio.

intimate reverbWet 0.25, acoustic_guitar_steel(folk default) 유지.

PR-A의 슬래시 코드 파서 + chordBassMidi 의존.

Sprint 11 카드 5/7.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §3.5, §4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/card-travis-pick
gh pr create --base feat/catalog-7-cards --title "feat(audio): travis-pick-folk card (8-bar fingerstyle)" --body "## Summary
- catalog entry (8bar, 100bpm, major) + 슬래시 코드 4개 (I/VII, vim/V, I/III)
- folk.ts: travis_main / travis_resolve slot + selectSlot
- 드럼 비움, bass alternating, guitar 8분 finger arpeggio
- card-profile (reverbWet 0.25)

## Test plan
- [x] selectSlot 8 케이스
- [x] 드럼 비움 검증
- [x] 슬래시 코드 bass midi 발현
- [x] 청취: 베이스 하강 라인 매끈

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Task 8 (PR-H): cards-rock-pair (power-ballad + punk)

**목표:** rock 카테고리에 카드 2장 동시 추가 — `power-ballad-rock` + `punk-garage-rock`. 두 variant + 슬롯 6개.

**브랜치:** `feat/cards-rock-pair` (PR-B merged 필요 — voicingMode + tom/crash)

**Files:**
- Modify: `apps/web/lib/api/catalog.json` (2 entry)
- Modify: `apps/web/lib/audio/backing/patterns/library/rock.ts` (2 variant)
- Modify: `apps/web/lib/audio/backing/card-profiles.ts` (2 entry)
- Modify: `apps/web/lib/audio/backing/engine.ts` (guitar trigger에 voicingMode 흘려보내기)
- Modify: `apps/web/lib/audio/backing/patterns/types.ts` (StrumStep에 voicingMode 추가)
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/rock-power-ballad.test.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/library/rock-punk.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout feat/catalog-7-cards && git pull
git checkout -b feat/cards-rock-pair
```

- [ ] **Step 2: catalog.json — 2 entry 추가**

`rock-12-bar` 다음에:

```json
{
  "slug": "power-ballad-rock",
  "name": "Power Ballad (16-bar)",
  "category": "rock",
  "bars": 16,
  "time_signature": "4/4",
  "default_bpm": 75,
  "recommended_scales": ["major", "minor_pentatonic", "natural_minor"],
  "progression": [
    { "bar": 1,  "chord": "vim" }, { "bar": 2,  "chord": "IV" },
    { "bar": 3,  "chord": "I" },   { "bar": 4,  "chord": "V" },
    { "bar": 5,  "chord": "vim" }, { "bar": 6,  "chord": "IV" },
    { "bar": 7,  "chord": "I" },   { "bar": 8,  "chord": "V" },
    { "bar": 9,  "chord": "IV" },  { "bar": 10, "chord": "I" },
    { "bar": 11, "chord": "V" },   { "bar": 12, "chord": "vim" },
    { "bar": 13, "chord": "bVII" },{ "bar": 14, "chord": "V" },
    { "bar": 15, "chord": "I" },   { "bar": 16, "chord": "I" }
  ]
},
{
  "slug": "punk-garage-rock",
  "name": "Punk / Garage (8-bar)",
  "category": "rock",
  "bars": 8,
  "time_signature": "4/4",
  "default_bpm": 170,
  "recommended_scales": ["major_pentatonic", "minor_pentatonic", "mixolydian"],
  "progression": [
    { "bar": 1, "chord": "I" }, { "bar": 2, "chord": "IV" },
    { "bar": 3, "chord": "V" }, { "bar": 4, "chord": "V" },
    { "bar": 5, "chord": "I" }, { "bar": 6, "chord": "IV" },
    { "bar": 7, "chord": "V" }, { "bar": 8, "chord": "I" }
  ]
}
```

- [ ] **Step 3: types.ts — StrumStep에 voicingMode 추가**

Modify `apps/web/lib/audio/backing/patterns/types.ts`:

```typescript
// 기존:
// export type StrumStep = BeatStep & { direction: 'down' | 'up' };

export type StrumStep = BeatStep & {
  direction: 'down' | 'up';
  /** Optional — voicing 옵션. 'power' = root + perfect 5th만. 미지정 = 'full'. */
  voicingMode?: 'full' | 'power';
};
```

- [ ] **Step 4: engine.ts — guitar trigger에 voicingMode 흘려보내기**

Modify `apps/web/lib/audio/backing/engine.ts` — guitar 트리거 부분 (line 355-359 부근):

```typescript
if (!voiceMutes.guitar) {
  const guitarMidi = midi.map((n) => n - 12);
  for (const s of pattern.guitar)
    voices.guitar.strum(s.direction, guitarMidi, loaded.guitar, strumDurSec, t(s), s.velocity, vs, s.voicingMode);
}
```

- [ ] **Step 5: rock-power-ballad 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/patterns/library/rock-power-ballad.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { ROCK_RHYTHM } from '@/lib/audio/backing/patterns/library/rock';

const TPL = { bars: 16, default_bpm: 75, progression: Array(16).fill({ chord: 'I' }) };

describe('rock power_ballad variant', () => {
  it('selectSlot 매핑', () => {
    // 1-4 intro, 5-12 main, 13-15 climax, 16 resolve
    for (let i = 0; i <= 3; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'power_ballad')).toBe('pb_intro');
    for (let i = 4; i <= 11; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'power_ballad')).toBe('pb_main');
    for (let i = 12; i <= 14; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'power_ballad')).toBe('pb_climax');
    expect(ROCK_RHYTHM.selectSlot(TPL, 15, 'power_ballad')).toBe('pb_resolve');
  });

  it('pb_intro — sparse: kick 1·3, snare 3, hat 0', () => {
    const slot = ROCK_RHYTHM.patterns.pb_intro;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick.length).toBe(2);
    expect(slot!.drums.snare.length).toBe(1);
    expect(slot!.drums.hat.length).toBe(0);
  });

  it('pb_climax — hat 8분 + tom fills', () => {
    const slot = ROCK_RHYTHM.patterns.pb_climax;
    expect(slot!.drums.hat.length).toBeGreaterThanOrEqual(8);
    expect(slot!.drums.tom).toBeDefined();
    expect(slot!.drums.tom!.length).toBeGreaterThan(0);
  });

  it('pb_resolve — 1박에 crash + sustain', () => {
    const slot = ROCK_RHYTHM.patterns.pb_resolve;
    expect(slot!.drums.crash).toBeDefined();
    expect(slot!.drums.crash![0]!.time).toBe('0:0:0');
  });
});
```

- [ ] **Step 6: rock-punk 실패 테스트 작성**

Create `apps/web/tests/unit/lib/audio/backing/patterns/library/rock-punk.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { ROCK_RHYTHM } from '@/lib/audio/backing/patterns/library/rock';

const TPL = { bars: 8, default_bpm: 170, progression: Array(8).fill({ chord: 'I' }) };

describe('rock punk_8th variant', () => {
  it('selectSlot — main 1-7, climax 8', () => {
    for (let i = 0; i < 7; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'punk_8th')).toBe('punk_main');
    expect(ROCK_RHYTHM.selectSlot(TPL, 7, 'punk_8th')).toBe('punk_climax');
  });

  it('punk_main — hat 8분 16 hits, kick 4박 다, snare 2+4', () => {
    const slot = ROCK_RHYTHM.patterns.punk_main;
    expect(slot).toBeDefined();
    // hat 8분 = 마디당 8회. 단, 데이터 구조상 8 entries (8th note step)
    expect(slot!.drums.hat.length).toBeGreaterThanOrEqual(8);
    expect(slot!.drums.kick.length).toBe(4);  // 1·2·3·4박
    expect(slot!.drums.snare.length).toBe(2); // 2·4박
  });

  it("punk_main — guitar 8분 down-only with voicingMode='power'", () => {
    const slot = ROCK_RHYTHM.patterns.punk_main;
    expect(slot!.guitar.length).toBe(8);
    for (const step of slot!.guitar) {
      expect(step.direction).toBe('down');
      expect(step.voicingMode).toBe('power');
    }
  });

  it('punk_climax — 1박 crash', () => {
    const slot = ROCK_RHYTHM.patterns.punk_climax;
    expect(slot!.drums.crash).toBeDefined();
    expect(slot!.drums.crash![0]!.time).toBe('0:0:0');
  });
});
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/library/rock-`

Expected: FAIL.

- [ ] **Step 8: rock.ts에 power_ballad + punk_8th 슬롯 + selectSlot 추가**

기존 rock 슬롯 다음에 추가:

```typescript
// power_ballad variant — November Rain 패밀리. half-time + clean arpeggio.
pb_intro: {
  drums: {
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [{ time: '0:2:0' }],
    hat: [],
  },
  bass: {
    steps: [{ time: '0:0:0', velocity: 0.85 }],
  },
  // sparse arpeggio — 1·3박만
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.5 },
    { time: '0:2:0', direction: 'up', velocity: 0.45 },
  ],
},

pb_main: {
  drums: {
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [{ time: '0:2:0' }],
    // hat 4분 ride
    hat: [
      { time: '0:0:0', velocity: 0.45 },
      { time: '0:1:0', velocity: 0.45 },
      { time: '0:2:0', velocity: 0.45 },
      { time: '0:3:0', velocity: 0.45 },
    ],
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.85 },
    ],
  },
  // arpeggio 8분 4 steps
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.55 },
    { time: '0:1:0', direction: 'up', velocity: 0.5 },
    { time: '0:2:0', direction: 'down', velocity: 0.55 },
    { time: '0:3:0', direction: 'up', velocity: 0.5 },
  ],
},

pb_climax: {
  drums: {
    kick: [
      { time: '0:0:0' },
      { time: '0:1:2', velocity: 0.85 },
      { time: '0:2:0' },
    ],
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    // hat 8분 8 hits
    hat: [
      { time: '0:0:0', velocity: 0.5 },
      { time: '0:0:2', velocity: 0.45 },
      { time: '0:1:0', velocity: 0.5 },
      { time: '0:1:2', velocity: 0.45 },
      { time: '0:2:0', velocity: 0.5 },
      { time: '0:2:2', velocity: 0.45 },
      { time: '0:3:0', velocity: 0.5 },
      { time: '0:3:2', velocity: 0.45 },
    ],
    // tom fills 2·4박
    tom: [
      { time: '0:1:2', velocity: 0.6 },
      { time: '0:3:2', velocity: 0.7 },
    ],
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.9 },
      { time: '0:1:0', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.9 },
      { time: '0:3:0', velocity: 0.85 },
    ],
  },
  // full strum 8분
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.7 },
    { time: '0:0:2', direction: 'up', velocity: 0.65 },
    { time: '0:1:0', direction: 'down', velocity: 0.7 },
    { time: '0:1:2', direction: 'up', velocity: 0.65 },
    { time: '0:2:0', direction: 'down', velocity: 0.7 },
    { time: '0:2:2', direction: 'up', velocity: 0.65 },
    { time: '0:3:0', direction: 'down', velocity: 0.7 },
    { time: '0:3:2', direction: 'up', velocity: 0.65 },
  ],
},

pb_resolve: {
  drums: {
    kick: [{ time: '0:0:0', velocity: 0.95 }],
    snare: [],
    hat: [],
    crash: [{ time: '0:0:0', velocity: 0.9 }],
  },
  bass: {
    steps: [{ time: '0:0:0', velocity: 0.95 }],
  },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.85 },
  ],
},

// punk_8th variant — Ramones 4-chord. 8분 down-only + power chord.
punk_main: {
  drums: {
    // kick 4박
    kick: [
      { time: '0:0:0' },
      { time: '0:1:0' },
      { time: '0:2:0' },
      { time: '0:3:0' },
    ],
    // snare 2·4박
    snare: [
      { time: '0:1:0', velocity: 0.85 },
      { time: '0:3:0', velocity: 0.85 },
    ],
    // hat 8분 8 hits, 강하게
    hat: [
      { time: '0:0:0', velocity: 0.65 },
      { time: '0:0:2', velocity: 0.6 },
      { time: '0:1:0', velocity: 0.65 },
      { time: '0:1:2', velocity: 0.6 },
      { time: '0:2:0', velocity: 0.65 },
      { time: '0:2:2', velocity: 0.6 },
      { time: '0:3:0', velocity: 0.65 },
      { time: '0:3:2', velocity: 0.6 },
    ],
  },
  bass: {
    // 8분 root pumping
    steps: [
      { time: '0:0:0', velocity: 0.9 },
      { time: '0:0:2', velocity: 0.85 },
      { time: '0:1:0', velocity: 0.9 },
      { time: '0:1:2', velocity: 0.85 },
      { time: '0:2:0', velocity: 0.9 },
      { time: '0:2:2', velocity: 0.85 },
      { time: '0:3:0', velocity: 0.9 },
      { time: '0:3:2', velocity: 0.85 },
    ],
  },
  // 8분 down-only + power chord (root + p5)
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.85, voicingMode: 'power' },
    { time: '0:0:2', direction: 'down', velocity: 0.8,  voicingMode: 'power' },
    { time: '0:1:0', direction: 'down', velocity: 0.85, voicingMode: 'power' },
    { time: '0:1:2', direction: 'down', velocity: 0.8,  voicingMode: 'power' },
    { time: '0:2:0', direction: 'down', velocity: 0.85, voicingMode: 'power' },
    { time: '0:2:2', direction: 'down', velocity: 0.8,  voicingMode: 'power' },
    { time: '0:3:0', direction: 'down', velocity: 0.85, voicingMode: 'power' },
    { time: '0:3:2', direction: 'down', velocity: 0.8,  voicingMode: 'power' },
  ],
},

punk_climax: {
  drums: {
    kick: [
      { time: '0:0:0' },
      { time: '0:1:0' },
      { time: '0:2:0' },
      { time: '0:3:0' },
    ],
    snare: [
      { time: '0:1:0', velocity: 0.9 },
      { time: '0:3:0', velocity: 0.9 },
    ],
    hat: [
      { time: '0:0:0', velocity: 0.7 },
      { time: '0:0:2', velocity: 0.65 },
      { time: '0:1:0', velocity: 0.7 },
      { time: '0:1:2', velocity: 0.65 },
      { time: '0:2:0', velocity: 0.7 },
      { time: '0:2:2', velocity: 0.65 },
      { time: '0:3:0', velocity: 0.7 },
      { time: '0:3:2', velocity: 0.65 },
    ],
    crash: [{ time: '0:0:0', velocity: 0.95 }],
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.95 },
      { time: '0:0:2', velocity: 0.9 },
      { time: '0:1:0', velocity: 0.95 },
      { time: '0:1:2', velocity: 0.9 },
      { time: '0:2:0', velocity: 0.95 },
      { time: '0:2:2', velocity: 0.9 },
      { time: '0:3:0', velocity: 0.95 },
      { time: '0:3:2', velocity: 0.9 },
    ],
  },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.95, voicingMode: 'power' },
    { time: '0:0:2', direction: 'down', velocity: 0.9,  voicingMode: 'power' },
    { time: '0:1:0', direction: 'down', velocity: 0.95, voicingMode: 'power' },
    { time: '0:1:2', direction: 'down', velocity: 0.9,  voicingMode: 'power' },
    { time: '0:2:0', direction: 'down', velocity: 0.95, voicingMode: 'power' },
    { time: '0:2:2', direction: 'down', velocity: 0.9,  voicingMode: 'power' },
    { time: '0:3:0', direction: 'down', velocity: 0.95, voicingMode: 'power' },
    { time: '0:3:2', direction: 'down', velocity: 0.9,  voicingMode: 'power' },
  ],
},
```

`selectSlot`에 분기 추가:

```typescript
selectSlot: (tpl, idx, variant) => {
  if (variant === 'power_ballad') {
    const local = idx % tpl.bars;
    if (local <= 3) return 'pb_intro';        // 1-4
    if (local === 15) return 'pb_resolve';
    if (local >= 12) return 'pb_climax';      // 13-15
    return 'pb_main';                          // 5-12
  }
  if (variant === 'punk_8th') {
    return idx % tpl.bars === tpl.bars - 1 ? 'punk_climax' : 'punk_main';
  }
  // 기존 rock 분기 (그대로)
  // ...
},
```

- [ ] **Step 9: 테스트 통과 + 회귀**

```bash
cd apps/web && pnpm typecheck && pnpm test
```

Expected: 두 테스트 파일 모두 PASS, 기존 rock 회귀 0건.

- [ ] **Step 10: card-profiles.ts entry 2개 추가**

```typescript
// power-ballad: rock default 0.14 → 0.30 (lush). distortion → clean override.
'power-ballad-rock': {
  rhythmVariant: 'power_ballad',
  toneProfile: { reverbWet: 0.30 },
  instrumentOverrides: {
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
},
// punk: rock default 0.14 → 0.08 (카탈로그 최저). distortion 유지.
'punk-garage-rock': {
  rhythmVariant: 'punk_8th',
  toneProfile: { reverbWet: 0.08 },
},
```

- [ ] **Step 11: 청취 검수**

```bash
cd apps/web && pnpm dev
# localhost:3000/jam → power-ballad-rock → ▶ 60초
# localhost:3000/jam → punk-garage-rock → ▶ 30초
```

청취 포인트:
- power-ballad: half-time slow, clean arpeggio, bar 13~15 hat 8분 + tom fills, bar 16 crash
- punk: 빠른 170bpm, hat 8분 강하게, bass pumping, guitar power chord(root+5만), bar 8 crash

⚠️ 청취 결과 punk power chord가 약하면 — 카드 profile에서 voicingMode 효과 일시 disable 가능 (하지만 기본은 keep).

- [ ] **Step 12: 커밋 + PR**

```bash
git add apps/web/lib/api/catalog.json \
        apps/web/lib/audio/backing/patterns/library/rock.ts \
        apps/web/lib/audio/backing/patterns/types.ts \
        apps/web/lib/audio/backing/engine.ts \
        apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/library/rock-power-ballad.test.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/library/rock-punk.test.ts

git commit -m "$(cat <<'EOF'
feat(audio): add power-ballad-rock and punk-garage-rock cards

신규 2 카드 + 2 variant. power_ballad(16bar): half-time + clean arpeggio
(distortion → clean override) + bar 13~15 climax(hat 8분 + tom fills) + bar 16
crash로 lush dynamic. punk_8th(8bar, 170bpm): hat 8분 강하게 + kick 4박 +
snare 2+4 + guitar 8분 down-only with voicingMode='power'(root+5만).

StrumStep에 voicingMode?: 'full' | 'power' optional 추가, engine이 trigger
시 흘려보냄. PR-B의 voicingMode 옵션 + tom/crash lookup 의존.

rock 카테고리 BPM 범위 75~170 확장.

Sprint 11 카드 6·7/7.

Refs: docs/superpowers/specs/2026-05-03-catalog-7-cards-design.md §3.6, §3.7, §4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin feat/cards-rock-pair
gh pr create --base feat/catalog-7-cards --title "feat(audio): rock pair — power-ballad + punk-garage" --body "## Summary
- catalog 2 entries (power-ballad-rock 16bar 75bpm, punk-garage-rock 8bar 170bpm)
- rock.ts: pb_intro/main/climax/resolve + punk_main/climax slots + selectSlot
- types.ts: StrumStep.voicingMode? optional
- engine.ts: voicingMode 흘려보내기
- card-profiles 2 entries (power-ballad clean override, punk dry 0.08)

## Test plan
- [x] selectSlot 매핑 (power-ballad 16, punk 8)
- [x] pb_climax tom + hat 8분 검증
- [x] punk voicingMode='power' 발현
- [x] 청취: power-ballad slow lush, punk 빠르고 dry, power chord 들림

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Task 9 (PR-I): 통합 검증 + main 머지

**목표:** sub-PR 8개 모두 `feat/catalog-7-cards`에 머지된 상태에서 통합 회귀 + 사용자 청취 + main 머지.

**브랜치:** `feat/catalog-7-cards` (직접 작업)

**Files:**
- Modify: `apps/web/tests/e2e/jam-card-profiles.spec.ts` (E2E 6장 추가)
- Modify: `apps/api/tests/test_progression_templates.py` (신규 7 슬러그 회귀)
- Modify: `CLAUDE.md` (Sprint 11 항목 추가)
- Modify: `docs/planning.md` (Sprint 11 머지 기록)

- [ ] **Step 1: 통합 브랜치 최신화 + 모든 sub-PR 머지 확인**

```bash
git checkout feat/catalog-7-cards
git pull origin feat/catalog-7-cards
gh pr list --base feat/catalog-7-cards --state merged
# 8건(PR-A ~ PR-H) 머지 확인
```

- [ ] **Step 2: E2E 테스트 6장 추가**

Modify `apps/web/tests/e2e/jam-card-profiles.spec.ts` — 기존 카드 배열에 신규 추가:

```typescript
const NEW_CARDS_E2E = [
  { slug: 'autumn-leaves',        category: 'jazz',  bars: 16 },
  { slug: 'epic-minor-cinematic', category: 'minor', bars: 16 },
  { slug: 'cissy-strut-funk',     category: 'funk',  bars: 16 },
  { slug: 'bossa-major-ipanema',  category: 'bossa', bars: 8 },
  { slug: 'travis-pick-folk',     category: 'folk',  bars: 8 },
  { slug: 'power-ballad-rock',    category: 'rock',  bars: 16 },
];

NEW_CARDS_E2E.forEach(({ slug, category, bars }) => {
  test(`${category}/${slug} — 4초 재생 후 bar counter 진행`, async ({ page }) => {
    await page.goto('/jam');
    await page.click(`[data-testid="progression-card-${slug}"]`);
    await page.click('[data-testid="play-button"]');
    // 4초 대기 — 한 마디 (4박/170bpm = 약 1.4s, 4초 = 2.8마디 이상 진행 보장)
    await page.waitForTimeout(4000);
    const counterText = await page.locator('text=/bar \\d+\\/\\d+/').textContent();
    expect(counterText).toMatch(new RegExp(`bar [2-9]\\d?\\/${bars}`));
    // console error 0건
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 3: API 테스트 추가 — 신규 7 슬러그**

Modify `apps/api/tests/test_progression_templates.py` — 신규 슬러그 검증 케이스 추가:

```python
NEW_SLUGS = [
    "autumn-leaves",
    "epic-minor-cinematic",
    "cissy-strut-funk",
    "bossa-major-ipanema",
    "travis-pick-folk",
    "power-ballad-rock",
    "punk-garage-rock",
]

@pytest.mark.asyncio
async def test_new_cards_in_catalog(client):
    """Sprint 11 신규 7 카드가 GET /progression-templates에 모두 포함."""
    response = await client.get("/progression-templates")
    assert response.status_code == 200
    slugs = {tpl["slug"] for tpl in response.json()}
    for slug in NEW_SLUGS:
        assert slug in slugs, f"신규 카드 {slug} 누락"

@pytest.mark.asyncio
async def test_catalog_size(client):
    """카탈로그 22 → 29장."""
    response = await client.get("/progression-templates")
    assert len(response.json()) == 29
```

- [ ] **Step 4: 시드 dry-run + DB 정합성**

```bash
cd apps/api
docker compose up -d
uv run python -m app.scripts.seed
# Expected: "Seed complete: inserted=7, skipped=22"
```

- [ ] **Step 5: 전체 테스트 (web + api)**

```bash
cd apps/web && pnpm typecheck && pnpm lint && pnpm test
cd ../api && uv run pytest
```

Expected: 모두 PASS.

- [ ] **Step 6: E2E (Docker)**

```bash
docker compose -f docker-compose.test.yml --profile e2e up --exit-code-from playwright
```

Expected: 신규 6 + 기존 카드 모두 PASS.

- [ ] **Step 7: 청취 검수 — 7 카드 30초씩**

```bash
cd apps/web && pnpm dev
# localhost:3000/jam에서 카드 7장 모두 30초씩 재생
```

청취 체크리스트:
- [ ] autumn-leaves: 16bar form, swing 0.62, bar 16 chromatic approach
- [ ] epic-minor-cinematic: half-time, bar 13 tom buildup, bar 16 crash + harmonic minor V
- [ ] cissy-strut-funk: bar 16 stop-time 분명
- [ ] bossa-major-ipanema: descending chromatic, 4× stab/bar
- [ ] travis-pick-folk: 드럼 무음, 베이스 C→B→A→G 하강
- [ ] power-ballad-rock: clean arpeggio, climax dynamic 차이, bar 16 crash
- [ ] punk-garage-rock: 빠르고 dry, power chord 효과 들림

- [ ] **Step 8: 스크린샷 회귀**

```bash
cd apps/web && pnpm screenshots
# docs/introduction/auto/ 14장 정상 생성 확인
ls docs/introduction/auto/
```

기존 셀렉터 깨짐 없음 확인.

- [ ] **Step 9: CLAUDE.md / planning.md 업데이트**

Modify `CLAUDE.md` — Phase 4 로드맵 섹션의 Sprint 10 다음에 추가:

```markdown
  - Sprint 11: 카탈로그 22→29(jazz/minor/funk/bossa 1→2장, folk 2→3, rock 2→4) +
    슬래시 코드 파서 도입(`I/VII` → bassDegree·bassSemitones, chordBassMidi 신설)
    + guitar voicingMode='power' (root+5th, punk 카드용) + drums tom/crash 동적
    lookup(WeakMap 캐시, kit 부재 시 snare 폴백). 신규 카드별 정통 idiom — Autumn
    Leaves form / Epic Cinematic minor / Cissy Strut form / major chromatic
    Ipanema / Travis pick fingerstyle / power ballad / punk garage. swing
    perVariant — jazz autumn_leaves 0.62.
```

Modify `docs/planning.md` §12 Sprint 11 항목 머지 기록.

- [ ] **Step 10: 통합 PR 생성 (`feat/catalog-7-cards` → `main`)**

```bash
git add apps/web/tests/e2e/jam-card-profiles.spec.ts \
        apps/api/tests/test_progression_templates.py \
        CLAUDE.md \
        docs/planning.md

git commit -m "$(cat <<'EOF'
test+docs(audio): Sprint 11 통합 — E2E 6장 + API 회귀 + 문서

E2E: 신규 6 카드(카테고리당 1장 — rock 대표는 power-ballad)에서 4초 재생 후
bar counter 진행 + console error 0건 검증.

API: 신규 7 슬러그 GET /progression-templates 포함 + 카탈로그 size 29 회귀.

CLAUDE.md / planning.md에 Sprint 11 결과 기록 — 슬래시 파서, voicingMode,
tom/crash lookup 등 인프라 변경 명시.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin feat/catalog-7-cards

gh pr create --base main --head feat/catalog-7-cards --title "feat(audio): Sprint 11 — catalog +7 cards (jazz/minor/funk/bossa/folk/rock×2)" --body "$(cat <<'EOF'
## Summary
카탈로그 22 → 29. 6개 카테고리에 신규 카드 7장 + 사전 인프라 3건.

### 신규 카드
- **jazz**: `autumn-leaves` (16bar Autumn Leaves form, swing 0.62)
- **minor**: `epic-minor-cinematic` (16bar half-time, harmonic minor V)
- **funk**: `cissy-strut-funk` (16bar Meters form, bar 16 stop-time)
- **bossa**: `bossa-major-ipanema` (8bar major chromatic, tritone sub bII7)
- **folk**: `travis-pick-folk` (8bar fingerstyle, 슬래시 코드 descending bass)
- **rock**: `power-ballad-rock` (16bar half-time + clean arpeggio)
- **rock**: `punk-garage-rock` (8bar 170bpm + power chord)

### 사전 인프라
- 슬래시 코드 파서 (`I/VII` → bassDegree, chordBassMidi 신설)
- Guitar voicingMode='power' (root + p5만)
- Drums tom/crash dynamic lookup (WeakMap 캐시, snare 폴백)

## Test plan
- [x] 단위 테스트 +60 케이스 (파서 슬래시 +20, voice 옵션 +9, selectSlot +30+)
- [x] 컴포넌트 카탈로그 size 회귀
- [x] 오디오 spy: stop-time, swing perVariant, voicingMode, drum lookup
- [x] E2E 6 카테고리 1장씩 (카드 click → ▶ → 4초 → bar counter)
- [x] API 회귀: 신규 7 슬러그 catalog 포함
- [x] 청취 검수 30초 × 7장 — 카드별 정체성 식별 가능
- [x] 스크린샷 14장 회귀 — 기존 셀렉터 OK
- [x] localStorage v12 유지

## Sub-PRs (모두 머지 완료)
- PR-A: feat/parser-slash-chord
- PR-B: feat/voice-extensions
- PR-C: feat/card-autumn-leaves
- PR-D: feat/card-epic-minor
- PR-E: feat/card-cissy-strut
- PR-F: feat/card-bossa-major
- PR-G: feat/card-travis-pick
- PR-H: feat/cards-rock-pair

## Review notes
- music-theory-guardian: 슬래시 파서 + 7장 진행 정통성 검증
- web-audio-engineer: voice 확장 + variant + selectSlot 검토
- test-strategist: TDD red-green 사이클 + 오디오 spy 패턴 확인
- backend-architect: catalog.json + seed idempotent 검증

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 11: PR 머지 — squash**

GitHub UI에서 squash merge. 통합 브랜치는 머지 후 정리:

```bash
git checkout main && git pull
git push origin --delete feat/catalog-7-cards
git branch -D feat/catalog-7-cards
```

main이 자동 배포로 프로덕션 반영.

---

## Self-Review 체크 결과 (계획 작성 후)

**1. Spec coverage:** 7장 × 슬롯 7 variant + 슬래시 파서 + voicingMode + tom/crash lookup + 카드 프로필 + E2E 6 + API 회귀 — spec §1~12 모두 task에 매핑.

**2. Placeholder 스캔:** 없음. 모든 코드 블록 실제 구현.

**3. Type 일관성:**
- `parseRoman` 반환 타입에 추가된 `bassDegree?` / `bassSemitones?` 모든 task에서 일관 참조.
- `chordBassMidi(symbol, key, octave)` Task 1에서 정의 → Task 7 테스트에서 같은 시그니처 호출.
- `voicingMode?: 'full' | 'power'`이 Task 2 (guitar.ts) → Task 8 (StrumStep + engine + rock.ts) 일관.
- `DrumPattern.tom?` `crash?` Task 2 정의 → Task 4 (epic_climax) / Task 8 (pb_climax/punk_climax) 사용.
- `'kick' | 'snare' | 'hat' | 'tom' | 'crash'` step union Task 2에서 정의 → engine.ts trigger 일관.

**4. 의존성 순서:** Task 0 → 1·2 병렬 → 3·4·5·6·7·8 병렬 (1 머지 후 7, 2 머지 후 4·8) → 9 통합. 그래프 자명.

---

## 작업 후 follow-up (이번 plan 외)

- chord-overlay에 슬래시 베이스 표시 (현재는 audio만, 시각 X)
- jazz brush 복원 (Sprint 2-8 부터 잠재된 폴백 — 별도 sprint)
- random comping fills (Sprint 9 후보 잔존)
- piano voice (jazz comping)
