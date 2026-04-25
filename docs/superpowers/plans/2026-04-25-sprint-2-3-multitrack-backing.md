# Sprint 2-3 — Multi-track Backing Engine Implementation Plan

**Spec:** `docs/superpowers/specs/2026-04-25-sprint-2-3-multitrack-backing-design.md`
**Branch:** `feat/sprint-2-3-multitrack-backing`
**Base SHA:** `ebb5580` (Sprint 2-2 머지)

## 진행 원칙

- 각 Task 종료 시 spec 준수 리뷰(general-purpose) → 코드 품질 리뷰(superpowers:code-reviewer) 두 단계.
- 모든 Task는 단독 커밋. Conventional Commits + scope=`audio`.
- 커밋 전 체크리스트(CLAUDE.md): `pnpm lint`, `pnpm typecheck`, 영향 범위 테스트 실행.
- voice/engine 분리 PR 한 번으로 가는 대신 인크리멘탈 — 패턴(Task 1) → voices+테스트(Task 2) → engine 리팩터+통합테스트(Task 3) → import 정리(Task 4) → 수동 청취(Task 5).

---

## Task 1 — Pattern types + BACKBEAT_PATTERN

**파일 (생성):**
- `apps/web/lib/audio/backing/patterns/types.ts`
- `apps/web/lib/audio/backing/patterns/backbeat.ts`

**구현:**
- spec §3의 `BeatStep`, `DrumPattern`, `BassPattern`, `KeysPattern`, `TrackPattern` 타입.
- spec §5의 `BACKBEAT_PATTERN` 상수.

**테스트:**
- 별도 테스트 없음 (순수 데이터). 다만 backbeat.ts 상단에 `as const satisfies TrackPattern` 적용해 컴파일 타임에 형 검증.

**완료 조건:**
- `pnpm typecheck` 통과.
- 임의 모듈에서 `import { BACKBEAT_PATTERN } from '@/lib/audio/backing/patterns/backbeat'` 가능.

**커밋:** `feat(audio): add backing track pattern types and backbeat preset`

---

## Task 2 — Voice 3종 + 단위테스트

**파일 (생성):**
- `apps/web/lib/audio/backing/voices/drums.ts`
- `apps/web/lib/audio/backing/voices/bass.ts`
- `apps/web/lib/audio/backing/voices/keys.ts`
- `apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts`
- `apps/web/tests/unit/lib/audio/backing/voices/drums.test.ts`
- `apps/web/tests/unit/lib/audio/backing/voices/bass.test.ts`
- `apps/web/tests/unit/lib/audio/backing/voices/keys.test.ts`

**구현:**
- 각 voice는 `getTone()` 경유로만 Tone 접근 — `import 'tone'` 금지.
- `DrumVoice`: 3개 synth(Membrane/Noise/Metal). spec §6 파라미터. trigger는 step 종류로 분기. stop()은 `triggerRelease(Tone.now())` 또는 일관된 방식. dispose()는 3개 synth dispose.
- `BassVoice`: MonoSynth. trigger(midi, duration, time) → `triggerAttackRelease(midiToFrequency(midi), duration, time)`. stop()은 `triggerRelease`. dispose는 MonoSynth dispose.
- `KeysVoice`: PolySynth(Sprint 2-2 코드 이관). trigger(midiNotes, duration, time) → `triggerAttackRelease(midiNotes.map(midiToFrequency), duration, time)`. stop()은 releaseAll. dispose는 PolySynth dispose.
- voice-mock-helpers.ts는 spec §8의 `makeSynthMock` + `Tone.Time` 결정론적 mock + tone-bridge factory 묶음. voice 테스트와 engine 테스트가 모두 import.

**테스트 (각 voice별):**
- trigger 시 적절한 synth의 `triggerAttackRelease`가 정확한 인자(특히 4번째 time)로 불리는지.
- stop() 시 dispose 호출 안 됨, 적절한 release 메서드가 불림.
- dispose 시 synth(들)의 dispose가 모두 1회씩 불림.

**완료 조건:**
- `pnpm test apps/web/tests/unit/lib/audio/backing/voices/` 통과.
- `pnpm typecheck` 통과.

**커밋:** `feat(audio): add drum/bass/keys voices for backing engine`

---

## Task 3 — Engine 리팩터 + 통합테스트

**파일 (이동/수정/생성):**
- 삭제: `apps/web/lib/audio/backing-track.ts`
- 생성: `apps/web/lib/audio/backing/engine.ts`, `apps/web/lib/audio/backing/index.ts`
- 이동: `apps/web/tests/unit/lib/audio/backing-track.test.ts` → `apps/web/tests/unit/lib/audio/backing/engine.test.ts`

**구현:**
- 기존 `backing-track.ts`의 state machine·store 브릿지 유지. polySynth 단일 인스턴스 → 3개 voice 인스턴스로 교체.
- 콜백 흐름은 spec §4 의사코드. `Tone.Time(rel).toSeconds()` 절대 시각 합산.
- 파싱 실패(midi=null) → 어떤 voice도 trigger 호출하지 않고 barIndex 증가만 + warn.
- `hardStop()`에 voice 3개의 `stop()` 호출 추가 (releaseAll 대체).
- `dispose()`에 voice 3개의 `dispose()` 호출 추가.
- `index.ts`는 기존 외부 export 이름 그대로 재-export — `getBackingEngine`, `BackingEngine`, `BackingState`, `__disposeBackingEngineForTests`, `__resetStoreBridgeForTests`.

**테스트:**
- voice factory 3개를 vi.mock으로 교체. 타입 캐스팅 강제로 인터페이스 계약 확인.
- 헬퍼의 Tone.Time mock 사용해 시간 오프셋 어설션.
- spec §8 검증 항목 전부:
  - 1콜백 트리거 횟수 (drum 12 / bass 2 / keys 1)
  - 두 번째 kick = 첫 kick + half measure 오프셋
  - 파싱 실패 → 0회 trigger
  - barIndex wrap
  - setKey → 새 keyRoot 기준 trigger, drum은 무관
  - start→stop→start 시 dispose 0회, stop 1회
  - `__disposeBackingEngineForTests` → 3 voice dispose 1회씩

**완료 조건:**
- `pnpm test apps/web/tests/unit/lib/audio/backing/` 통과.
- `pnpm typecheck` 통과.
- 외부 import 경로(@/lib/audio/backing-track)는 아직 살아있음 — Task 4에서 정리.

**커밋:** `refactor(audio): split backing engine into voices and patterns`

---

## Task 4 — Import 경로 일괄 치환

**파일 (수정):**
- `apps/web/lib/audio/backing-track.ts` 삭제(이미 Task 3에서 했지만 잔여 export 처리).
- `@/lib/audio/backing-track`을 import하는 모든 파일 → `@/lib/audio/backing` 으로 교체.

**검색·치환 대상:**
- `apps/web/components/jam/**`
- `apps/web/lib/store/app-store.ts` (영향 없을 수도 있음)
- `apps/web/tests/**`

**완료 조건:**
- `pnpm lint && pnpm typecheck && pnpm test` 모두 통과.
- `grep -r "lib/audio/backing-track" apps/web` 결과 0건.

**커밋:** `refactor(audio): switch imports to backing barrel module`

---

## Task 5 — 수동 청취 검증 + PR

**절차:**
1. `pnpm dev` 기동, http://localhost:3000/jam.
2. 임의 progression의 Play 버튼 클릭 → 드럼·베이스·keys가 동시에 들리는지.
3. Key 변경 → 다음 마디부터 베이스·keys 음높이 변경, 드럼은 그대로.
4. 카드 A 재생 중 카드 B Play → A 정지, B 시작 (단일 재생 원칙).
5. Stop 버튼 → 즉시 무음(잔향 없음 또는 짧은 release만).

**튜닝 (필요 시):**
- 음량 클리핑이 있으면 voice 내부 velocity 감소.
- Kick `octaves` 6→10 또는 그 반대 비교.
- Bass offset -12→-24 비교.

**도큐먼트:**
- spec §11 오픈 이슈를 청취 결과로 채워 spec 하단에 "청취 결과 노트" 추가.

**PR:**
- 제목: `feat: Sprint 2-3 — multi-track backing engine (drums + bass + keys)`
- 본문: Summary / Test plan / Review notes (web-audio-engineer + test-strategist 리뷰 결과 인용).
- 머지 자동 금지 — 사용자 확인 후 머지.

**커밋(필요 시):** `style(audio): tune voice parameters per listening pass`

---

## 리스크 / 롤백

- Task 3 중 회귀 발생 시: `git revert` 대신 voice 통합을 단계적으로 — 우선 keys만 새 구조에 연결하고 drum/bass는 다음 커밋으로 분리.
- 빌드 실패 (e.g. 모듈 해석): Task 4 import 정리를 Task 3에 흡수해 한 번에 정합성 맞춤.
