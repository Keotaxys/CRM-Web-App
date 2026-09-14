import { describe, expect, it } from 'vitest';
import { giftCallableMessage } from './giftErrors';

describe('giftCallableMessage', () => {
  it('maps insufficient stock without hiding permission failures', () => {
    expect(giftCallableMessage({
      code: 'functions/failed-precondition',
      message: 'Insufficient gift stock',
    })).toMatch(/Stock/);
    expect(giftCallableMessage({ code: 'functions/permission-denied' })).toMatch(/ສິດ/);
  });

  it.each([
    ['functions/unauthenticated', /ເຂົ້າລະບົບ/],
    ['functions/invalid-argument', /ຂໍ້ມູນ/],
    ['functions/already-exists', /ຖືກນໍາໃຊ້/],
    ['functions/not-found', /ບໍ່ພົບ/],
  ])('returns a Lao message for %s', (code, expected) => {
    expect(giftCallableMessage({ code })).toMatch(expected);
  });

  it('retains a safe backend message for an unmapped precondition', () => {
    expect(giftCallableMessage({
      code: 'functions/failed-precondition',
      message: 'Laos date changed; refresh before saving',
    })).toMatch(/ວັນທີ/);
  });
});
