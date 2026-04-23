import { useEffect, useState } from 'react';

/*
 * Zustand persist + Next.js App Router의 hydration 불일치 방지.
 *
 * 문제: 서버는 store의 초기 기본값으로 HTML을 렌더하지만 클라이언트 최초 마운트
 * 직후 localStorage에서 값이 rehydrate되어 DOM이 변한다. React는 mismatch 경고.
 *
 * 해결: 첫 렌더에는 "아직 hydrate 안 됨" 상태를 반환해 컴포넌트가 로딩 placeholder를
 * 보여주고, useEffect가 호출된 뒤(= 브라우저에서만 실행됨) true가 되어 실제 UI를 렌더.
 *
 * 대안으로 `useAppStore.persist.hasHydrated()`도 있지만 이 훅은 리액티브하지 않아
 * 수동 subscribe가 필요해 코드가 더 복잡해진다.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
