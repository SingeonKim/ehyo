# Changelog

이 프로젝트의 사용자 가시 변경사항을 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)를 따르며, 버저닝은 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 따른다.

이 프로젝트의 SemVer 해석:
- **MAJOR** — 사용자 영속 스키마(`localStorage`) 마이그레이션 강제, 라우트/URL 구조 변경, 호환되지 않는 동작 변경
- **MINOR** — 새 카드/카테고리/스케일/instrument 추가, 새 기능, 신규 카드 프로필
- **PATCH** — 버그 수정, 톤/볼륨/이펙트 미세 조정, 문서/스크린샷, 비기능적 리팩터

## [Unreleased]

## [1.1.0] - 2026-05-05

### Added
- **라이트 테마 토글** — 헤더 우측 sun/moon 아이콘 버튼으로 라이트/다크 1클릭 전환. 랜딩 + 모든 practice 라우트(`/metronome`, `/fretboard`, `/jam`)에서 노출. 사용자 선택은 `ui.theme`에 영속화.
  - 첫 방문은 항상 다크가 기본 — 시스템 환경설정(`prefers-color-scheme`)을 추적하지 않음.
  - 라이트 팔레트 캐릭터 — "악보지/편집지" 톤. cream `#F4ECD8` 배경 + 짙은 갈색 잉크 + 어두운 황동 accent. brass/copper/signal-red 같은 핵심 hue 카테고리는 다크와 동일하게 유지하고 명도만 조정.
  - 모든 라이트 토큰은 cream 배경 대비 AA(4.5:1) 이상 — `aesthetic-reviewer` 게이트 통과.
  - FOUC 방지 — `next/script` `beforeInteractive` 전략으로 hydration 이전에 `data-theme`을 박는다. 라이트 사용자도 새로고침 시 첫 페인트부터 라이트.
  - `color-scheme` 동기화 — `html { color-scheme: dark }` + `html[data-theme="light"] { color-scheme: light }` 으로 native 스크롤바·form 컨트롤이 항상 테마와 일치.
  - 라이트 모드 chord-overlay — cream 배경 위 opacity 빠짐 보정용 `chord-overlay-pulse-light` keyframe(0.95→0.78).
  - 토글 시 200ms body transition.

### Changed
- Practice 카테고리 라벨 색상을 8개 모두 distinct하게 매핑 — funk(copper) / bossa(rose) / folk(teal) / rock(signal). `--color-highlight-rose` · `--color-highlight-teal` 토큰 신규.

## [1.0.0] - 2026-05-04

기타 연습용 메트로놈 + 스케일 가이드 + 배킹 트랙의 첫 안정 버전. Phase 0~4(Sprint 11)의 누적 결과.

### Highlights
- **메트로놈** — Chris Wilson lookahead 스케줄러(25ms / 100ms, iOS 150ms), AudioContext 싱글턴, BPM 입력 + Tap Tempo, BeatLED, sticky `MetronomeDock`
- **지판 스케일 가이드** — 16 스케일(메이저/마이너 모드 7 + 하모닉/멜로딕 마이너/펜타토닉/블루스/홀톤/디미니쉬드 등), 3단계 노트 마커(Root/Important/Regular), 7 튜닝 프리셋(Guitar 6 Standard/Drop D/DADGAD/E♭, Guitar 7, Bass 4 Standard/Drop D), 좌/우 손잡이 전환
- **Practice 통합 뷰** — 코드 진행 카탈로그 29장(blues/jazz/minor/funk/bossa/modal/folk/rock 9 카테고리), Roman ↔ Absolute 코드 표기 토글, 카드 시작 시 추천 스케일 자동 적용, sticky 지판
- **배킹 트랙 엔진** — smplr 기반(Soundfont/DrumMachine/Reverb), Master FX 체인(compressor + reverb send), 카드 프로필 시스템(rhythm variant + tone profile + instrument override), 그루브 표현(swing 0.5~0.75 + triplet8 unit), 슬래시 코드 파서(`I/VII` descending bass), guitar power chord 보이싱
- **Voice mute** — drums/bass/guitar/aux 4 voice 개별 음소거, 다음 마디부터 반영
- **브랜딩** — "에휴.. (Ehyo..)" 통일, 랜딩 `RandomTaunt` 자극 멘트 페이드 사이클

### Audio engine
- 단일 AudioContext 원칙 — 메트로놈/배킹/Tone.js Transport가 같은 clock 공유
- master volume slider 정상화 — smplr instance를 `fxChain.input`으로 라우팅하고 `masterGain`을 final stage에 배치
- 절대 볼륨 통일 — 모든 카드가 동일 base velocityScale/voiceGain, 카드 정체성은 reverbWet + instrument override + 패턴(swing/마디 변주)으로만 표현
- drum sample 동적 lookup — kit별 sample 이름 차이 흡수(LM-2 `hhclosed-short`, Roland CR-8000 `cymball` 오타 등), 부재 시 폴백
- Master FX 체인 — `input → compressor(-18dB/3:1) → split(dry 0.82 / wet 0.18 → reverb) → masterGain → ctx.destination`

### Persistence
- Zustand `persist` → `localStorage` 키 `my-music-app:v1`, 스키마 v12 — `version` + `migrate`로 상위 호환

### Infrastructure
- 모노레포 — `apps/web`(Next.js 15 App Router · Tailwind v4 · Zustand) + `apps/api`(FastAPI · SQLAlchemy 2.x async · Alembic)
- 카탈로그는 빌드 타임 JSON으로 인라인(런타임 API 의존 제거) — Railway 단일 컨테이너 배포 가능
- Pretendard Variable 셀프 호스팅 + 보안 헤더(CSP 등) baseline
- Docker Playwright E2E + 결정론적 스크린샷 14장 자동 캡처 파이프라인
- CI — `lint` / `typecheck` / `unit` / `build` / `api-test` required status checks

### Known limitations
- jazz brush kit 부재 — smplr 0.20.0이 5 kit(TR-808/Casio-RZ1/LM-2/MFB-512/Roland CR-8000)만 지원, jazz 카테고리는 TR-808 폴백
- 사용자 인증/프리셋 공유 미지원 — Phase 5+에서 도입 예정
- Playwright 로컬은 Docker 경유 권장 — WSL에서 시스템 chromium 라이브러리(`libnspr4` 등) 누락 시 실패

[Unreleased]: https://github.com/SingeonKim/ehyo/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/SingeonKim/ehyo/releases/tag/v1.1.0
[1.0.0]: https://github.com/SingeonKim/ehyo/releases/tag/v1.0.0
