# Sprint 10 — 카드 도메인 검수 + 신규 카드 + modal 마디수 통일 (Design)

> **상태**: Brainstorming 완료, 사용자 승인 후 plan 단계 대기
> **작성일**: 2026-04-26
> **선행**: Sprint 9 (PRs #20–#24, 카드 프로필 시스템 + 17장 매핑 + variant 분기 머지)

## Goal

현 카탈로그 17장의 도메인 정체성을 청취 기반으로 전수 재검수하고, 비어 있는 folk/rock 카테고리 + 사이드 보강 1장을 포함한 신규 5장을 추가한다. modal 카테고리 3장의 마디수를 2bar → 4bar로 통일해 진행 호흡을 늘린다.

## Architecture

Sprint 9 카드 프로필 시스템(`CARD_PROFILES` × `CategoryRhythm` × `swing.ts` × `profile-merge.ts`)을 재사용하고, 신규 카드는 *카테고리 라이브러리 variant 신설 + 카드 프로필 등재 + 카탈로그 시드 INSERT*의 3단 결합으로 추가한다. modal 마디수 변경은 카탈로그 row UPDATE 단발 마이그레이션으로 처리하며, 사용자 localStorage는 진행 슬러그 ref만 보관하므로 영향 없다.

청취 검수 PR은 카테고리 단위로 묶어 한 세션에 비교 청취하며, 변경 범위는 `patterns/library/<cat>.ts`(variant·패턴) + `card-profiles.ts`(tone·variant)로 한정한다.

## Tech Stack

기존 그대로: Next.js 15, smplr 0.20.0, FastAPI/SQLAlchemy 2.x async, Alembic.

---

## Scope

**작업 단위**: 22장 (17장 검수 + 신규 5장)

**검수 깊이**: 17장 전수 재청취 (Sprint 9에서 깊게 다듬은 5장 포함, 일관된 기준으로 균형 재조정)

**신규 카드 카테고리 분포**:
- folk 카테고리(현재 0장) → 2장 추가
- rock 카테고리(현재 0장) → 2장 추가
- modal 카테고리(현재 3장) → 1장 추가 (`phrygian-vamp`)

**비추가 결정**:
- 새 카테고리 신설(reggae/country/gospel 등) — 후속 스프린트로 미룸
- jazz 32bar rhythm changes — bars=32 부담 + 우선순위 낮음

---

## 신규 카드 5장 정의

| slug | 카테고리 | bars | bpm | 진행 | 도메인 정체성 |
|---|---|---|---|---|---|
| `folk-I-IV-V` | folk | 4 | 95 | I - IV - V - I | 3-chord folk staple, acoustic strum 4/4 down-up 8분 |
| `ballad-I-V-vi-IV` | folk | 8 | 70 | I - V - vi - IV - I - V - IV - V | half-time finger-pick ballad, 풍부한 reverb |
| `rock-I-bVII-IV` | rock | 4 | 110 | I - bVII - IV - I | Mixolydian rock, distortion guitar 8th down-pick |
| `rock-12-bar` | rock | 12 | 130 | I7 × 4 / IV7 × 2 / I7 × 2 / V7 / IV7 / I7 / V7 | Chuck Berry 8분, dry, rockabilly |
| `phrygian-vamp` | modal | 4 | 100 | i - bII - i - bII | Spanish/exotic, half-time, distortion guitar |

### 카테고리 라이브러리 변경

**folk.ts** — 신규 variant:
- `folk_strum` (bars=4): 4/4 down-up 8분 acoustic, ghost snare/hat 4분
- `ballad_pick` (bars=8): half-time finger-pick, kick 1/3박, soft hat triplet8 또는 sub16

**rock.ts** — 신규 variant:
- `rock_mixo` (bars=4): 8분 down-pick distortion, 4 on the floor 킥
- `rock_12bar` (bars=12): Chuck Berry 8분 + 마디별 분기(idx=8 tension, 10 resolve, 11 turnaround Sprint 9 패턴 재사용)

**modal.ts** — 기존 3 variant + 신규 1:
- `dorian_groove` (bars=4): 짝/홀 alternating, b3+6 정체성
- `lydian_dreamy` (bars=4): 단순 반복, #4 fanfare 강조 ride/hat
- `mixolydian_driving` (bars=4): 단순 반복, b7 강조 8분 hat
- `phrygian_dark` (bars=4): half-time, sub16 ghost snare, dark 정서

### 카드 프로필 등재

`CARD_PROFILES`에 5장 신규 추가. 카테고리 default tone 위에 부분 override:
- `folk-I-IV-V`: rhythmVariant `folk_strum`만, tone default
- `ballad-I-V-vi-IV`: rhythmVariant `ballad_pick`, reverbWet 0.30, velocityScale 0.85
- `rock-I-bVII-IV`: rhythmVariant `rock_mixo`, reverbWet 0.10
- `rock-12-bar`: rhythmVariant `rock_12bar`, reverbWet 0.12
- `phrygian-vamp`: rhythmVariant `phrygian_dark`, reverbWet 0.25

instrument override는 카테고리 default와 다른 경우에만 추가 (PR-A 시점 카테고리 default 확인 후 결정, SoundFont 캐시 부담 최소화).

---

## 마디수 조정 (modal 3장 2bar → 4bar)

| slug | 현재 (2bar) | 변경 후 (4bar) | 근거 |
|---|---|---|---|
| `dorian-vamp` | i - IV | i - IV - i - bVII | bVII 추가로 dorian-aeolian 경계 살짝 풍부 |
| `lydian-vamp` | I - II | I - II - I - II | 단순 반복 유지 (#4 색감 강조) |
| `mixolydian-vamp` | I - bVII | I - bVII - I - bVII | 단순 반복 유지 (b7 색감), 신규 `rock-I-bVII-IV`와 차별화 |

`mixolydian-vamp`는 4bar I-bVII-IV-I로 확장하면 신규 `rock-I-bVII-IV`와 거의 같아져 일부러 단순 반복 유지. tempo·instrument·reverb로 차별화.

`lydian-vamp`는 진행 자체는 단순 반복이지만 4bar로 늘려 패턴 짝/홀 alternating 강세 차이로 변주 여지 확보.

---

## PR 시퀀스

### PR-A: 신규 5장 + modal 마디수 통일

**범위:**
- `patterns/library/folk.ts`: `folk_strum`/`ballad_pick` variant 신설 + selectSlot 분기
- `patterns/library/rock.ts`: `rock_mixo`/`rock_12bar` variant 신설 + selectSlot 분기 (12bar 분기는 blues `shuffle12bar` 패턴 재사용)
- `patterns/library/modal.ts`: 4장 variant 4bar 패턴, `phrygian_dark` 신설
- `apps/api/app/scripts/seed.py`: 신규 5장 INSERT + modal 3장 bars/progression 변경
- 새 alembic data migration revision: modal 3장 row UPDATE (idempotent seed 우회)
- `apps/web/lib/audio/backing/card-profiles.ts`: 5장 신규 등재
- 단위 테스트 추가:
  - 카테고리별 `selectSlot` (신규 variant idx 분기)
  - `card-profiles.test.ts` (신규 5 슬러그 머지 결과)
  - alembic migration up/down 검증
- `pnpm --filter @my-music-app/web types:api` 재실행

**완료 조건:**
- `pnpm typecheck`/`pnpm lint`/`pnpm test`/`uv run pytest` 통과
- dev 청취로 신규 5장 + modal 4장 동작 확인
- 사용자 OK 후 머지

### PR-B: blues 8장 도메인 재청취 검수

**대상 카드:** 12-bar-blues-major / 12-bar-blues-minor / 12-bar-blues-quick-change / slow-minor-blues / hard-bop-minor-blues / shuffle-minor-blues / jazz-major-blues / jump-blues

**범위:**
- 사용자 청취 → 피드백 → variant/tone/패턴 수정 사이클
- 변경 범위: `patterns/library/blues.ts` + `card-profiles.ts` 한정
- 단위 테스트 갱신 (blues `selectSlot`, card-profiles 머지 결과)

**완료 조건:** 사용자 청취 OK + 자동화 검증 통과

### PR-C: modal 4장 검수

**대상 카드:** dorian-vamp / lydian-vamp / mixolydian-vamp / phrygian-vamp (4bar 새 진행)

**범위:**
- 4bar 진행이 도메인적으로 충분한지 청취 검증
- 추가 마디수 조정 필요 시 이 PR에서 같이 (예: 부족하면 8bar로 확장)
- `patterns/library/modal.ts` + `card-profiles.ts` 한정

### PR-D: 10장 묶음 검수

**대상 카드:** pop 2 + jazz 1 + minor 1 + funk 1 + bossa 1 + 신규 folk 2 + 신규 rock 2

**범위:**
- 카테고리 다양성 → 한 세션에 듣고 비교
- 카테고리별 라이브러리 + card-profiles 부분 수정

---

## 검수 PR 운영 사이클

각 검수 PR(PR-B/C/D)은 다음 사이클 반복:

1. AI가 dev 환경에서 카드별 청취 가이드 제공 (어느 카드, 어느 키, 어떤 BPM에서 들어볼지)
2. 사용자 청취 → 자유 형식 피드백 ("X 카드 Y 마디 어색해", "Z 부분 더 비어 있으면 좋겠어")
3. AI가 `patterns/library/<cat>.ts` 또는 `card-profiles.ts` 수정 → 재청취
4. 사용자 OK → 커밋
5. PR 단위 청취 모두 OK → 머지

**중요**: 검수 PR은 *해당 카드/카테고리에 대한 변경*만 포함. 다른 카테고리 사이드 변경은 별 PR로.

---

## Testing

**단위 테스트 (Vitest)**:
- `tests/unit/lib/audio/backing/patterns/<cat>.test.ts`: 신규 variant `selectSlot` idx 분기, 마디수 변경 후 idx 회귀
- `tests/unit/lib/audio/backing/card-profiles.test.ts`: 신규 5 슬러그 머지 결과 + 카테고리 default 정합성
- `tests/unit/lib/audio/backing/profile-merge.test.ts` 회귀
- `parseBeatStep` 신규 사용 회귀

**통합 테스트 (Vitest)**:
- `tests/unit/lib/audio/backing/engine.test.ts`: 신규 카드 시작 시 voice/swing/tone 적용 회귀

**API 테스트 (pytest)**:
- 신규 5장 INSERT + modal 3장 UPDATE 후 catalog 응답 회귀
- alembic upgrade/downgrade 양방향 검증

**E2E (Playwright, Docker)**:
- 카탈로그 페이지에서 신규 5장 카드 노출 확인 (smoke)

**dev 정합성 가드**: `__assertCardProfilesMatch(catalogSlugs)`가 22 슬러그 정합성 검증 (백엔드 카탈로그와 동일).

---

## Migrations

**DB (Alembic)**:
- 새 revision: 신규 5장 INSERT + modal 3장 row UPDATE (`bars`, `progression` JSON)
- 기존 idempotent seed.py는 신규 5장 INSERT만 처리. modal 3장 UPDATE는 alembic data migration이 단발 처리(seed가 "이미 있으면 skip"하는 한계 우회)
- downgrade: 신규 5장 DELETE + modal 3장 원복

**localStorage**: 영향 없음 (현 v10 유지). 사용자 상태는 진행 슬러그 ref만 보관.

**OpenAPI**: `pnpm --filter @my-music-app/web types:api`로 `generated.ts` 갱신.

---

## SoundFont 캐시 부담

신규 카드 instrument는 카테고리 default와 같으면 추가 부담 0. 차이 발생 시 `instrumentOverrides`로 제한.

PR-A 시점에 folk/rock/modal 카테고리 default instrument 확인 후 override 최소화 결정. Sprint 9 패턴(전체 17장 중 instrument override는 2장만) 유지.

---

## Risks

| 리스크 | 완화 |
|---|---|
| modal 진행 변경이 진행중 사용자 재생을 깸 | DB fetch는 카드 재선택 시점에 발생 → 자연스럽게 새 진행 적용 |
| 청취 검수 PR 22장 동기화 부담 | PR-D 10장이 가장 큼. 카드별 청취 가이드로 1세션 1카테고리 진행 |
| 신규 variant 추가가 기존 회귀 깸 | 카테고리별 `selectSlot` 단위 테스트가 기존 idx 분기 보존 검증 |
| modal 4bar 청취 결과가 도메인적으로 부족 | PR-C에서 8bar 확장 결정 가능 (마디수 추가 조정도 PR-C 범위에 포함) |
| 신규 카드 카테고리 default가 도메인과 안 맞음 | PR-A 시점 청취 후 카테고리 default 자체 수정 (이 경우 기존 카드 영향 → PR-B/C/D 검수에서 같이 잡음) |
| smplr DrumMachine kit이 folk/rock 도메인과 안 맞음 | LM-2/TR-808/Casio-RZ1 중 카테고리별 매핑은 `CATEGORY_BUNDLES`에 이미 정의. 부적합 시 instrument override로 처리. acoustic kit 부재는 Sprint 2-8과 같은 한계, 후속 Sprint에서 Sampler 도입 검토 |

---

## 후속 (Sprint 11+)

- 새 카테고리 신설 (reggae, country, gospel)
- jazz 32bar rhythm changes
- smplr Sampler + 외부 CC0 acoustic drum 샘플 (folk/jazz brush 복원 — Sprint 9에서 이월된 항목)
- voice별 EQ, humanize
- random comping fills (Art Blakey 스타일)
