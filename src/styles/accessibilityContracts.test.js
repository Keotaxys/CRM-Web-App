import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync(
  'src/styles/tokens.css',
  'utf8',
);

const componentsCss = readFileSync(
  'src/styles/components.css',
  'utf8',
);

const screensCss = readFileSync(
  'src/styles/screens.css',
  'utf8',
);

function token(name) {
  return tokensCss.match(
    new RegExp(
      `${name}:\\s*(#[0-9a-f]{3,6})`,
      'i',
    ),
  )?.[1];
}

function relativeLuminance(hex) {
  const expanded = hex.length === 4
    ? hex
        .slice(1)
        .split('')
        .map((digit) => digit.repeat(2))
    : hex.slice(1).match(/.{2}/g);

  const channels = expanded.map((part) => {
    const value =
      Number.parseInt(part, 16) / 255;

    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (
    (0.2126 * channels[0])
    + (0.7152 * channels[1])
    + (0.0722 * channels[2])
  );
}

function contrast(foreground, background) {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );

  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

function withoutComments(css) {
  return css.replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
}

function declarationsFor(css, selector) {
  const cleanCss = withoutComments(css);

  return [
    ...cleanCss.matchAll(
      /([^{}]+)\{([^{}]*)\}/g,
    ),
  ]
    .filter(([, selectorList]) =>
      selectorList
        .split(',')
        .map((item) => item.trim())
        .includes(selector))
    .map(([, , declarations]) => declarations)
    .join('\n');
}

describe(
  'keyboard focus and navigation contrast contracts',
  () => {
    it(
      'keeps every outline-suppressing interactive primitive on a solid high-contrast focus outline',
      () => {
        expect(
          contrast(
            token('--teal-700'),
            token('--color-white'),
          ),
        ).toBeGreaterThanOrEqual(3);

        expect(tokensCss).toMatch(
          /--focus-outline:\s*3px solid var\(--teal-700\)/,
        );

        const componentSelectors = [
          '.ui-button:focus-visible',
          '.ui-icon-button:focus-visible',
          '.ui-input:focus-visible',
          '.ui-textarea:focus-visible',
          '.ui-select-trigger:focus-visible',
          '.ui-select__option:focus-visible',
          '.ui-date-field__picker:focus-visible',
          '.ui-modal-sheet:focus-visible',
        ];

        componentSelectors.forEach(
          (selector) => {
            expect(
              declarationsFor(
                componentsCss,
                selector,
              ),
              selector,
            ).toMatch(
              /outline:\s*var\(--focus-outline\)/,
            );
          },
        );

        expect(
          declarationsFor(
            componentsCss,
            '.ui-select__option:focus-visible',
          ),
        ).toMatch(
          /outline-offset:\s*-2px/,
        );

        expect(
          declarationsFor(
            componentsCss,
            '.ui-modal-sheet:focus-visible',
          ),
        ).toMatch(
          /outline-offset:\s*-2px/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.camera-upload-button:focus-visible',
          ),
        ).toMatch(
          /outline:\s*var\(--focus-outline\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.form-stack input:focus-visible',
          ),
        ).toMatch(
          /outline:\s*var\(--focus-outline\)/,
        );
      },
    );

    it(
      'keeps neutral navigation and teal-gradient filters readable',
      () => {
        expect(
          contrast(
            token('--teal-800'),
            token('--color-white'),
          ),
        ).toBeGreaterThanOrEqual(4.5);

        expect(
          contrast(
            token('--teal-700'),
            token('--color-white'),
          ),
        ).toBeGreaterThanOrEqual(4.5);

        expect(
          contrast(
            token('--color-white'),
            token('--teal-800'),
          ),
        ).toBeGreaterThanOrEqual(4.5);

        expect(
          contrast(
            token('--color-white'),
            token('--teal-700'),
          ),
        ).toBeGreaterThanOrEqual(4.5);

        expect(
          declarationsFor(
            screensCss,
            '.bottom-nav-item',
          ),
        ).toMatch(
          /color:\s*var\(--teal-800\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.bottom-nav-item.active',
          ),
        ).toMatch(
          /color:\s*var\(--teal-800\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.chip.active',
          ),
        ).toMatch(
          /color:\s*var\(--color-white\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.chip.active',
          ),
        ).toMatch(
          /background:\s*linear-gradient\([\s\S]*var\(--teal-800\)[\s\S]*var\(--teal-700\)/,
        );
      },
    );

    it(
      'keeps neutral glass navigation, a single active pill, focus, safe-area, and touch contracts',
      () => {
        const headerDeclarations =
          declarationsFor(
            screensCss,
            '.app-header',
          );

        const bottomNavDeclarations =
          declarationsFor(
            screensCss,
            '.bottom-nav',
          );

        expect(
          headerDeclarations,
        ).toMatch(
          /border-bottom:\s*1px solid rgb\(15 118 110 \/ \.12\)/,
        );

        expect(
          headerDeclarations,
        ).toMatch(
          /background:\s*rgb\(255 255 255 \/ \.86\)/,
        );

        expect(
          bottomNavDeclarations,
        ).toMatch(
          /border:\s*1px solid rgb\(15 118 110 \/ \.12\)/,
        );

        expect(
          bottomNavDeclarations,
        ).toMatch(
          /background:\s*rgb\(255 255 255 \/ \.86\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.bottom-nav-item:focus-visible',
          ),
        ).toMatch(
          /outline:\s*var\(--focus-outline\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.bottom-nav-item',
          ),
        ).toMatch(
          /width:\s*20%/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.bottom-nav-item',
          ),
        ).toMatch(
          /min-height:\s*var\(--touch-target\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.bottom-nav-item.active .bottom-nav-item__inner',
          ),
        ).toMatch(
          /background:\s*rgb\(15 118 110 \/ \.10\)/,
        );

        expect(
          declarationsFor(
            screensCss,
            '.bottom-nav-item.active .material-symbols-outlined',
          ),
        ).toMatch(
          /background:\s*none/,
        );

        expect(
          bottomNavDeclarations,
        ).toMatch(
          /env\(safe-area-inset-bottom\)/,
        );

        const bottomNavRules = [
          ...withoutComments(
            screensCss,
          ).matchAll(
            /\.bottom-nav\s*\{([^}]*)\}/g,
          ),
        ].map(
          ([, declarations]) => declarations,
        );

        expect(
          bottomNavRules[0],
        ).toMatch(
          /padding:\s*var\(--space-2\)\s*max\(8px,\s*env\(safe-area-inset-right\)\)\s*calc\(var\(--space-2\)\s*\+\s*env\(safe-area-inset-bottom\)\)\s*max\(8px,\s*env\(safe-area-inset-left\)\)/s,
        );

        const compactSafeAreaRule =
          bottomNavRules.find(
            (declarations) =>
              /padding-left:\s*max\(4px,\s*env\(safe-area-inset-left\)\)/.test(
                declarations,
              ),
          );

        expect(
          compactSafeAreaRule,
        ).toMatch(
          /padding-left:\s*max\(4px,\s*env\(safe-area-inset-left\)\)/,
        );

        expect(
          compactSafeAreaRule,
        ).toMatch(
          /padding-right:\s*max\(4px,\s*env\(safe-area-inset-right\)\)/,
        );

        expect(screensCss).toMatch(
          /@supports[\s\S]*\.app-header,\s*\.bottom-nav\s*\{[^}]*background:\s*rgb\(255 255 255 \/ \.58\)[^}]*-webkit-backdrop-filter:\s*blur\(18px\)\s*saturate\(150%\)[^}]*backdrop-filter:\s*blur\(18px\)\s*saturate\(150%\)/s,
        );

        [430, 390, 360, 320].forEach(
          (viewport) => {
            expect(
              screensCss,
              `${viewport}px responsive contract`,
            ).toMatch(
              new RegExp(
                `@media\\s*\\(max-width:\\s*${viewport}px\\)`,
              ),
            );
          },
        );
      },
    );
  },
);