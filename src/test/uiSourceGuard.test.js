import {
  readFileSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

function productionSourceFiles(directory) {
  return readdirSync(
    directory,
    {
      withFileTypes: true,
    },
  ).flatMap((entry) => {
    const path = join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      return productionSourceFiles(path);
    }

    const productionModule =
      /\.(js|jsx)$/.test(entry.name)
      && !/\.test\.(js|jsx)$/.test(
        entry.name,
      );

    return productionModule
      ? [path]
      : [];
  });
}

const legacyPhrases = [
  [
    'ການຢ້ຽມຢາມ',
    'ລູກຄ້າ',
  ].join(''),
  [
    'ການຢ້ຽມ',
    'ລູກຄ້າ',
  ].join(''),
  [
    'ຢ້ຽມ',
    'ລູກຄ້າ',
  ].join(''),
];

it(
  'contains no visible native select markup in production JSX',
  () => {
    const offenders =
      productionSourceFiles('src')
        .filter(
          (path) =>
            path.endsWith('.jsx'),
        )
        .filter((path) =>
          /<select\b/.test(
            readFileSync(
              path,
              'utf8',
            ),
          ),
        );

    expect(offenders).toEqual([]);
  },
);

it(
  'uses the custom date picker without native browser picker dependencies',
  () => {
    const dateField =
      readFileSync(
        'src/components/ui/DateField.jsx',
        'utf8',
      );

    const components =
      readFileSync(
        'src/styles/components.css',
        'utf8',
      );

    /*
     * DateField may still use the words "date"
     * and "datetime-local" as component-level
     * mode values. What must not exist is an
     * actual native HTML date/datetime input.
     */
    const nativeDateInput =
      /<input\b[^>]*\btype\s*=\s*["'](?:date|datetime-local)["'][^>]*>/;

    expect(
      dateField,
    ).toContain(
      'type="text"',
    );

    expect(
      dateField,
    ).not.toMatch(
      /\bshowPicker\s*\(/,
    );

    expect(
      dateField,
    ).not.toMatch(
      nativeDateInput,
    );

    expect(
      components,
    ).toContain(
      '.ui-date-picker__backdrop',
    );

    expect(
      components,
    ).toContain(
      '.ui-date-picker__calendar',
    );

    expect(
      components,
    ).toContain(
      '.ui-date-picker__time-controls',
    );

    expect(
      components,
    ).not.toContain(
      '::-webkit-calendar-picker-indicator',
    );
  },
);

it(
  'contains no legacy Customer Visit display phrase',
  () => {
    const offenders =
      productionSourceFiles(
        'src',
      ).filter((path) => {
        const source =
          readFileSync(
            path,
            'utf8',
          );

        return legacyPhrases.some(
          (phrase) =>
            source.includes(
              phrase,
            ),
        );
      });

    expect(offenders).toEqual([]);
  },
);

it(
  'preserves internal activity keys',
  () => {
    const constants =
      readFileSync(
        'src/shared/constants.js',
        'utf8',
      );

    expect(
      constants,
    ).toContain(
      "CUSTOMER_VISIT: 'customer_visit'",
    );

    expect(
      constants,
    ).toContain(
      "'in_progress'",
    );
  },
);

it(
  'keeps the mobile viewport and motion safety contracts',
  () => {
    const tokens =
      readFileSync(
        'src/styles/tokens.css',
        'utf8',
      );

    const components =
      readFileSync(
        'src/styles/components.css',
        'utf8',
      );

    const screens =
      readFileSync(
        'src/styles/screens.css',
        'utf8',
      );

    expect(tokens).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*scroll-behavior:\s*auto\s*!important/,
    );

    expect(components).toMatch(
      /\.ui-button,[\s\S]*min-height:\s*var\(--touch-target\)[\s\S]*min-width:\s*var\(--touch-target\)/,
    );

    expect(screens).toMatch(
      /@media\s*\(max-width:\s*430px\)[\s\S]*\.form-grid,\s*\.admin-row,\s*\.calendar-day\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );

    expect(screens).toMatch(
      /@media\s*\(max-width:\s*320px\)[\s\S]*\.page-content,\s*\.app-header\s*\{\s*padding-inline:\s*10px/,
    );
  },
);

it(
  'keeps dashboard disclosure links and activity check cards at the touch target',
  () => {
    const screens =
      readFileSync(
        'src/styles/screens.css',
        'utf8',
      );

    expect(screens).toMatch(
      /\.section-heading a\s*\{[^}]*min-width:\s*var\(--touch-target\)[^}]*min-height:\s*var\(--touch-target\)/,
    );

    expect(screens).toMatch(
      /\.check-card\s*\{[^}]*min-height:\s*var\(--touch-target\)/,
    );
  },
);