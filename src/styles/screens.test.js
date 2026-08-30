import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const screensCss = readFileSync(
  resolve('src/styles/screens.css'),
  'utf8',
);

describe('global screen surface styles', () => {
  it('keeps legacy panel consumers on the approved opaque card surface', () => {
    expect(screensCss).toMatch(
      /\.panel\s*\{[^}]*border:\s*1px solid var\(--gray-200\)[^}]*border-radius:\s*(?:24px|var\(--radius-xl\))[^}]*background:\s*var\(--color-white\)[^}]*box-shadow:\s*var\(--shadow-card\)/s,
    );
  });

  it('uses a visibly dark teal glass surface for the sticky app header', () => {
    expect(screensCss).toMatch(
      /\.app-header\s*\{[^}]*background:\s*linear-gradient\([^}]*var\(--teal-800\)[^}]*var\(--teal-700\)[^}]*\)/s,
    );

    expect(screensCss).toMatch(
      /\.app-header\s*\{[^}]*border-bottom:\s*1px solid var\(--teal-500\)/s,
    );
  });

  it('uses a visibly dark teal glass surface for the bottom navigation', () => {
    expect(screensCss).toMatch(
      /\.bottom-nav\s*\{[^}]*background:\s*linear-gradient\([^}]*var\(--teal-800\)[^}]*var\(--teal-700\)[^}]*\)/s,
    );

    expect(screensCss).toMatch(
      /\.bottom-nav\s*\{[^}]*border:\s*1px solid var\(--teal-500\)/s,
    );
  });

  it('keeps the dark navigation glass blurred and saturated', () => {
    expect(screensCss).toMatch(
      /@supports[\s\S]*\.app-header,\s*\.bottom-nav\s*\{[^}]*-webkit-backdrop-filter:\s*blur\(var\(--blur-navigation\)\)\s*saturate\(160%\)[^}]*backdrop-filter:\s*blur\(var\(--blur-navigation\)\)\s*saturate\(160%\)/s,
    );
  });

  it('keeps bottom navigation labels readable on the dark teal surface', () => {
    expect(screensCss).toMatch(
      /\.bottom-nav-item\s*\{[^}]*color:\s*var\(--teal-50\)/s,
    );

    expect(screensCss).toMatch(
      /\.bottom-nav-item\.active\s*\{[^}]*color:\s*var\(--color-white\)/s,
    );

    expect(screensCss).toMatch(
      /\.bottom-nav-item\.active\s+\.material-symbols-outlined\s*\{[^}]*background:\s*rgb\(255 255 255 \/ \.18\)/s,
    );
  });
});