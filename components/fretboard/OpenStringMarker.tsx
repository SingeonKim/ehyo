/*
 * 오픈 스트링 고정 레이블.
 *
 * 규약:
 *   - 스케일·중요도 토글과 무관하게 **항상 표시**
 *   - label mode와 무관하게 **항상 노트 이름**을 보여준다 (도수·숨김 모드에서도)
 *   - Root/Important/Regular tier 스타일 없음 — 모두 동일한 muted 색상
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
  // 크기는 regular tier와 같게(fretWidth * 0.19). 단 fill 없이 outline만이라
  // 스케일 노트와 쉽게 구분된다.
  const r = fretWidth * 0.19;
  const fontSize = r * 0.95;

  return (
    <g aria-label={`Open string ${stringNumber}: ${noteName}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--color-bg-base)"
        stroke="var(--color-ink-secondary)"
        strokeWidth={1.2}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontFamily="var(--font-mono)"
        fill="var(--color-ink-secondary)"
        className="select-none pointer-events-none"
      >
        {noteName}
      </text>
    </g>
  );
}
