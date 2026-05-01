'use client';

// 랜딩 페이지 서브 타이틀 — 자극 멘트가 9초 간격으로 페이드 인/아웃하며 랜덤 교체.
// 'use client'인 이유:
//   1) Math.random()이 SSR/CSR에서 다르면 hydration mismatch 발생.
//   2) setTimeout 기반 사이클은 브라우저 전용.
// 첫 렌더는 인덱스 0 + 비가시(opacity-0)로 SSR/CSR 일치, mount 후 랜덤 픽 + 페이드 인을
// "동시에" 트리거해 첫 등장 자체를 페이드 사이클의 일부로 만든다. 이렇게 안 하면
// "하이드레이션 시 인덱스 0 → 랜덤으로 instant swap (1번)" + "9초 후 페이드 swap (2번)"이
// 보여서 사용자에게 "새로고침마다 2번 바뀐다"로 인지된다.
import { useEffect, useRef, useState } from 'react';

type Taunt = { readonly ko: string; readonly en: string };

const TAUNTS: readonly Taunt[] = [
  { ko: '그 실력에 잠이 오나..?', en: 'You really sleeping with that skill level..?' },
  { ko: '기타에 쌓인 먼지 좀 봐..', en: 'Your guitar’s all dust, no notes.' },
  {
    ko: '손은 기억 못 하는데 핑계는 잘 기억하네',
    en: 'Fingers forget. Excuses don’t.',
  },
  { ko: '오늘 안 치면 내일도 안치겠지', en: 'Skip today, suck tomorrow. Simple math.' },
  {
    ko: '기타는 살 수 있어도, 실력은 못 사긴 하지...',
    en: 'You bought the guitar… where’s the skill DLC?',
  },
  { ko: '지금 멈추면 거기까지가 한계다', en: 'Stop now, and that’s your peak. Congrats.' },
  {
    ko: '연습 안 한 티 생각보다 잘 나더라...',
    en: 'You know it shows when you don’t practice, right?',
  },
  { ko: '니 펜더는 대체 무슨 죄냐...?', en: 'What did your Fender do to deserve you..?' },
  {
    ko: '시간 없다는 말, 다 핑계인 거 알지..?',
    en: '“No time” is just your favorite excuse, huh..?',
  },
  {
    ko: '평생 펜타토닉 A폼! 좋은 일관성이야!',
    en: 'A minor pentatonic. Forever! Nice consistency.',
  },
  {
    ko: '10년 동안 릭 3개로 돌려막기! 효율성이 좋은 친구구나',
    en: 'So you’re an efficiency master—10 years, 3 licks.',
  },
  { ko: '제발 절대로 녹음해서 들어보지 마!', en: 'Don’t record it. Trust me.' },
  { ko: '오늘도 장비 탓? ㅎ', en: 'Blaming the gear again today?' },
  { ko: '오늘도 박자랑 야차룰 중...?', en: 'You got beef with the rhythm or what?' },
  {
    ko: '뮬 매물 알림 뜰 때는 빛보다 빠르던데...',
    en: 'You’re faster than light when a gear alert pops up...',
  },
  { ko: '크로메틱은 조상님이 쳐주나?', en: 'Ancestors doing your chromatics?' },
  { ko: '마지막으로 피크 쥔 건 언젠지 기억나?', en: 'You still remember how to hold a pick?' },
  {
    ko: '그 상태로 공연하면 박수 말고 한숨 나올 듯',
    en: 'At that level, you’re getting sighs, not applause.',
  },
  {
    ko: '공연 준비 중이라고..? 관객 생각은 했지..?',
    en: 'A gig…? You sure the audience deserves that?',
  },
  {
    ko: '내가 네 깁슨이라면 Self 넥뿌 할 듯',
    en: 'If I were a Gibson, my neck would’ve snapped already.',
  },
  {
    ko: '밴드 생태계를 위해서, 그냥 방에 있자',
    en: 'For the band scene—stay home.',
  },
  { ko: '뮬 장터 활성화가 다 너 덕이었구나', en: 'Just gear market MVP.' },
  {
    ko: '블루스 한다더니 연주가 그냥 우울하기만 하네.',
    en: 'Said you’re playing Blues, but Now I’m feeling blue.',
  },
  {
    ko: '굳은살이 손가락이 아니라 손가락 관절에 박힌 건가?',
    en: 'Knuckles, not fingertips?',
  },
  {
    ko: '밴드 애들이 너 빼고 단톡방 새로 팠다더라...',
    en: 'I heard the band made a new group chat...',
  },
  {
    ko: '박자가 자유분방해서 재즈 거장인 줄 알았어',
    en: 'Such "creative" timing. You a Jazz master or what?',
  },
  { ko: '그 실력에 부티크 페달? 그냥 당근해라.', en: 'Boutique pedals with that skill? Just sell them on the used market.' },
  {
    ko: '텐션음인 건가 그냥 튜닝이 나간 건가',
    en: 'Tension note… or just out of tune?',
  },
  {
    ko: '어차피 연습 안 할 거잖아. 앱 그냥 꺼...',
    en: 'You’re not gonna play anyway. Just close the app...',
  },
  {
    ko: '하이 게인에도 들리는 부정확한 소리',
    en: 'Hiding behind gain… still sounds muddy.',
  },
  {
    ko: '너 T발 씨야? 내 한숨에 공감 좀 해줘. 연습 좀 해...',
    en: 'Can you hear me sighing? Now go practice.',
  },
  {
    ko: '클랩튼도 울고 갈 ‘찐’ 슬로우 핸드 등장...',
    en: 'A “real” Slowhand has arrived. Even Clapton would be speechless.',
  },
  {
    ko: 'Sweet Child인 줄 알았는데 그냥 애기네',
    en: 'Thought it was Sweet Child… turns out just child-level.',
  },
  {
    ko: '비틀즈도 너처럼 연주했으면 영국 못 벗어났어',
    en: 'If The Beatles played like you, they never would’ve left Liverpool.',
  },
  {
    ko: '존 메이어 톤 잡기는 10시간, 연습은 10분',
    en: '10 hours chasing John Mayer’s tone, 10 minutes practicing.',
  },
  {
    ko: 'Wonderwall만 500번째... 노엘 갤러거가 너 고소한대',
    en: '500th time playing Wonderwall... Noel is filing a lawsuit.',
  },
  {
    ko: '빈티지한 실력이네? 너무 녹슬고 낡은...',
    en: 'Vintage skills, huh? Too bad they’re just rusty and old.',
  },
  {ko: '와... 진 짜 기 타 너 무 잘 치 세 요...', en:'Wow... You... play... so... well...',
  }
];

// 한 카드가 화면에 머무는 사이클(노출 + 페이드). 사용자 요구 = 9초 간격 교체.
const HOLD_MS = 9_000;
// 페이드 한 단계(out, in) 길이. transition-opacity duration-1000과 일치해야 한다.
const FADE_MS = 1_000;
// 직전 N개는 다시 안 뽑는다. 사용자 체감상 "방금 본 거 또 나오네"를 막는 정도면 충분하고,
// N이 (TAUNTS.length - 1) 이상이면 풀이 비어 폴백을 타게 된다.
const RECENT_LIMIT = Math.min(10, Math.max(1, TAUNTS.length - 1));

export function RandomTaunt() {
  // 서버 렌더 = 0, mount 후에만 랜덤. hydration 안전.
  const [index, setIndex] = useState(0);
  // 첫 페인트는 invisible(opacity-0). 이래야 mount 시 인덱스 swap이 사용자에게 안 보이고,
  // 페이드 인 한 번만 인지된다 — "새로고침 시 2번 바뀜" 현상의 핵심 차단.
  const [visible, setVisible] = useState(false);
  // 최근 노출 인덱스 히스토리. ref로 두는 이유: 변경돼도 리렌더 트리거 불필요.
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    // 매 사이클마다 호출. 최근 RECENT_LIMIT개에 들어있지 않은 인덱스 중 균등 랜덤 픽.
    // 이전 구현(직전 1개만 회피, 충돌 시 +1 폴백)은 운 나쁘게 충돌이 겹치면
    // 사용자 눈엔 "리스트 순서대로" 진행되는 것처럼 보였다 — 그 케이스를 차단.
    const pickNext = (): number => {
      const length = TAUNTS.length;
      if (length <= 1) return 0;
      const blocked = new Set(historyRef.current);
      const pool: number[] = [];
      for (let i = 0; i < length; i += 1) {
        if (!blocked.has(i)) pool.push(i);
      }
      // 방어: RECENT_LIMIT 계산이 어긋나 풀이 비는 일은 없어야 하지만,
      // 만약 비면 전체 인덱스에서 픽(과거 보호 무시).
      const candidates = pool.length > 0 ? pool : Array.from({ length }, (_, i) => i);
      const next = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
      historyRef.current = [...historyRef.current, next].slice(-RECENT_LIMIT);
      return next;
    };

    // 첫 등장 = 랜덤 픽 + 페이드 인 (둘이 같은 렌더에서 묶임).
    setIndex(pickNext());
    setVisible(true);

    // 재귀 setTimeout 체인:
    //   대기(HOLD_MS - FADE_MS) → fade-out(FADE_MS) → 인덱스 swap + fade-in → 다시 대기
    // setInterval 대신 chain을 쓰는 이유: 페이드 단계가 명확히 직렬이고, cleanup 시
    // 어느 단계의 timer가 살아있어도 동일한 ref 하나만 클리어하면 끝.
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      timer = setTimeout(() => {
        setVisible(false); // 1단계: fade-out 시작
        timer = setTimeout(() => {
          setIndex(pickNext());
          setVisible(true); // 2단계: 새 멘트로 swap + fade-in
          scheduleNext();
        }, FADE_MS);
      }, HOLD_MS - FADE_MS);
    };

    scheduleNext();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const taunt = TAUNTS[index] ?? TAUNTS[0];
  if (!taunt) return null;

  return (
    <div
      // aria-live=polite: 스크린 리더가 자동 교체되는 텍스트 변화를 흐름 방해 없이 읽어주게 한다.
      aria-live="polite"
      className={`mt-8 max-w-3xl transition-opacity duration-1000 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 한글 라인 — 강조. text-ink-primary로 본문 톤보다 한 단계 위 */}
      <p className="text-xl font-semibold leading-snug text-ink-primary md:text-2xl">
        {taunt.ko}
      </p>
      {/* 영어 라인 — 보조. 한 단계 아래 톤으로 위계 유지 */}
      <p className="mt-2 font-mono text-sm leading-relaxed text-ink-muted md:text-base">
        {taunt.en}
      </p>
    </div>
  );
}
