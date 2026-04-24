/**
 * API 클라이언트 — FastAPI 백엔드 fetch 래퍼.
 *
 * 규율:
 *   - 모든 경로는 NEXT_PUBLIC_API_BASE_URL 기준. SSR과 Client 양쪽에서 동작.
 *   - 응답 타입은 openapi-typescript가 생성한 `lib/api/generated.ts` 사용.
 *   - 에러 핸들링: HTTP 에러는 throw (react-query / error boundary가 잡음).
 *   - 개별 엔드포인트 함수는 이 client를 import해 만든다 (예: progression-templates.ts).
 */

import type { paths } from './generated';

/**
 * API 베이스 URL — 서버/클라이언트 환경에 따라 다름.
 *
 * Docker compose 네트워크에서 web 컨테이너 내부의 `localhost`는 web 자신을
 * 가리키므로 api를 못 찾는다. 서버 컴포넌트(SSR)가 내부에서 api를 호출할
 * 땐 `http://api:8000` (compose 서비스 이름), 브라우저에서는 호스트 경유로
 * `http://localhost:8000`.
 *
 * API_INTERNAL_BASE_URL: 서버 사이드 전용 (브라우저 노출 X)
 * NEXT_PUBLIC_API_BASE_URL: 클라이언트 사이드 전용
 */
const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.API_INTERNAL_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      'http://localhost:8000'
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly path: string,
    message?: string,
  ) {
    super(message ?? `API ${status} ${statusText} at ${path}`);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch — path는 `/api/v1/...` 형식, params는 query string 자동 인코딩.
 * 제네릭으로 타입 세이프 응답. 4xx/5xx는 ApiError throw.
 */
export async function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    params?: Record<string, string | number | undefined>;
    body?: unknown;
    /** Next.js App Router 캐시 전략. 기본 'no-store' — 실시간 데이터. */
    cache?: RequestCache;
    next?: { revalidate?: number | false; tags?: string[] };
  } = {},
): Promise<T> {
  const { method = 'GET', params, body, cache = 'no-store', next } = options;

  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache,
    ...(next && { next }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, path);
  }

  return response.json() as Promise<T>;
}

/** openapi-typescript 생성 타입에서 GET 응답 꺼내는 헬퍼. */
export type GetResponse<
  Path extends keyof paths,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Method extends keyof paths[Path] = 'get' extends keyof paths[Path] ? 'get' : any,
> = paths[Path][Method] extends {
  responses: { 200: { content: { 'application/json': infer R } } };
}
  ? R
  : never;
