import { createElement, forwardRef } from 'react';

const GlassCard = forwardRef(function GlassCard(
  { as = 'div', variant = 'default', padded = false, className = '', children, ...props },
  ref,
) {
  const Component = as;
  return createElement(
    Component,
    { ref, className: `ui-glass-card ui-glass-card--${variant} ${padded ? 'ui-glass-card--padded' : ''} ${className}`.trim(), ...props },
    children,
  );
});

export default GlassCard;
