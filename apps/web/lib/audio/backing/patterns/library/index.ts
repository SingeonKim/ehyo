/**
 * index.ts — CATEGORY_RHYTHMS 모음.
 *
 * 카테고리 이름(문자열)을 CategoryRhythm으로 매핑.
 * 엔진(Task C14)에서 이 맵을 통해 selectSlot 디스패치.
 */

import type { CategoryRhythm } from '../types';
import { POP_RHYTHM } from './pop';
import { ROCK_RHYTHM } from './rock';
import { FUNK_RHYTHM } from './funk';
import { JAZZ_RHYTHM } from './jazz';
import { BLUES_RHYTHM } from './blues';
import { FOLK_RHYTHM } from './folk';
import { BOSSA_RHYTHM } from './bossa';
import { MINOR_RHYTHM } from './minor';
import { MODAL_RHYTHM } from './modal';

export const CATEGORY_RHYTHMS: Readonly<Record<string, CategoryRhythm>> = {
  pop: POP_RHYTHM,
  rock: ROCK_RHYTHM,
  funk: FUNK_RHYTHM,
  jazz: JAZZ_RHYTHM,
  blues: BLUES_RHYTHM,
  folk: FOLK_RHYTHM,
  bossa: BOSSA_RHYTHM,
  minor: MINOR_RHYTHM,
  modal: MODAL_RHYTHM,
};
