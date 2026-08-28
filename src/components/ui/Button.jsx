import { forwardRef } from 'react';

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    busy = false,
    type = 'button',
    className = '',
    children,
    disabled,
    ...buttonProps
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...buttonProps}
    >
      {children}
    </button>
  );
});

export default Button;
