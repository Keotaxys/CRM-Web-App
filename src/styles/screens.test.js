import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const screensCss = readFileSync(
  resolve('src/styles/screens.css'),
  'utf8',
);

describe(
  'global screen surface styles',
  () => {
    it(
      'keeps legacy panel consumers on the approved opaque card surface',
      () => {
        expect(screensCss).toMatch(
          /\.panel\s*\{[^}]*border:\s*1px solid var\(--gray-200\)[^}]*border-radius:\s*(?:24px|var\(--radius-xl\))[^}]*background:\s*var\(--color-white\)[^}]*box-shadow:\s*var\(--shadow-card\)/s,
        );
      },
    );

    it(
      'uses a frosted neutral gray surface for the sticky app header',
      () => {
        expect(screensCss).toMatch(
          /\.app-header\s*\{[^}]*border-bottom:\s*1px solid rgb\(255 255 255 \/ \.16\)[^}]*background:\s*rgb\(53 58 64 \/ \.76\)/s,
        );

        expect(screensCss).toMatch(
          /\.app-header h1\s*\{[^}]*color:\s*var\(--color-white\)/s,
        );

        expect(screensCss).toMatch(
          /\.app-header p\s*\{[^}]*color:\s*var\(--gray-100\)/s,
        );
      },
    );

    it(
      'uses a frosted neutral gray surface for the bottom navigation',
      () => {
        expect(screensCss).toMatch(
          /\.bottom-nav\s*\{[^}]*border:\s*1px solid rgb\(255 255 255 \/ \.14\)[^}]*background:\s*rgb\(53 58 64 \/ \.78\)/s,
        );

        expect(screensCss).toMatch(
          /\.bottom-nav-item\s*\{[^}]*color:\s*var\(--gray-100\)/s,
        );
      },
    );

    it(
      'keeps the navigation surfaces translucent and blurred when supported',
      () => {
        expect(screensCss).toMatch(
          /@supports[\s\S]*\.app-header,\s*\.bottom-nav\s*\{[^}]*background:\s*rgb\(53 58 64 \/ \.58\)[^}]*-webkit-backdrop-filter:\s*blur\(18px\)\s*saturate\(125%\)[^}]*backdrop-filter:\s*blur\(18px\)\s*saturate\(125%\)/s,
        );
      },
    );

    it(
      'uses one active glass pill around both the bottom-nav icon and label',
      () => {
        expect(screensCss).toMatch(
          /\.bottom-nav-item\.active\s+\.bottom-nav-item__inner\s*\{[^}]*background:\s*rgb\(255 255 255 \/ \.14\)/s,
        );

        expect(screensCss).toMatch(
          /\.bottom-nav-item\.active\s+\.material-symbols-outlined\s*\{[^}]*background:\s*none/s,
        );

        expect(screensCss).not.toMatch(
          /\.bottom-nav-item\.active\s+\.material-symbols-outlined\s*\{[^}]*background:\s*rgb\(255 255 255 \/ \.18\)/s,
        );
      },
    );

    it(
      'keeps inactive filters neutral gray and selected filters on the CRM teal gradient',
      () => {
        expect(screensCss).toMatch(
          /\.chip\s*\{[^}]*color:\s*var\(--gray-600\)[^}]*background:\s*linear-gradient\([^}]*rgb\(255 255 255 \/ \.96\)[^}]*rgb\(241 245 244 \/ \.92\)[^}]*\)/s,
        );

        expect(screensCss).toMatch(
          /\.chip\.active\s*\{[^}]*color:\s*var\(--color-white\)[^}]*background:\s*linear-gradient\([^}]*var\(--teal-700\)[^}]*var\(--teal-600\)[^}]*var\(--teal-500\)[^}]*\)/s,
        );
      },
    );
  },
);