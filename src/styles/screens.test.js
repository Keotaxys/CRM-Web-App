import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const screensCss = readFileSync(
  resolve('src/styles/screens.css'),
  'utf8',
);

it('constrains sales tables locally and overrides shared grids at 360px', () => {
  expect(screensCss).toMatch(/\.sales-report-table-wrap\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%[^}]*overflow[^}]*auto/s);
  expect(screensCss).toMatch(/\.sales-report-table-wrap th\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s);
  expect(screensCss).toMatch(/@media\s*\(max-width:\s*430px\)\s*\{[^}]*\.summary-grid\.sales-summary-grid[^}]*\.form-grid\.sales-filter-grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

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
      'uses a light translucent neutral glass surface for the sticky app header',
      () => {
        expect(screensCss).toMatch(
          /\.app-header\s*\{[^}]*border-bottom:\s*1px solid rgb\(95 107 105 \/ \.14\)[^}]*background:\s*rgb\(64 70 76 \/ \.32\)/s,
        );

        expect(screensCss).toMatch(
          /\.app-header h1\s*\{[^}]*color:\s*var\(--ink-950\)/s,
        );

        expect(screensCss).toMatch(
          /\.app-header p\s*\{[^}]*color:\s*var\(--teal-800\)/s,
        );
      },
    );

    it(
      'uses a light translucent neutral glass surface for the bottom navigation',
      () => {
        expect(screensCss).toMatch(
          /\.bottom-nav\s*\{[^}]*border:\s*1px solid rgb\(95 107 105 \/ \.14\)[^}]*background:\s*rgb\(64 70 76 \/ \.34\)/s,
        );

        expect(screensCss).toMatch(
          /\.bottom-nav-item\s*\{[^}]*color:\s*var\(--ink-800\)/s,
        );

        expect(screensCss).toMatch(
          /\.bottom-nav-item\.active\s*\{[^}]*color:\s*var\(--teal-800\)/s,
        );
      },
    );

    it(
      'increases transparency and blur on browsers with backdrop-filter support',
      () => {
        expect(screensCss).toMatch(
          /@supports[\s\S]*\.app-header,\s*\.bottom-nav\s*\{[^}]*background:\s*rgb\(64 70 76 \/ \.22\)[^}]*-webkit-backdrop-filter:\s*blur\(22px\)\s*saturate\(120%\)[^}]*backdrop-filter:\s*blur\(22px\)\s*saturate\(120%\)/s,
        );
      },
    );

    it(
      'uses one subtle active glass pill around both the bottom-nav icon and label',
      () => {
        expect(screensCss).toMatch(
          /\.bottom-nav-item\.active\s+\.bottom-nav-item__inner\s*\{[^}]*background:\s*rgb\(255 255 255 \/ \.28\)/s,
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

    it(
      'keeps birthday reminder actions inside the mobile card width',
      () => {
        expect(screensCss).toMatch(
          /@media \(max-width: 700px\)[\s\S]*\.birthday-reminder-card\s*\{[^}]*align-items:\s*stretch[^}]*flex-direction:\s*column/s,
        );

        expect(screensCss).toMatch(
          /\.birthday-reminder-card__actions\s*\{[^}]*flex-wrap:\s*wrap/s,
        );
      },
    );
  },
);
