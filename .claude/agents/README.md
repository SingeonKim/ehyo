# my-music-app 에이전트 팀

이 프로젝트 전용 서브에이전트 6종. Claude Code가 Task tool로 호출하거나, PROACTIVELY 조건에 해당하는 파일이 수정될 때 자동 소환된다.

## 구성원

| 에이전트 | 역할 한 줄 | 주 담당 경로 |
|---|---|---|
| `music-theory-guardian` | 스케일·코드·도수 데이터의 정확성 | `lib/theory/**`, `IMPORTANT_DEGREES` |
| `web-audio-engineer` | 오디오 타이밍·스케줄링·동기화 | `lib/audio/**`, AudioContext, Tone.js |
| `fretboard-renderer` | 지판 SVG·노트 마커 렌더링 | `components/fretboard/**`, `lib/theory/fretboard.ts` |
| `aesthetic-reviewer` | 디자인 규율 집행, AI 슬롭 차단 | UI 전반, CSS 토큰, 애니메이션 |
| `test-strategist` | Vitest · Playwright · 오디오 타이밍 Spy | `tests/**`, CI, Docker test env |
| `nextjs-architect` | App Router · Zustand · Tailwind v4 · 빌드 | `app/**`, `lib/store/**`, Docker |

## 호출 매트릭스

| 작업 | 단독 | 병렬 호출 추천 |
|---|---|---|
| 새 스케일 추가 | music-theory-guardian | + test-strategist |
| 메트로놈 스케줄러 변경 | web-audio-engineer | + test-strategist |
| 지판 UI 변경 | fretboard-renderer | + aesthetic-reviewer |
| 지판 수학(노트 좌표) 변경 | fretboard-renderer | + music-theory-guardian |
| 새 페이지 추가 | nextjs-architect | + aesthetic-reviewer + test-strategist |
| CSS 토큰·폰트 변경 | aesthetic-reviewer | + nextjs-architect |
| Zustand persist 스키마 변경 | nextjs-architect | + test-strategist |
| Docker/CI 변경 | test-strategist | + nextjs-architect |
| 배킹 트랙 엔진 (Phase 5+) | web-audio-engineer | + music-theory-guardian |

## 협업 원칙

- 변경 범위가 여러 도메인에 걸치면 담당자들을 **병렬**로 호출한다 (단일 메시지에 여러 Task tool call).
- **music-theory-guardian** 은 데이터 정합성의 최종 판정자. 의견 충돌 시 이 에이전트 우선.
- **aesthetic-reviewer** 는 비토권만 있고 구현 세부는 담당 에이전트에게 위임한다.
- **test-strategist** 는 새 기능이 머지되기 전 반드시 1회 호출 (CI의 소프트 게이트).

## 호출 예시

```
# 수동 호출
Task(subagent_type="music-theory-guardian",
     description="C# 리디안 추가 검증",
     prompt="SCALES.lydian에 대해 Root C#에서 노트 리스트와 IMPORTANT_DEGREES[lydian] 적용 결과가 음악 이론상 맞는지 검증하고, 필요한 unit test 초안을 제시하라.")

# 병렬 호출 (한 메시지에 두 Task)
Task(subagent_type="fretboard-renderer", ...)
Task(subagent_type="aesthetic-reviewer", ...)
```

## 추가/변경 시

에이전트 정의 파일(`.md`)은 frontmatter의 `name`, `description`, `tools`, `model` 네 필드를 반드시 포함한다. 본문은 한국어 가능, 단 식별자/변수명/경로는 원문 유지.

새 도메인이 생기면 (예: Phase 5에서 FastAPI 백엔드 도입) `backend-architect` 에이전트를 추가한다. 기존 에이전트에 영역을 억지로 밀어넣지 않는다.
