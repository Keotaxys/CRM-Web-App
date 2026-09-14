import { describe, expect, it } from 'vitest';
import { sanitizeSpreadsheetText } from './spreadsheet';

describe('sanitizeSpreadsheetText', () => {
  it.each(['=SUM(A1)', '+123', '-1', '@value', '  =formula'])(
    'escapes formula-like text %s without changing its visible spacing', (value) => {
      expect(sanitizeSpreadsheetText(value)).toBe(`'${value}`);
    },
  );

  it.each([
    ['ordinary text', 'ordinary text'],
    ['', ''],
    [null, ''],
    [12, '12'],
  ])('normalizes safe spreadsheet text %s', (value, expected) => {
    expect(sanitizeSpreadsheetText(value)).toBe(expected);
  });
});
