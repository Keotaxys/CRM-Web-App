import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const screensCss = readFileSync(
  resolve('src/styles/screens.css'),
  'utf8',
);
const giftPageSource = readFileSync(resolve('src/gifts/GiftsPage.jsx'), 'utf8');
const giftDistributionSource = readFileSync(resolve('src/gifts/GiftDistributionForm.jsx'), 'utf8');
const giftItemRowsSource = readFileSync(resolve('src/gifts/GiftItemRows.jsx'), 'utf8');
const giftInboundSource = readFileSync(resolve('src/gifts/GiftInboundPanel.jsx'), 'utf8');
const giftReportSource = readFileSync(resolve('src/gifts/GiftReportPanel.jsx'), 'utf8');
const giftStockSource = readFileSync(resolve('src/gifts/GiftStockPanel.jsx'), 'utf8');

it('constrains sales tables locally and overrides shared grids at 360px', () => {
  expect(screensCss).toMatch(/\.sales-report-table-wrap\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%[^}]*overflow[^}]*auto/s);
  expect(screensCss).toMatch(/\.sales-report-table-wrap th\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s);
  expect(screensCss).toMatch(/@media\s*\(max-width:\s*430px\)\s*\{[^}]*\.summary-grid\.sales-summary-grid[^}]*\.form-grid\.sales-filter-grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

describe('gift responsive and accessibility guards', () => {
  it('uses compact gift rows on larger screens and a safe single column on small screens', () => {
    expect(giftDistributionSource).toContain('gift-distribution-form');
    expect(giftItemRowsSource).toContain('gift-distribution-row');
    expect(screensCss).toMatch(/\.gift-distribution-row\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(10rem,\s*\.55fr\)\s+auto/s);
    expect(screensCss).toMatch(/@media\s*\(max-width:\s*700px\)[\s\S]*\.gift-distribution-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  });

  it('wraps gift action groups instead of allowing overflow', () => {
    expect(giftInboundSource).toContain('gift-actions');
    expect(screensCss).toMatch(/\.gift-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
  });

  it('contains gift table scrolling inside report cards', () => {
    expect(giftReportSource).toContain('gift-report-table-wrap');
    expect(screensCss).toMatch(/\.gift-[\w-]*table-wrap\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/s);
  });

  it('keeps final gift actions clear of the bottom navigation', () => {
    expect(giftDistributionSource).toContain('gift-form');
    expect(screensCss).toMatch(/\.gift-[\w-]*(?:form|report|actions)[\w-]*\s*\{[^}]*padding-bottom:\s*calc\([^}]*env\(safe-area-inset-bottom\)/s);
  });

  it('uses a text or icon indicator for low stock in addition to color', () => {
    expect(giftStockSource).toContain('gift-stock--low');
    expect(screensCss).toMatch(/\.gift-stock--low\s+small\s*\{[^}]*display:\s*inline-flex/s);
    expect(screensCss).toMatch(/\.gift-stock--low\s+small::before\s*\{[^}]*content:/s);
  });

  it('provides visible focus states for gift tabs and actions', () => {
    expect(giftPageSource).toContain('gift-tabs');
    expect(screensCss).toMatch(/\.gift-[\w-]*(?:tabs|actions)[^}]*:focus-visible\s*\{[^}]*outline:\s*var\(--focus-outline\)/s);
  });
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
