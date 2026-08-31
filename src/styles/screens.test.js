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

  it('uses neutral transparent glass for the sticky app header', () => {
    expect(screensCss).toMatch(
      /\.app-header\s*\{[^}]*border-bottom:\s*1px solid rgb\(15 118 110 \/ \.12\)[^}]*background:\s*rgb\(255 255 255 \/ \.86\)/s,
    );

    expect(screensCss).toMatch(
      /\.app-header h1\s*\{[^}]*color:\s*var\(--ink-950\)/s,
    );

    expect(screensCss).toMatch(
      /\.app-header p\s*\{[^}]*color:\s*var\(--teal-700\)/s,
    );
  });

  it('uses neutral transparent glass for the bottom navigation', () => {
    expect(screensCss).toMatch(
      /\.bottom-nav\s*\{[^}]*border:\s*1px solid rgb\(15 118 110 \/ \.12\)[^}]*background:\s*rgb\(255 255 255 \/ \.86\)/s,
    );

    expect(screensCss).toMatch(
      /\.bottom-nav-item\s*\{[^}]*color:\s*var\(--teal-800\)/s,
    );
  });

  it('uses one active glass pill around the bottom-nav icon and label', () => {
    expect(screensCss).toMatch(
      /\.bottom-nav-item\.active\s+\.bottom-nav-item__inner\s*\{[^}]*background:\s*rgb\(15 118 110 \/ \.10\)/s,
    );

    expect(screensCss).toMatch(
      /\.bottom-nav-item\.active\s+\.material-symbols-outlined\s*\{[^}]*background:\s*none/s,
    );

    expect(screensCss).not.toMatch(
      /\.bottom-nav-item\.active\s+\.material-symbols-outlined\s*\{[^}]*background:\s*rgb\(255 255 255 \/ \.18\)/s,
    );
  });

  it('uses teal gradient glass for customer filter chips', () => {
    expect(screensCss).toMatch(
      /\.chip\s*\{[^}]*color:\s*var\(--teal-800\)[^}]*background:\s*linear-gradient\([^}]*var\(--teal-50\)[^}]*var\(--teal-100\)[^}]*\)/s,
    );

    expect(screensCss).toMatch(
      /\.chip\.active\s*\{[^}]*color:\s*var\(--color-white\)[^}]*background:\s*linear-gradient\([^}]*var\(--teal-800\)[^}]*var\(--teal-700\)[^}]*\)/s,
    );
  });

  it('uses stronger blur only as a neutral frosted-glass enhancement', () => {
    expect(screensCss).toMatch(
      /@supports[\s\S]*\.app-header,\s*\.bottom-nav\s*\{[^}]*background:\s*rgb\(255 255 255 \/ \.58\)[^}]*-webkit-backdrop-filter:\s*blur\(18px\)\s*saturate\(150%\)[^}]*backdrop-filter:\s*blur\(18px\)\s*saturate\(150%\)/s,
    );

    expect(screensCss).not.toMatch(
      /@supports[\s\S]*\.app-header,\s*\.bottom-nav\s*\{[^}]*background:\s*linear-gradient\([^}]*rgb\(17 94 89/s,
    );
  });
});