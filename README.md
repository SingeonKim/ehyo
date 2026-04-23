# my-music-app

기타 연습자를 위한 웹 기반 메트로놈 · 스케일 가이드. 배킹 트랙은 Phase 5 이후.

기획 문서: [`docs/planning.md`](./docs/planning.md)
에이전트 팀: [`.claude/agents/README.md`](./.claude/agents/README.md)

## 로컬 실행

```bash
pnpm install
pnpm dev
# http://localhost:3000
```

## Docker

```bash
docker compose up       # 개발 모드 (핫 리로드)
docker compose -f docker-compose.test.yml up --exit-code-from playwright  # E2E
```

## 테스트

```bash
pnpm test           # Vitest (단위 + 컴포넌트)
pnpm test:coverage
pnpm test:e2e       # Playwright
pnpm typecheck
pnpm lint
```

## Phase 상태

- [x] Phase 0: 셋업
- [ ] Phase 1: 메트로놈 MVP
- [ ] Phase 2: 지판 스케일 가이드
- [ ] Phase 3: 스케일 확장
- [ ] Phase 4: 통합 뷰 & 폴리시
- [ ] Phase 5+: 배킹 트랙 (백엔드 도입)
