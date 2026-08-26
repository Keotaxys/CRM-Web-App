import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Button from './Button';

let stylesheet;
const tokensCss = readFileSync('src/styles/tokens.css', 'utf8');
const componentsCss = readFileSync('src/styles/components.css', 'utf8');

beforeAll(() => {
  stylesheet = document.createElement('style');
  stylesheet.textContent = `${tokensCss}\n${componentsCss}`;
  document.head.appendChild(stylesheet);
});

afterAll(() => {
  stylesheet.remove();
});

describe('Button', () => {
  it('uses a safe primary button default', () => {
    render(<Button variant="primary">ບັນທຶກ</Button>);

    const button = screen.getByRole('button', { name: 'ບັນທຶກ' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('ui-button--primary');
  });

  it('exposes busy state while preventing repeated actions', () => {
    render(<Button busy>ກຳລັງບັນທຶກ</Button>);

    expect(screen.getByRole('button', { name: 'ກຳລັງບັນທຶກ' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ກຳລັງບັນທຶກ' })).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps a short-label button at the 44px touch target in both dimensions', () => {
    render(<Button>+</Button>);

    expect(screen.getByRole('button', { name: '+' })).toHaveClass('ui-button');
    const rules = [...stylesheet.sheet.cssRules];
    const tokenRule = rules.find((rule) => rule.selectorText === ':root');
    const buttonRule = rules.find((rule) => rule.selectorText?.includes('.ui-button'));

    expect(tokenRule.style.getPropertyValue('--touch-target')).toBe('44px');
    expect(buttonRule.style.minHeight).toBe('var(--touch-target)');
    expect(buttonRule.style.minWidth).toBe('var(--touch-target)');
  });
});
