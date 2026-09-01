import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

const rules = readFileSync(
  resolve(cwd(), 'storage.rules'),
  'utf8',
);

describe('Storage image contract', () => {
  it('allows managed images up to the same 5 MB limit as the client', () => {
    expect(rules).toMatch(
      /request\.resource\.size\s*<=\s*5000000/,
    );
  });

  it('continues restricting managed uploads to supported image MIME types', () => {
    expect(rules).toMatch(
      /request\.resource\.contentType\.matches\('image\/\(jpeg\|png\|webp\)'\)/,
    );
  });
});
