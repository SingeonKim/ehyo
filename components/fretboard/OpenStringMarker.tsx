/*
 * 오픈 스트링 고정 레이블.
 *
 * 규약:
 *   - 스케일·중요도 토글과 무관하게 **항상 표시**
 *   - label mode와 무관하게 **항상 노트 이름**을 보여준다 (도수·숨김 모드에서도)
 *   - Root/Important/Regular tier 스타일 없음
 *   - **원(circle) 없이 텍스트만** — 지판의 동그라미 마커 언어는 "스케일 노트"에
 *     한정되고, 오픈은 완전히 별개의 레이블 성격이라는 시각 언어를 강화.
 *
 * 이유: 오픈 스트링은 줄의 기본 음이라 스케일 선택과 무관하게 지판의
 * 기준점을 제공해야 한다. 빈 스케일(whole_tone 등)에서도 6개가 보여야
 * 지판이 어떤 줄을 뜻하는지 사용자가 판단할 수 있다.
 */

interface OpenStringMarkerProps {
  cx: number;
  cy: number;
  fretWidth: number;
  noteName: string;
  stringNumber: number;
}

export function OpenStringMarker({
  cx,
  cy,
  fretWidth,
  noteName,
  stringNumber,
}: OpenStringMarkerProps) {
  // 글자 크기는 regular 노트의 시각적 무게감과 맞추되 텍스트 단독 렌더라
  // 조금 더 크게 잡아 읽힘 확보. fretWidth * 0.19는 regular 반지름이었고,
  // 그 지름 * 0.95 = 약 0.36 * fretWidth 텍스트 높이.
  const fontSize = fretWidth * 0.32;

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={fontSize}
      fontFamily="var(--font-mono)"
      fill="var(--color-ink-secondary)"
      className="select-none pointer-events-none"
      aria-label={`Open string ${stringNumber}: ${noteName}`}
    >
      {noteName}
    </text>
  );
}
