import { describe, expect, it } from 'vitest';

import { GENRE_RULES, type ProgressionCategory } from '@/lib/theory/genre-rules';

const ALL_CATEGORIES: ProgressionCategory[] = [
  'pop', 'rock', 'funk', 'jazz', 'blues', 'folk', 'bossa', 'minor', 'modal',
];

describe('GENRE_RULES', () => {
  it('9개 카테고리 모두 정의됨', () => {
    expect(Object.keys(GENRE_RULES).sort()).toEqual([...ALL_CATEGORIES].sort());
  });

  it('각 카테고리는 perChord와 universal을 가짐', () => {
    for (const cat of ALL_CATEGORIES) {
      expect(GENRE_RULES[cat]).toHaveProperty('perChord');
      expect(GENRE_RULES[cat]).toHaveProperty('universal');
    }
  });
});

describe('GENRE_RULES.jazz — dominant7 alt', () => {
  it('jazz는 dominant7에 b9·#9·#11·b13 추가', () => {
    expect(GENRE_RULES.jazz.perChord.dominant7).toEqual([1, 3, 6, 8]);
  });

  it('jazz는 universal 색채음 없음', () => {
    expect(GENRE_RULES.jazz.universal).toEqual([]);
  });
});

describe('GENRE_RULES.bossa — 절제된 alt', () => {
  it('bossa는 dominant7에 b9·#11만', () => {
    expect(GENRE_RULES.bossa.perChord.dominant7).toEqual([1, 6]);
  });
});

describe('GENRE_RULES.blues — 블루노트 universal', () => {
  it('blues universal은 b3·b5·b7 (키 root 기준 반음)', () => {
    expect(GENRE_RULES.blues.universal).toEqual([3, 6, 10]);
  });

  it('blues는 dominant7에 b3 추가 (블루스 cross)', () => {
    expect(GENRE_RULES.blues.perChord.dominant7).toEqual([3]);
  });

  it('blues는 major(7)에 b3·b7 추가', () => {
    expect(GENRE_RULES.blues.perChord.major).toEqual([3, 10]);
    expect(GENRE_RULES.blues.perChord.major7).toEqual([3, 10]);
  });
});

describe('GENRE_RULES.rock — pentatonic 색채음', () => {
  it('rock universal은 b3·b7', () => {
    expect(GENRE_RULES.rock.universal).toEqual([3, 10]);
  });
});

describe('GENRE_RULES.funk — b3 cross', () => {
  it('funk universal은 b3', () => {
    expect(GENRE_RULES.funk.universal).toEqual([3]);
  });
});

describe('GENRE_RULES.folk — 코드톤 only', () => {
  it('folk는 perChord 비어있음', () => {
    expect(Object.keys(GENRE_RULES.folk.perChord)).toHaveLength(0);
  });

  it('folk universal은 빔', () => {
    expect(GENRE_RULES.folk.universal).toEqual([]);
  });
});

describe('GENRE_RULES.modal — 모드 정체성 보존', () => {
  it('modal은 perChord 비어있음', () => {
    expect(Object.keys(GENRE_RULES.modal.perChord)).toHaveLength(0);
  });

  it('modal universal은 빔', () => {
    expect(GENRE_RULES.modal.universal).toEqual([]);
  });
});

describe('GENRE_RULES.minor — V7 alt', () => {
  it('minor는 dominant7에 b9 추가 (harmonic minor 함의)', () => {
    expect(GENRE_RULES.minor.perChord.dominant7).toEqual([1]);
  });
});

describe('GENRE_RULES.pop — 다이아토닉 위주', () => {
  it('pop은 perChord 비어있음 (Part A로 충분)', () => {
    expect(Object.keys(GENRE_RULES.pop.perChord)).toHaveLength(0);
  });

  it('pop universal은 빔', () => {
    expect(GENRE_RULES.pop.universal).toEqual([]);
  });
});
