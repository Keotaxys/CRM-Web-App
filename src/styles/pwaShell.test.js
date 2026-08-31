import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCss = readFileSync(resolve('src/index.css'), 'utf8');
const screensCss = readFileSync(resolve('src/styles/screens.css'), 'utf8');

function declarationsFor(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
}

describe('iOS standalone viewport shell', () => {
  it('prevents the document from becoming the protected app scroll surface', () => {
    const lockedViewport = declarationsFor(indexCss, '.app-viewport--locked');

    expect(lockedViewport).toMatch(/height:\s*100%/);
    expect(lockedViewport).toMatch(/overflow:\s*hidden/);
    expect(lockedViewport).toMatch(/overscroll-behavior:\s*none/);
  });

  it('uses one bounded momentum-scrolling content surface', () => {
    const shell = declarationsFor(screensCss, '.app-shell');
    const content = declarationsFor(screensCss, '.app-shell__content');

    expect(shell).toMatch(/position:\s*relative/);
    expect(shell).toMatch(/height:\s*100vh/);
    expect(shell).toMatch(/height:\s*100dvh/);
    expect(shell).toMatch(/overflow:\s*hidden/);
    expect(content).toMatch(/height:\s*100%/);
    expect(content).toMatch(/overflow-y:\s*auto/);
    expect(content).toMatch(/overscroll-behavior-y:\s*none/);
    expect(content).toMatch(/-webkit-overflow-scrolling:\s*touch/);
    expect(content).toMatch(/padding-bottom:[^;]*env\(safe-area-inset-bottom\)/s);
  });

  it('anchors navigation controls to the shell and protects every safe area', () => {
    const header = declarationsFor(screensCss, '.app-header');
    const bottomNav = declarationsFor(screensCss, '.bottom-nav');
    const quickCreate = declarationsFor(screensCss, '.quick-create');

    expect(header).toMatch(/padding-top:[^;]*env\(safe-area-inset-top\)/s);
    expect(header).toMatch(/padding-left:[^;]*env\(safe-area-inset-left\)/s);
    expect(header).toMatch(/padding-right:[^;]*env\(safe-area-inset-right\)/s);
    expect(bottomNav).toMatch(/position:\s*absolute/);
    expect(bottomNav).toMatch(/env\(safe-area-inset-bottom\)/);
    expect(quickCreate).toMatch(/position:\s*absolute/);
    expect(quickCreate).toMatch(/bottom:[^;]*env\(safe-area-inset-bottom\)/s);
  });

  it('preserves horizontal safe areas in narrow-screen header overrides', () => {
    const headerRules = [...screensCss.matchAll(/\.app-header\s*\{([^}]*)\}/g)]
      .map(([, declarations]) => declarations);

    expect(headerRules.filter((rule) => /padding-inline:/.test(rule))).toEqual([]);
    expect(headerRules).toEqual(expect.arrayContaining([
      expect.stringMatching(/padding-left:\s*max\(\s*12px,\s*env\(safe-area-inset-left\)\s*\)[^}]*padding-right:\s*max\(\s*12px,\s*env\(safe-area-inset-right\)\s*\)/s),
      expect.stringMatching(/padding-left:\s*max\(\s*10px,\s*env\(safe-area-inset-left\)\s*\)[^}]*padding-right:\s*max\(\s*10px,\s*env\(safe-area-inset-right\)\s*\)/s),
    ]));
  });
});
