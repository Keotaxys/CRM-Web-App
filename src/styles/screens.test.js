import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const screensCss = readFileSync(resolve('src/styles/screens.css'), 'utf8');

describe('global screen surface styles', () => {
  it('keeps legacy panel consumers on the approved opaque card surface', () => {
    expect(screensCss).toMatch(/\.panel\s*\{[^}]*border:\s*1px solid var\(--gray-200\)[^}]*border-radius:\s*(?:24px|var\(--radius-xl\))[^}]*background:\s*var\(--color-white\)[^}]*box-shadow:\s*var\(--shadow-card\)/s);
  });
});
