/**
 * 배킹 트랙 InstrumentPreset 타입 정의.
 *
 * Task 4: 타입 stub만 정의. 실제 프리셋 매핑(backbeat, jazz 등)은 Task 5에서 구현.
 *
 * drumsKit — GM 드럼 킷 번호 (0=Standard, 8=Room, 16=Power, 32=Jazz, 40=Brush...)
 * bass     — GM 베이스 악기 번호 (32=Acoustic Bass, 33=Electric Bass finger...)
 * guitar   — GM 기타 악기 번호 (24=Nylon, 25=Steel, 26=Jazz, 27=Clean...)
 * label    — UI 표시용 레이블
 */
export type InstrumentPreset = {
  drumsKit: number;
  bass: number;
  guitar: number;
  label: string;
};
