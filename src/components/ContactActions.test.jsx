import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ContactActions from './ContactActions';

let stylesheet;
const componentsCss = readFileSync('src/styles/components.css', 'utf8');

beforeAll(() => {
  stylesheet = document.createElement('style');
  stylesheet.textContent = componentsCss;
  document.head.appendChild(stylesheet);
});

afterAll(() => {
  stylesheet.remove();
});

describe('ContactActions', () => {
  it('renders normalized solid contact links with accessible names', () => {
    render(<ContactActions customer={{ phone: '020 5555 1234', gps: 'https://maps.example/test' }} />);

    expect(screen.getByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).toHaveAttribute('href', 'tel:02055551234');
    expect(screen.getByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).toHaveAttribute('href', 'https://wa.me/8562055551234');
    expect(screen.getByRole('link', { name: 'ເປີດແຜນທີ່ລູກຄ້າ' })).toHaveAttribute('href', 'https://maps.example/test');
    expect(screen.getByTestId('whatsapp-solid-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).toHaveClass('contact-action--call');
    expect(screen.getByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).toHaveClass('contact-action--whatsapp');
    expect(screen.getByText('call')).toHaveClass('filled');
  });

  it('uses one teal touch-target treatment and optical icon size for every contact action', () => {
    render(<ContactActions customer={{ phone: '020 5555 1234', gps: 'https://maps.example/test' }} />);

    const actionLinks = [
      screen.getByRole('link', { name: 'ໂທຫາລູກຄ້າ' }),
      screen.getByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' }),
      screen.getByRole('link', { name: 'ເປີດແຜນທີ່ລູກຄ້າ' }),
    ];

    actionLinks.forEach((link) => {
      expect(link).toHaveClass('contact-action', 'ui-icon-button--teal', 'ui-icon-button--sm');
    });

    const touchTargetRule = [...stylesheet.sheet.cssRules].find((rule) => rule.selectorText === '.ui-icon-button');
    expect(touchTargetRule.style.minWidth).toBe('var(--touch-target)');
    expect(touchTargetRule.style.minHeight).toBe('var(--touch-target)');

    const opticalSizeRule = [...stylesheet.sheet.cssRules].find((rule) => (
      rule.selectorText?.includes('.contact-action .material-symbols-outlined')
      && rule.selectorText.includes('.contact-action__whatsapp-icon')
    ));
    expect(opticalSizeRule).toBeDefined();
    expect(opticalSizeRule.style.width).toBe('22px');
    expect(opticalSizeRule.style.height).toBe('22px');
    expect(opticalSizeRule.style.fontSize).toBe('22px');
    expect(opticalSizeRule.style.lineHeight).toBe('1');
  });

  it('omits unavailable links and shows labels when requested', () => {
    render(<ContactActions customer={{ phone: '', gps: '' }} showLabels />);

    expect(screen.queryByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ເປີດແຜນທີ່ລູກຄ້າ' })).not.toBeInTheDocument();

    render(<ContactActions customer={{ phone: '020 5555 1234' }} showLabels />);
    expect(screen.getByText('ໂທ')).toBeVisible();
    expect(screen.getByText('WhatsApp')).toBeVisible();
  });

  it('keeps the Call Material Symbol explicitly filled', () => {
    const callRule = [...stylesheet.sheet.cssRules].find((rule) => rule.selectorText === '.contact-action--call .material-symbols-outlined');

    expect(callRule).toBeDefined();
    expect(callRule.style.fontVariationSettings).toBe("'FILL' 1");
  });
});
